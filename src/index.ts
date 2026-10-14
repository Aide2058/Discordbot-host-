import { Container, getContainer } from "@cloudflare/containers";
import { DASHBOARD } from "./dashboard";

export class BotContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "24h"; // cron pings renew this, keeping running bots alive
}

interface Env {
  DB: D1Database; BOT: DurableObjectNamespace<BotContainer>;
  INTERNAL_SECRET: string; MAX_BOTS_PER_USER: string;
}
type Bot = { id: string; user_id: string; name: string; token: string; code: string; desired: string };

const json = (d: unknown, status = 200) => Response.json(d, { status });
const hash = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");

async function startBot(env: Env, url: string, bot: Bot) {
  await getContainer(env.BOT, bot.id).startAndWaitForPorts({
    startOptions: {
      envVars: {
        DISCORD_TOKEN: bot.token, INTERNAL_SECRET: env.INTERNAL_SECRET,
        CODE_URL: `${url}/internal/code/${bot.id}`,
      },
    },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url), origin = url.origin;
    const path = url.pathname;
    if (path === "/") return new Response(DASHBOARD, { headers: { "content-type": "text/html;charset=utf-8" } });

    if (path.startsWith("/internal/code/")) {
      if (req.headers.get("x-secret") !== env.INTERNAL_SECRET) return json({ error: "forbidden" }, 403);
      const b = await env.DB.prepare("SELECT code FROM bots WHERE id=?").bind(path.split("/")[3]).first<Bot>();
      return b ? new Response(b.code) : json({ error: "not found" }, 404);
    }

    if (path === "/api/register" && req.method === "POST") {
      const key = "dh_" + crypto.randomUUID().replaceAll("-", "");
      await env.DB.prepare("INSERT INTO users VALUES (?,?,?)")
        .bind(crypto.randomUUID(), await hash(key), Date.now()).run();
      return json({ key });
    }

    const key = req.headers.get("x-api-key") || "";
    const user = await env.DB.prepare("SELECT id FROM users WHERE key_hash=?").bind(await hash(key)).first<{ id: string }>();
    if (!user) return json({ error: "unauthorized" }, 401);

    const m = path.match(/^\/api\/bots(?:\/([\w-]+))?(?:\/(\w+))?$/);
    if (!m) return json({ error: "not found" }, 404);
    const [, id, action] = m;

    if (!id) {
      if (req.method === "GET") {
        const { results } = await env.DB.prepare("SELECT id,name,desired,code FROM bots WHERE user_id=?").bind(user.id).all();
        const bots = await Promise.all(results.map(async (b: any) => {
          let status = "stopped";
          try { status = (await getContainer(env.BOT, b.id).getState()).status; } catch {}
          return { ...b, status };
        }));
        return json(bots);
      }
      if (req.method === "POST") {
        const { name, token, code } = await req.json<any>();
        if (!name || !token || !code) return json({ error: "name, token and code required" }, 400);
        if (code.length > 500_000) return json({ error: "code too large" }, 400);
        const n = await env.DB.prepare("SELECT COUNT(*) c FROM bots WHERE user_id=?").bind(user.id).first<{ c: number }>();
        if (n!.c >= Number(env.MAX_BOTS_PER_USER || 2)) return json({ error: "bot limit reached" }, 403);
        const bid = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO bots VALUES (?,?,?,?,?,?,?)")
          .bind(bid, user.id, name.slice(0, 40), token, code, "stopped", Date.now()).run();
        return json({ id: bid });
      }
    }

    const bot = id ? await env.DB.prepare("SELECT * FROM bots WHERE id=? AND user_id=?").bind(id, user.id).first<Bot>() : null;
    if (!bot) return json({ error: "not found" }, 404);
    const c = getContainer(env.BOT, bot.id);

    if (req.method === "DELETE") {
      try { await c.destroy(); } catch {}
      await env.DB.prepare("DELETE FROM bots WHERE id=?").bind(bot.id).run();
      return json({ ok: true });
    }
    if (req.method === "PUT") {
      const { code, token } = await req.json<any>();
      await env.DB.prepare("UPDATE bots SET code=?, token=? WHERE id=?")
        .bind(code ?? bot.code, token || bot.token, bot.id).run();
      return json({ ok: true });
    }
    if (action === "logs") {
      try { return new Response(await (await c.fetch(new Request("http://c/logs"))).text()); }
      catch { return new Response("(not running)"); }
    }
    if (action === "stop") {
      await env.DB.prepare("UPDATE bots SET desired='stopped' WHERE id=?").bind(bot.id).run();
      try { await c.stop(); } catch {}
      return json({ ok: true });
    }
    if (action === "start" || action === "restart") {
      if (action === "restart") { try { await c.stop(); } catch {} }
      await env.DB.prepare("UPDATE bots SET desired='running' WHERE id=?").bind(bot.id).run();
      await startBot(env, origin, bot);
      return json({ ok: true });
    }
    return json({ error: "bad request" }, 400);
  },

  // Every 5 min: keep running bots alive and restart any that crashed or were evicted.
  async scheduled(_e: ScheduledController, env: Env) {
    const origin = (await env.DB.prepare("SELECT 1").first(), "https://" + (env as any).PUBLIC_HOST);
    const { results } = await env.DB.prepare("SELECT * FROM bots WHERE desired='running'").all<Bot>();
    for (const b of results) {
      const c = getContainer(env.BOT, b.id);
      try {
        const s = (await c.getState()).status;
        if (s === "running" || s === "healthy") await c.fetch(new Request("http://c/"));
        else await startBot(env, origin, b);
      } catch (e) { console.error(b.id, e); }
    }
  },
};

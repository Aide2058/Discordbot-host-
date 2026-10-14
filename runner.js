// Runs inside each bot's container: fetches user code, runs it, exposes /health and /logs.
const http = require("http"), { spawn } = require("child_process"), fs = require("fs");
const { CODE_URL, INTERNAL_SECRET, ...childEnv } = process.env; // user code never sees the secret
let logs = [];
const log = (s) => { logs.push(...String(s).split("\n").filter(Boolean)); logs = logs.slice(-300); };
(async () => {
  try {
    const r = await fetch(CODE_URL, { headers: { "x-secret": INTERNAL_SECRET } });
    if (!r.ok) throw new Error("code fetch failed " + r.status);
    fs.writeFileSync("/app/bot.js", await r.text());
    const p = spawn("node", ["/app/bot.js"], { env: childEnv, cwd: "/app" });
    p.stdout.on("data", log); p.stderr.on("data", log);
    p.on("exit", (c) => log(`[host] bot exited with code ${c}`));
  } catch (e) { log("[host] " + e.message); }
})();
http.createServer((req, res) => {
  res.end(req.url === "/logs" ? logs.join("\n") : "ok");
}).listen(8080);

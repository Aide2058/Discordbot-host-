# Discord Bot Host (Cloudflare)

Needs a Workers **Paid** plan (Containers) and Docker running locally.

```bash
npm install
npx wrangler d1 create discord-host        # paste database_id into wrangler.jsonc
npx wrangler d1 execute discord-host --remote --file=schema.sql
npx wrangler secret put INTERNAL_SECRET    # any long random string
npx wrangler secret put PUBLIC_HOST        # your host, e.g. discord-host.you.workers.dev (no https://)
npm run deploy
```

Users create an account (gets an access key), paste a discord.js file + bot token, and press Start.
Bot code must read `process.env.DISCORD_TOKEN`. `discord.js` is preinstalled.

Notes: tokens are stored plaintext in D1 (encrypt before going public); `MAX_BOTS_PER_USER` limits
usage; add rate limiting / abuse controls before opening signups.

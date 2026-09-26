# Say It Back — API

Backend for **Say It Back**, hosted at **`pleasehelpme.study`**. The frontend
lives on Vercel/Netlify; this API is the only thing that goes on Vultr, at
`api.pleasehelpme.study`.

Explain a topic to a silly persona → get confused back → find your gaps →
get a Gap Report + flashcards. Feynman technique, gamified.

## Stack

- Node.js / Express
- Auth0 (JWT-protected routes)
- Gemini API (`@google/generative-ai`) — persona reactions + gap reports, JSON mode
- ElevenLabs (optional, off by default — see `.env.example`)
- SQLite (`better-sqlite3`) — users, sessions, streaks

## Project layout

```
backend/
  server.js            entrypoint
  config/personas.js    persona data (add a 5th persona here, nothing else)
  routes/personas.js     GET  /api/personas
  routes/session.js      POST /api/session/turn, /api/session/complete
  middleware/auth.js      Auth0 JWT check
  services/gemini.js      structured-output Gemini calls
  services/elevenlabs.js  optional TTS, no-ops cleanly if disabled
  services/db.js          SQLite setup + queries
  deploy/setup.sh         one-shot Vultr installer
  deploy/Caddyfile        reverse proxy + auto HTTPS config
  ecosystem.config.js     pm2 process definition
  .env.example            copy to .env and fill in
```

## Local dev

```bash
cp .env.example .env      # fill in GEMINI_API_KEY, AUTH0_DOMAIN, AUTH0_AUDIENCE
npm install
npm run dev                # http://localhost:3000/health
```

## Deploying to Vultr (simple path)

1. **Create the instance:** Vultr → Cloud Compute → cheapest tier → Ubuntu 24.04 LTS.
2. **Get the code onto it**, e.g. from your machine:
   ```bash
   scp -r backend root@YOUR_VULTR_IP:~/say-it-back
   ```
   (or `git clone` your repo on the box instead)
3. **SSH in and run the one-shot script:**
   ```bash
   ssh root@YOUR_VULTR_IP
   cd ~/say-it-back
   chmod +x deploy/setup.sh
   ./deploy/setup.sh
   ```
   It installs Node 20, pm2, and Caddy; creates `.env` from the example and
   pauses so you can fill it in; installs dependencies; starts the API under
   pm2 (auto-restarts on crash/reboot); and points Caddy at
   `api.pleasehelpme.study` with automatic HTTPS.
4. **DNS:** add an A record for `api.pleasehelpme.study` → the instance's IP.
5. **Firewall:** in the Vultr dashboard, open ports 22, 80, 443.
6. **Verify:**
   ```bash
   curl https://api.pleasehelpme.study/health
   ```

If you're up against the clock, skip Caddy and just run `pm2 start
ecosystem.config.js`, then hit the API over `http://YOUR_VULTR_IP:3000/health`
— HTTPS can come after the demo works.

### Redeploying after a code change

```bash
git pull            # or scp the changed files over again
npm install
pm2 restart say-it-back
```

## API summary

| Route | Auth | Purpose |
|---|---|---|
| `GET /health` | none | confirms the box is actually serving traffic |
| `GET /api/personas` | JWT | list personas + lock state + streak for this user |
| `POST /api/session/turn` | JWT | one persona reaction + follow-up question |
| `POST /api/session/complete` | JWT | Gap Report + flashcards, records the session |

Persona #4 (Stoned Philosophy Major) unlocks after 3 completed sessions —
see `config/personas.js`.

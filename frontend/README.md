# Say It Back — frontend

Deploys separately from the API, to Vercel or Netlify — `pleasehelpme.study`
points here; `api.pleasehelpme.study` (Vultr) is the backend.

## Design

Editorial, not dashboard: one narrow column, a serif (Newsreader) for
headings and personality, a sans (Public Sans) for body text, warm paper
background, one accent color (deep pine) used only for the primary action.
The conversation is laid out like marginalia — a persona label in the
margin, flowing text, hairline rules — rather than chat bubbles. No card
shadows, no matching border-radius on everything, one motion moment (the
persona's reply settles in once, per turn).

Tokens live at the top of `src/styles.css` if you want to adjust the
palette or type scale.

## Local dev

```bash
cp .env.example .env     # fill in Auth0 + API URL
npm install
npm run dev
```

## Deploy (Vercel or Netlify)

1. Push this folder to a repo (or the whole project, frontend as a subdir).
2. Import it in Vercel/Netlify, set the build command `npm run build` and
   output directory `dist`.
3. Add the three env vars from `.env.example` in the project's dashboard.
4. Point `pleasehelpme.study` at the deployment (both platforms give you a
   CNAME/A-record target under Domains).
5. In your Auth0 application settings, add this domain to **Allowed
   Callback URLs**, **Allowed Logout URLs**, and **Allowed Web Origins**.

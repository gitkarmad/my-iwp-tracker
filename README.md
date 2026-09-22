# IWP Work Tracker (v2)

Personal productivity journal. Single-file backend, no serverless catch-all routing tricks.

## Stack
- React + Vite + Tailwind
- ONE serverless function: `api/index.js` (Vercel auto-routes `/api/*` here)
- Supabase (Postgres)
- Recharts, jsPDF, xlsx

## Setup

1. **Supabase** → create project → SQL Editor → run `supabase/schema.sql`.
2. **Supabase → Settings → API** → copy Project URL and service_role key.
3. Create `.env` from `.env.example`:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
APP_PASSWORD=yourpassword
```

4. Install and run:

```
npm install
npm i -g vercel
vercel dev
```

5. Open http://localhost:3000

## Deploy

Push to GitHub, import in Vercel, add the same 3 env vars, deploy.

## API

All endpoints are `/api?action=NAME&...params`.
Every request needs header `x-app-password: <APP_PASSWORD>`.

Actions: `ping`, `debug`, `entries.list`, `entries.create`, `entries.get`, `entries.update`,
`entries.delete`, `entries.star`, `entries.duplicate`, `draft.get`, `draft.save`, `draft.clear`,
`categories.list`, `categories.create`, `categories.update`, `categories.delete`,
`projects.list`, `projects.names`, `stats.recent`, `stats.summary`, `data.backup`, `data.restore`,
`data.import-csv`.
# my-iwp-tracker

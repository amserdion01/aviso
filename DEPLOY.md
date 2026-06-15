# Deploying Aviso to Vercel + Neon (free tier)

A free, always-on demo: **Vercel Hobby** (app) + **Neon** (Postgres). Functions
are pinned to `fra1` (Frankfurt) via `vercel.json`.

## 1. Neon (Postgres)

1. Create a project at https://neon.tech — choose an **EU region** (e.g. Frankfurt).
2. From the dashboard, copy **two** connection strings:
   - **Pooled** — host contains `-pooler` (used by the app at runtime).
   - **Direct** — no `-pooler` (used for migrations).
   Both look like `postgresql://USER:PASSWORD@HOST/DB?sslmode=require`.

## 2. Run migrations (from your machine, against Neon)

Use the **direct** (non-pooler) URL — drizzle-kit runs fine with prepared statements there:

```bash
DATABASE_URL="postgresql://…(direct)…?sslmode=require" pnpm db:migrate
```

Optionally seed demo data (test users + example delegation). The seed prints the
shared dev password:

```bash
DATABASE_URL="postgresql://…(direct)…?sslmode=require" pnpm db:seed
```

> For a real deployment you'd skip the seed and create one admin user instead.
> For a stakeholder demo, the seeded `role@aviso.local` users are convenient —
> `dirgeneral@aviso.local` holds the `admin` capability.

## 3. Vercel

```bash
npm i -g vercel       # if needed
vercel login
vercel                # link/create the project (accept defaults; framework: Next.js)
```

Set environment variables (Project → Settings → Environment Variables, for
**Production**), then redeploy:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the **pooled** Neon string (host has `-pooler`) |
| `BETTER_AUTH_SECRET` | a long random string (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | your deployed URL, e.g. `https://aviso.vercel.app` |
| `PUPPETEER_SKIP_DOWNLOAD` | `true` — skip Chromium download at build (serverless uses `@sparticuz/chromium`) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | *(optional)* a real SMTP provider. If unset, email notifications no-op in the background; the in-app notification bell still works. |

Deploy production:

```bash
vercel --prod
```

## How the code adapts to serverless

- **PDF** (`src/lib/pdf.ts`): on Vercel (`process.env.VERCEL`) it launches
  `puppeteer-core` + `@sparticuz/chromium`; locally it uses the bundled
  `puppeteer` (a devDependency). The PDF route sets `maxDuration = 60` and the
  Node.js runtime.
- **Database** (`src/db/index.ts`): on Vercel it uses `max: 1` and
  `prepare: false` (required for the Neon `-pooler` / PgBouncer transaction pooler).

## Notes / caveats

- **Data residency:** Vercel runs on US-headquartered infrastructure even with an
  EU function region + EU database. Fine for a demo; for production under the EU
  data-residency requirement, prefer the self-hosted Docker/Coolify path.
- **PDF on serverless is the one piece not verifiable locally.** If PDF download
  fails with a protocol error, align versions of `puppeteer-core` and
  `@sparticuz/chromium` (they must target compatible Chromium milestones).
- **Hobby function limit:** PDF cold start can be slow; `maxDuration = 60` covers
  it on Hobby. The rest of the app is fast.

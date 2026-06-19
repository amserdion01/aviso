# HydroKov

Internal requisition (*referat de necesitate*) approval workflow for the Covasna county water company (**Apa Covasna**). It replaces a paper + wet-signature process with a tracked, role-based digital flow. The UI is entirely in Romanian.

An employee submits a *referat*; it routes through a configurable, role-based approval chain — each approver can **Aprobă**, **Respinge**, or **Trimite înapoi** (send back) from a personal task inbox. Substitutes cover absent approvers, and every action is recorded in an append-only audit trail.

## Stack

- **Next.js** (App Router) + **TypeScript**, React Server Components
- **PostgreSQL 16** + **Drizzle ORM** (migrations in `/drizzle`)
- **Better Auth** (email/password; authorization is per-capability)
- **Nodemailer** over SMTP for notifications (React Email templates)
- **Puppeteer** + `@sparticuz/chromium` for server-side PDF generation
- **Vitest** for tests; Playwright for UI-flow verification
- Self-hosted (Docker Compose), EU VPS for data residency

## Features

- **Approval workflow engine** — data-driven chain (the steps live in the `approval_steps` table), conditional steps (`applies_when`), value thresholds, org-relative and capability-based approvers, configurable send-back targets.
- **Approver inbox** with quick approve / send-back / reject and an audit timeline.
- **Requisition detail** — vertical stepper, full data, audit history, discussion comments, and a per-step action panel.
- **Delegations** — substitute routing with a date window and circular-chain guard.
- **Notifications** — in-app feed for requester updates and approver to-dos.
- **Reports** dashboard — volume by status, average approval time, queue-by-step, spend by cost center.
- **Global search** scoped to the referate you're involved in.
- **Admin** (per the `admin` capability) — user management, delegations, and a **workflow editor** to edit the approval chain.
- **Finalized PDF** generated once the chain is fully approved.
- Romanian-first UI built on a dedicated design system (tokens, components, screens; self-hosted IBM Plex fonts).

Authorization is **per-capability and per-task**: an approver may only act on tasks routed to them (or to them via an active delegation). Referat detail/PDF reads are gated to involved users (or admins).

## Getting started

```bash
pnpm install
cp .env.example .env          # adjust BETTER_AUTH_SECRET etc.
docker compose up -d          # postgres + mailpit (SMTP trap, UI on :8025)
pnpm db:migrate               # apply migrations
pnpm db:seed                  # one user per role + an example delegation
pnpm dev                      # http://localhost:3000
```

Seeded users use predictable emails (`role@aviso.local`, e.g. `angajat@aviso.local`, `dirgeneral@aviso.local`) with the dev password printed by the seed script. `dirgeneral@aviso.local` holds the `admin` capability.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Dev server on :3000 |
| `pnpm test` | Vitest (unit suite) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate a Drizzle migration after schema changes |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Seed dev users + chain template |
| `pnpm db:studio` | Drizzle Studio |

## Project notes

See [`CLAUDE.md`](./CLAUDE.md) for the domain model, the real approval chain, and the engineering conventions (TDD on the workflow engine and authorization; append-only audit; integer minor units for money; no destructive DB commands).

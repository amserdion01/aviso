# Aviso
Internal requisition ("referat de necesitate") approval workflow for the Covasna water company.
Replaces a paper + wet-signature process with a tracked, role-based digital flow.

## Stack
- Next.js (App Router) + TypeScript, React Server Components
- PostgreSQL 16 + Drizzle ORM (migrations in /drizzle)
- Better Auth (email/password + role-based access via the admin plugin)
- Nodemailer over the company SMTP server for notifications (React Email templates)
- Puppeteer + @sparticuz/chromium for server-side PDF generation
- Vitest for tests; Playwright (MCP + headless CI tests) for UI flows
- Self-hosted: Docker Compose / Coolify on an EU VPS (data residency)

## Commands
- pnpm dev             # dev server on :3000
- pnpm test            # vitest (whole suite)
- pnpm test <file>     # single test file
- pnpm typecheck       # tsc --noEmit
- pnpm lint            # eslint
- pnpm db:generate     # drizzle-kit generate (after schema changes)
- pnpm db:migrate      # apply migrations
- pnpm db:studio       # drizzle studio
- docker compose up -d # postgres + mailpit (SMTP trap, UI on :8025)

## Domain terminology
- Referat de necesitate = requisition / necessity request
- Approval chain (in order): head of service -> IT -> warehouse ->
  economic director -> general director -> procurement
- Each approver can: approve, reject, or send back (one step back) from their inbox
- Substitute / delegate = backup approver who covers an absent approver

## Data model (core)
- requisitions: the request (item, quantity, justification, cost_center, requester_id, current_status)
- approval_steps: the fixed chain template (step_order, approver_type, approver_ref)
- approval_tasks: one row per step per requisition. Inbox query:
  WHERE effective_approver_id = :me AND status = 'waiting'. Active step = the 'waiting' row.
- requisition_transitions: APPEND-ONLY audit/history (actor, from->to, comment, created_at).
  Never UPDATE/DELETE; only INSERT. One 'most_recent' row per requisition.
- delegations: substitute routing (delegator, delegate, starts_at, ends_at, active).
  Resolve effective_approver_id at routing time; enforce the date window in the query;
  guard against circular delegation chains.

## Hard rules
- Use the simplest approach. Do not add abstractions/libraries unless asked.
- Never modify a test to make it pass; fix the implementation.
- TDD on the workflow engine and on authorization: write failing tests first, commit, then implement.
- All quantity/money fields are integers (minor units) — never floats.
- Every approval action MUST be written to requisition_transitions in the same
  transaction that advances the workflow.
- Authorization is per-task: an approver may only act on tasks routed to them
  (or to them via an active delegation).
- Never run destructive DB commands (DROP/TRUNCATE/rm -rf) against any database.
- Send emails from Server Actions / route handlers only (never middleware/edge),
  asynchronously, with retry. Locally they go to Mailpit, not real inboxes.
- Generate the finalized PDF only after the chain is fully approved.

## Conventions
- Validate all input with Zod at the server boundary.
- Keep state values as text + CHECK constraints (or a lookup table), not Postgres ENUMs.
- Commit after every green test with a conventional-commit message.

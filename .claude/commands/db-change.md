---
description: Make a schema change safely via the db-architect — inspect, edit Drizzle schema, generate migration, review SQL, apply.
argument-hint: <schema change to make>
---

Schema change: $ARGUMENTS

Delegate to the db-architect subagent. It must: inspect the live schema via the Postgres MCP first, edit the Drizzle schema, run pnpm db:generate, SHOW me the generated SQL for review, and only then run pnpm db:migrate. State columns must be text + CHECK (no ENUMs); index new FKs and any inbox/filter columns. Never run destructive SQL — if the change is destructive, stop and give me the manual steps.

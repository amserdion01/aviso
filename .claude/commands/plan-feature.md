---
description: Explore the codebase read-only and produce a written, reviewable plan for a feature before any code is written.
argument-hint: <feature description>
---

Enter plan mode. Do NOT edit or create any files yet.

Feature to plan: $ARGUMENTS

1. Explore only what is relevant (read code, the schema via the Postgres MCP, and CLAUDE.md). Spawn subagents for heavy exploration so this context stays clean.
2. Produce a written plan containing:
   - the user-visible behavior and acceptance criteria,
   - the files you will add/change,
   - the DB/schema changes (if any),
   - the list of tests you will write FIRST (happy path, authorization boundary, edge/failure cases),
   - the exact approval-chain invariants this feature must preserve.
3. Flag any open product decision that needs my judgment (do not guess).
4. STOP and wait for my approval. Do not implement until I say go.

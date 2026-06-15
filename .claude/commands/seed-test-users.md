---
description: Create one test user per role plus an example delegation, idempotently.
---

Create (or update, idempotently) a dev seed that inserts one user for each role:
employee, headOfService, itApprover, warehouse, economicDirector, generalDirector, procurement.
Use predictable emails like role@aviso.local and a shared dev password, hashed via Better Auth (do not store plaintext). Also insert one example active delegation (e.g. itApprover delegates to warehouse for a date window covering today) so substitute routing can be tested.

Put it in a script runnable via a pnpm db:seed package script. Make it safe to run repeatedly (upsert on email). Print the created credentials at the end. Never use these in production.

---
description: Run a read-only security/authorization review on the current uncommitted diff.
---

Delegate to the security-reviewer subagent. Have it review the current changes (git diff and git diff --staged) against the Aviso checklist: per-task authorization (role alone is never enough), Better Auth session checks on every server action/route, Zod validation at the boundary, audit-trail integrity (transition written in the same transaction; transitions table never mutated), parameterized SQL, no leaked secrets, and correct PDF/email side-effect gating. Report findings as BLOCKER / SHOULD-FIX / NOTE with file:line and a fix. Do not modify code.

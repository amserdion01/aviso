---
description: Gate and commit — typecheck, lint, test, and on green make a conventional commit.
argument-hint: <commit summary, optional>
---

1. Run pnpm typecheck, pnpm lint, and pnpm test. If anything fails, STOP and fix it (or report what is broken) — do not commit.
2. On all green, stage the relevant files and create a single conventional-commit. Use my summary if given ("$ARGUMENTS"), otherwise infer a concise one from the diff.
3. Print the commit hash and a one-line summary of what shipped.

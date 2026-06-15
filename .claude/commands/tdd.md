---
description: Run a strict TDD loop for a feature — failing tests first, commit them, then implement to green without touching the tests.
argument-hint: <feature/behavior>
---

Behavior to build with TDD: $ARGUMENTS

1. Delegate to the test-author subagent to write focused FAILING tests for this behavior (happy path + authorization boundary + key edge cases). Run them; confirm they fail for the right reason.
2. Commit the failing tests as a checkpoint: test: add failing tests for <behavior>.
3. Implement the minimum code to make them pass. Do NOT modify the tests. If a test seems wrong, stop and ask me.
4. Run pnpm typecheck && pnpm test. When green, commit with a conventional-commit message.
5. If this touched approval routing, hand off to the security-reviewer to confirm per-task authorization and audit integrity.

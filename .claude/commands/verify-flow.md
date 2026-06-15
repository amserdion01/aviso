---
description: Verify an end-to-end approval flow in a real browser via the Playwright MCP.
argument-hint: <flow to verify, e.g. "full approval chain" or "send-back from IT">
---

Flow to verify: $ARGUMENTS

Delegate to the qa-runner subagent. Ensure the dev server (:3000) and Docker services are running first. Walk the flow with test users, exercise approve/reject/send-back as relevant, confirm correct routing and that the audit trail updates, and check Mailpit (http://localhost:8025) for the expected notifications. Report each step PASS/FAIL with concrete evidence. Use test data only.

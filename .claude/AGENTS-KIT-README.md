# Aviso — Claude Code agents & commands kit

Drop the `.claude/` folder into your repo root (next to `CLAUDE.md`). These files capture
the best ideas of frameworks like GSD — fresh-context subagents, spec-before-code, strict
TDD, and atomic commits — natively, with no third-party framework to trust.

## What is here

### Subagents (`.claude/agents/`) — isolated context windows Claude delegates to
Claude picks these automatically based on their `description` (you can also say "use the
workflow-engine agent"). Running heavy work in a subagent keeps your main session context
clean — the single biggest lever against quality degradation on a medium build.

- **workflow-engine** — the approval routing brain: tasks, transitions, append-only audit,
  delegation/substitutes. The riskiest code in the app lives here.
- **db-architect** — Drizzle schema + migrations; inspects the live DB via the Postgres MCP.
- **test-author** — writes failing tests first; never makes them pass.
- **security-reviewer** — read-only authZ/authN/validation/audit review; reports, does not edit.
- **qa-runner** — walks flows in a real browser via the Playwright MCP.
- **frontend-builder** — Next.js App Router UI, server actions, Romanian-facing inbox/views.

### Slash commands (`.claude/commands/`) — reusable workflows you invoke by name
- **/plan-feature** `<feature>` — explore read-only, produce a reviewable plan, then stop.
- **/tdd** `<behavior>` — failing tests -> commit -> implement to green -> security check.
- **/verify-flow** `<flow>` — qa-runner verifies an approval flow end to end.
- **/seed-test-users** — one user per role + an example delegation (idempotent).
- **/db-change** `<change>` — safe inspect->edit->generate->review->migrate via db-architect.
- **/security-review** — review the current diff against the Aviso checklist.
- **/ship** `[summary]` — typecheck + lint + test, then a conventional commit on green.

## Recommended build loop per feature
1. `/plan-feature add the approver task inbox` -> review the plan, approve.
2. `/tdd approver can approve a waiting task and it routes to the next step`
3. build UI with the frontend-builder if needed
4. `/verify-flow full approval chain`
5. `/security-review`
6. `/ship`

Repeat down the phases: auth/roles -> requisition form -> workflow engine -> inboxes ->
substitutes -> email -> audit view -> PDF.

## Notes
- Subagent/command frontmatter (name, description, tools, argument-hint) is stable, but exact
  keys can drift between Claude Code versions — if a file is not picked up, check `/agents`
  and `/help` for your version.
- Agents inherit all tools (including MCP servers) unless a `tools:` line restricts them.
  The reviewers and test-author are deliberately restricted; the MCP-using agents are not.
- These pair with the hooks in `.claude/settings.json` (auto typecheck/test, block destructive
  commands) from the setup script.

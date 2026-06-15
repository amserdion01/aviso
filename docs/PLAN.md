# Aviso — Implementation Plan

> Status: **DRAFT for review.** No production code written yet.
> Decisions locked: (1) generic, data-driven workflow engine for the *real* Covasna flow,
> shipped slice-first; (2) plan-before-code, TDD on engine + authorization.

## 1. Source of truth & a discrepancy to resolve

- `CLAUDE.md` documents a **flat 6-step chain**. The real artifacts
  (`diagramaFlux.pdf` BPMN + `Structura organizatie demo.xls`) show a **conditional,
  capability-based flow** with ~13 task types, branches, send-back and reject.
- **The artifacts win.** Once the flow below is confirmed, I'll update `CLAUDE.md` so the
  agents work from the correct spec.

## 2. Domain model (derived from the org file)

**Authorization is per-capability, not one-role-per-user.** A user holds many capabilities,
several of which have substitutes (`+ inlocuitori`).

Capabilities → tasks:
| Capability | Task |
|---|---|
| angajat | creates referat |
| sef_birou | Verificare șef birou/sector |
| sef_serviciu | Verificare șef serviciu/secție |
| secretariat | ÎNREGISTRARE |
| it | IT / OPINIE IT (conditional) |
| ssm | SSM / OPINIE SSM (conditional) |
| ru | RU |
| magazie | VERIFICARE MAGAZIE |
| director_economic | APROBAT DIRECTOR ECONOMIC |
| achizitii | ACHIZIȚII ÎNCADRARE + ACHIZIȚII |
| aprovizionare | APROVIZIONARE |
| servicii | SERVICII |
| director (general/tehnic/adjunct/...) | Aprobat director |

Org structure is 3-level: **Serviciu/Secție → Birou/Sector → Director(type)**.
"Șef birou/șef serviciu" approvers are resolved **relative to the requester's own org unit**.

## 3. Data model (generic engine — no schema rewrite later)

- `users` (Better Auth) + `user_capabilities(user_id, capability)`
- `org_units(id, name, kind[serviciu|birou], parent_id, director_type)`;
  users belong to a birou. Unit head = user in that unit holding sef_birou/sef_serviciu.
- `requisitions(id, requester_id, org_unit_id, item, quantity_minor, justification,
  cost_center, estimated_value_minor, needs_it, needs_ssm, procurement_type, status, created_at)`
- `approval_steps` **(template, seeded with the real chain)**:
  `step_order, task_type, approver_strategy(org_relative|capability|director_by_unit),
  approver_param, applies_when (predicate over requisition attrs), label_ro`
- `approval_tasks(requisition_id, step_order, task_type, effective_approver_id,
  required_capability, status[waiting|approved|rejected|sent_back|skipped], acted_by, acted_at)`
  — inbox = `WHERE effective_approver_id = :me AND status='waiting'`
- `requisition_transitions` — **APPEND-ONLY** audit (actor, from→to, action, comment, created_at,
  is_most_recent). Written in the *same transaction* that advances the workflow.
- `delegations(delegator_id, delegate_id, capability?, starts_at, ends_at, active)`

**Engine shape:** ordered steps, each with an `applies_when` predicate evaluated at runtime.
Non-applicable steps are skipped (e.g. IT/SSM only when relevant; achiziții/aprovizionare/servicii
selected by încadrare). Send-back goes to the previous *applicable* step. This is the simplest
model that expresses the BPMN's gateways without a full graph engine.

## 4. Phases (slice-first)

- **Phase 0 — Foundations:** Drizzle + DB wiring, migrations, Better Auth (email/password +
  admin), base RO layout, Zod boundary helpers, seed script (org units + capabilities + test
  users from the xls), CI (typecheck/lint/test).
- **Phase 1 — Walking skeleton (the slice):** fixed 3-step path
  *angajat → șef birou → director*. Create form, task generation, approver inbox, approve /
  reject / send-back, audit view, per-task authZ. **TDD the engine + authZ.**
- **Phase 2 — Generic engine:** replace the fixed path with the data-driven template +
  `applies_when`; seed the full real chain; skip logic; send-back to previous applicable step.
- **Phase 3 — Substitutes:** effective-approver resolution at routing time, date-window
  enforcement, circular-delegation guard.
- **Phase 4 — Notifications:** Nodemailer → Mailpit, React Email templates, sent from server
  actions, async with retry, on each routing event.
- **Phase 5 — Documents:** server-side PDF of the finalized referat, only after full approval.
- **Phase 6 — Hardening:** org-relative routing across all units, admin/role management UI,
  security review, Playwright e2e, Docker/Coolify deploy.

## 5. Phase 1 test list (TDD targets, written first)

1. Submitting a referat creates the first `approval_task` for the requester's șef birou, status `waiting`.
2. The requester's șef birou (and only they / their delegate) sees it in their inbox.
3. A user without the task may not act on it (authZ denied).
4. Approve advances to the next step **and** writes one `requisition_transitions` row in the same tx.
5. Reject ends the flow as `rejected` and records the transition + comment.
6. Send-back returns to the previous step's approver; the active `waiting` row moves back one.
7. Exactly one `is_most_recent` transition row per requisition at all times.
8. Full happy path create → șef birou → director → `approved`.

## 6. Flow decisions — CONFIRMED (2026-06-15) & implemented in Phase 2

1. **Step order:** confirmed as listed (§4 / CLAUDE.md). ✅ seeded as REAL_CHAIN.
2. **IT & SSM:** conditional on needs_it / needs_ssm; blocking. OPINIE (advisory/non-blocking)
   acknowledged via the `blocking` column but advisory-only steps are DEFERRED (not seeded).
3. **Achiziții încadrare:** one classification task sets procurement_type → routes to exactly one
   of achiziții / aprovizionare / servicii. ✅
4. **Which director:** the requester's director BY ORG UNIT (org_units.director_type →
   director capability). ✅ director_by_unit strategy.
5. **Send-back:** configurable PER STEP (on_send_back: previous | requester | step order),
   default `previous`. `requester` target not yet implemented. Reject = terminal.
6. **Value thresholds:** ADMIN-CONFIGURABLE, multiple allowed, per category = procurement_type.
   Modeled as conditional approval_steps rows with composite condition
   { all: [ value > X, procurement_type = Y ] } adding a director-general step. NONE seeded by
   default; admin adds them (admin UI in Phase 6). Engine supports it now.
7. **Shared-capability tasks:** first eligible holder to act claims it. ✅

### Deferred from Phase 2 (tracked for later)
- OPINIE advisory (non-blocking) steps.
- Send-back target `requester`.
- Admin UI to manage approval_steps / threshold rules (Phase 6).
- Full org-structure + user import from the xls (currently a representative seed).

## 7. What I'd do first on approval

Phase 0 + the Phase 1 test list above, via `/tdd`, committing on each green test.

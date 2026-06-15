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

## 6. Open questions (please confirm — I read the BPMN from an image)

1. **Step order:** Is it angajat → șef birou → șef serviciu → ÎNREGISTRARE → (IT?) → (SSM?) →
   RU → MAGAZIE → director economic → achiziții încadrare → {achiziții | aprovizionare | servicii}
   → aprobat director? Correct / reorder?
2. **IT & SSM:** conditional (only when the request is IT/SSM-relevant)? And are "OPINIE IT/SSM"
   advisory (non-blocking) vs. the blocking "IT/SSM" task?
3. **Achiziții încadrare:** one task where achiziții classifies the request, which then routes to
   exactly one of achiziții / aprovizionare / servicii? Who sets it?
4. **Which director** signs "Aprobat director" — always Director general, or the requester's
   director by org unit (tehnic/economic/adjunct), per the org sheet?
5. **Send-back / reject semantics:** send-back = one step back only (vs. back to requester)?
   reject = terminal + notify requester?
6. **Value thresholds:** does estimated value change the path (e.g., extra approval above a sum)?
7. **Shared-capability tasks:** when several users hold a capability (e.g. multiple IT), does the
   first to act claim it, or must all act?

## 7. What I'd do first on approval

Phase 0 + the Phase 1 test list above, via `/tdd`, committing on each green test.

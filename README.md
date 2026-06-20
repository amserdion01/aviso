# Aviso (HYDROKOV) — kit de agenți & comenzi Claude Code

Pune folderul `.claude/` și `CLAUDE.md` în rădăcina repo-ului. Aceste fișiere sunt ALINIATE la
procedura reală HYDROKOV (superior ierarhic dinamic, prag configurabil 5000 lei, două tipuri de
document, ramificarea SEAP / comandă externă) și la aplicația bilingvă RO/HU. Captează ideile bune
din framework-uri gen GSD — subagenți cu context proaspăt, spec-înainte-de-cod, TDD, commit-uri
atomice — nativ, fără framework terț de avut încredere.

## Ce e schimbat față de varianta veche
- ELIMINAT lanțul fix greșit (șef serviciu -> IT -> magazie -> ...). Rolurile IT și Magazie nu mai există.
- ADĂUGAT: avizare de superiorul ierarhic DIRECT (dinamic, users.superior_id).
- ADĂUGAT: prag CONFIGURABIL 5000 lei și ramificarea pe valoare + disponibilitate SEAP
  (>=5000 directori; <5000+SEAP inițiere directă; <5000 fără SEAP comandă externă).
- ADĂUGAT: două tipuri de document (comandă internă vs referat de necesitate) legate de PAAP.
- ADĂUGAT: lanțul se materializează dintr-un ȘABLON din DB (pregătit pentru workflow-uri
  configurabile de admin, ca adaos — nu rescriere).
- ADĂUGAT: bilingv RO + HU peste tot.

## Subagenți (`.claude/agents/`)
- **workflow-engine** — creierul rutării HYDROKOV: avizare dinamică, ramificare pe valoare/SEAP,
  taskuri, tranziții, audit append-only, substituți. Codul cel mai riscant.
- **db-architect** — schemă + migrații Drizzle; inspectează DB-ul viu prin Postgres MCP.
- **test-author** — scrie testele care pică întâi; nu le face să treacă.
- **security-reviewer** — review read-only authZ/authN/validare/audit; raportează, nu editează.
- **qa-runner** — parcurge fluxurile într-un browser real prin Playwright MCP (RO + HU).
- **frontend-builder** — UI Next.js App Router, server actions, inbox/vederi bilingve.

## Comenzi (`.claude/commands/`)
- **/plan-feature** `<feature>` — explorează read-only, produce un plan revizuibil, apoi se oprește.
- **/tdd** `<comportare>` — teste care pică -> commit -> implementare la verde -> review securitate.
- **/verify-flow** `<flux>` — qa-runner verifică un flux de aprobare end-to-end.
- **/seed-test-users** — un user per rol + organigramă + șablon HYDROKOV + delegare (idempotent).
- **/db-change** `<schimbare>` — inspectează->editează->generează->revizuiește->migrează prin db-architect.
- **/security-review** — review pe diff-ul curent după checklistul Aviso.
- **/ship** `[sumar]` — typecheck + lint + test, apoi conventional commit la verde.

## Bucla recomandată per funcționalitate
1. `/plan-feature treci aplicația la fluxul HYDROKOV cu superior dinamic și prag 5000` -> aprobă planul.
2. `/tdd aprobarea avansează corect pe ramura >=5000 și pe ramura <5000`
3. construiește UI cu frontend-builder dacă e nevoie (RO + HU)
4. `/verify-flow lanț complet pe ambele ramuri`
5. `/security-review`
6. `/ship`

## Note
- Funcțiile de admin (workflow-uri configurabile, statistici, conturi) sunt un LOT SEPARAT — fă-le
  DUPĂ ce fluxul corect e stabil, ca adaos peste modelul de șablon. Nu le amesteca în același prompt.
- Frontmatter-ul (name, description, tools, argument-hint) e stabil, dar cheile pot diferi între
  versiunile Claude Code — dacă un fișier nu e prins, verifică `/agents` și `/help`.
- Agenții moștenesc serverele MCP (Playwright, Postgres read-only) dacă nu-i restrânge o linie `tools:`.
- Se completează cu hook-urile din `.claude/settings.json` (typecheck/test automat, blocarea comenzilor distructive).

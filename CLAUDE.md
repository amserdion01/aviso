# Aviso (HYDROKOV)
Aplicație internă de aprobare a achiziției directe pentru HYDROKOV SA (operatorul regional
de apă, județul Covasna). Digitizează procesul pe hârtie de "comandă internă / referat de
necesitate" într-un flux urmărit, pe roluri. Interfața este BILINGVĂ: Română + Maghiară (HU).

## Stack
- Next.js (App Router) + TypeScript, React Server Components
- PostgreSQL 16 + Drizzle ORM (migrații în /drizzle)
- Better Auth (email/parolă + acces pe roluri)
- i18n RO + HU (toate textele prin sistemul i18n — niciun string hardcodat)
- Nodemailer peste SMTP-ul companiei pentru notificări (template-uri React Email)
- Puppeteer + @sparticuz/chromium pentru generarea PDF pe server
- Vitest pentru teste; Playwright (MCP + teste headless) pentru fluxuri UI
- Self-hosted: Docker Compose / Coolify pe VPS în UE (rezidența datelor)

## Comenzi
- pnpm dev             # server dev pe :3000
- pnpm test            # vitest (toată suita)
- pnpm test <file>     # un singur fișier de test
- pnpm typecheck       # tsc --noEmit
- pnpm lint            # eslint
- pnpm db:generate     # drizzle-kit generate (după schimbări de schemă)
- pnpm db:migrate      # aplică migrațiile
- pnpm db:seed         # date de dev (useri pe roluri, șablon HYDROKOV, exemple)
- pnpm db:studio       # drizzle studio
- docker compose up -d # postgres + mailpit (capcană SMTP, UI pe :8025)

## Procedura reală HYDROKOV (sursa adevărului)
1. Apare o necesitate. Angajatul întocmește:
   - COMANDĂ INTERNĂ — dacă materialul apare în PAAP-ul aprobat (planul anual de achiziții);
   - REFERAT DE NECESITATE + NOTĂ JUSTIFICATIVĂ — dacă achiziția NU apare în PAAP.
   => DOUĂ tipuri de document; tipul depinde de apartenența la PAAP.
2. Documentul este AVIZAT de SUPERIORUL IERARHIC DIRECT al angajatului (dinamic, din
   organigramă — NU pași ficși prin IT/Magazie), apoi transmis la Biroul ACHIZIȚII.
3. Biroul Achiziții cere oferte și CALCULEAZĂ VALOAREA; stabilește și dacă produsul e în
   catalogul SEAP.
4. Ramificare după valoare, prag CONFIGURABIL = 5000 lei:
   - valoare >= 5000 lei  -> aprobare/semnătură Director Economic + Director General.
   - valoare < 5000 lei și ÎN catalog SEAP  -> se inițiază direct în SEAP (status
     "inițiat în SEAP"); fără pași de directori.
   - valoare < 5000 lei și NU în catalog SEAP (sau ofertantul n-are cont SEAP)  ->
     COMANDĂ EXTERNĂ, semnată de Șef/Coordonator Birou Achiziții + Director Economic +
     Director General.
   Integrarea SEAP reală e ÎN AFARA scope-ului — modelăm doar statusul și pașii de semnătură.
5. Fiecare aprobator/semnatar poate: Aprobă / Respinge / Trimite înapoi (un pas), cu
   comentariu OBLIGATORIU la respingere și trimitere înapoi. Fiecare acțiune se scrie în
   audit trail (append-only), în aceeași tranzacție DB.

## Roluri
angajat, sefIerarhic (dinamic, din organigramă), birouAchizitii (Coordonator/Șef),
directorEconomic, directorGeneral, admin.
(Rolurile vechi IT și Magazie NU mai există — au fost o presupunere greșită.)

## Model de date (esențial)
- users: include `superior_id` (FK către users) pentru avizarea dinamică, și rolul.
- requisitions: documentul (tip ['comanda_interna'|'referat'], in_paap bool, item, quantity,
  justificare, cost_center, valoare_lei int, in_seap_catalog bool|null, requester_id,
  workflow_template_id, current_status).
- workflow_templates / workflow_steps: lanțul e MATERIALIZAT DINTR-UN ȘABLON din DB (nu din
  constante hardcodate). Seed implicit = șablonul HYDROKOV de mai sus, cu prag 5000. Asta
  pregătește terenul pentru workflow-uri configurabile de admin, ca adaos, nu rescriere.
- approval_tasks: un rând per pas per requisition. Inbox:
  WHERE effective_approver_id = :me AND status = 'waiting'. Pasul activ = rândul 'waiting'.
- requisition_transitions: audit APPEND-ONLY (actor, from->to, comment, created_at).
  Niciodată UPDATE/DELETE; doar INSERT. Un singur rând 'most_recent' per requisition.
- delegations: înlocuitori (delegator, delegate, starts_at, ends_at, active).

## Reguli dure
- Folosește cea mai simplă abordare. Nu adăuga abstracții/librării nesolicitate.
- Nu modifica un test ca să treacă; corectează implementarea.
- TDD pe engine-ul de workflow și pe autorizare: testele care pică întâi, apoi commit, apoi implementarea.
- Valorile/cantitățile sunt întregi (unități minore) — niciodată float.
- Fiecare acțiune de aprobare se scrie în requisition_transitions în ACEEAȘI tranzacție care
  avansează workflow-ul.
- Autorizarea e per-task: un aprobator acționează DOAR pe taskuri rutate spre el (direct sau
  prin delegare activă). Rolul singur nu e suficient.
- Lanțul se construiește din șablonul de workflow + superiorul direct al angajatului +
  ramificarea pe valoare/SEAP — NU din pași hardcodați.
- Modificarea unui șablon NU trebuie să rescrie referatele deja în curs (referatul reține
  șablonul cu care a pornit).
- Toate textele noi: RO + HU prin i18n. Nu hardcoda string-uri.
- Niciodată comenzi DB distructive (DROP/TRUNCATE/rm -rf) pe vreo bază de date.
- Emailuri din Server Actions / route handlers (niciodată middleware/edge), asincron, cu retry.
  Local merg în Mailpit, nu în inboxuri reale.
- PDF-ul final se generează doar după aprobarea completă a lanțului.

## Convenții
- Validează tot inputul cu Zod la granița de server.
- Valorile de stare: text + CHECK (sau tabel lookup), nu ENUM Postgres.
- Commit după fiecare test verde, mesaj conventional-commit.

## Decizii (rezolvate — implementate)
- Director Economic + Director General: **secvențial** (motorul are un singur task `waiting`).
- "Superiorul ierarhic": **un singur nivel** (superiorul direct, `users.superior_id`; strategia `superior`).
- Cele două tipuri de document: **un singur șablon** (`wf-hydrokov`) + câmp `doc_type`/`in_paap` pe requisition.
- Ramura <5000 + SEAP: stare terminală **`seap_initiated`** + se generează documentul (PDF/print).
- Comandă externă (<5000 fără SEAP): semnatari ca **listă** pe document, realizați ca pași secvențiali
  în motor (Coordonator Achiziții → Director Economic → Director General).
- Centrele regionale (Tg. Secuiesc, Covasna, Întorsura Buzăului): **amânate (faza 2)** — v1 pe o
  singură organigramă; ulterior prin lanțuri `superior_id` / org_units per centru.
- Lotul admin (workflow-uri configurabile, operatori de condiție în UI, praguri editabile): **separat**,
  după ce fluxul real e stabil — ca adaos peste modelul de șablon.

Implementare: motorul în `src/domain/{workflow,chain}.ts` (HYDROKOV_CHAIN, prag 5000 lei =
`HYDROKOV_THRESHOLD_MINOR`), rezolvarea aprobatorilor în `src/db/repo.ts`, seed în `src/db/seed.ts`.

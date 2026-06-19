# Plan — HydroKov rename + Romanian/Hungarian (RO+HU) i18n

Status: **draft, awaiting approval.** Presentation-only change — the approval engine,
authorization, and audit trail are NOT touched.

## Decisions (confirmed)
- **i18n approach:** next-intl in **cookie mode** (no `[locale]` URL segment). Keeps every
  URL, link and `BETTER_AUTH_URL` unchanged; first-class RSC support; type-safe messages;
  locale-aware Intl formatting.
- **Official documents:** **per-recipient language** → add `users.locale`. Emails render in
  the recipient's locale; the PDF renders in the viewer's locale.
- **Hungarian content:** produced by a **dedicated translation subagent** (see below), full
  first pass; native domain review flagged as a later, non-blocking follow-up.
- **Rename scope:** in-app brand only (Vercel project / repo / `aviso-docs.vercel.app` URL
  stay as-is for now).

## Acceptance criteria
- Language switcher (RO/HU) in the app-shell user menu; switching re-renders the whole UI and
  persists (cookie + `users.locale`). Default RO.
- No Romanian leaks in HU mode: pages, components, label maps, validation/action errors, empty
  states, placeholders, aria-labels.
- Dates/numbers format per locale (`ro-RO`/`hu-HU`); timezone stays `Europe/Bucharest`; currency
  unit localizes (lei/lej).
- Emails in recipient's `users.locale`; PDF in the viewer's locale.
- No user-visible "Aviso" anywhere → HydroKov (brand, both wordmark SVGs, metadata, login
  footer, emails, docs).
- All existing tests stay green; engine/authz/audit unchanged.

## DB / schema
- Add `users.locale text NOT NULL DEFAULT 'ro'` + CHECK `in ('ro','hu')`. One additive Drizzle
  migration. No other schema change.

## Files
**New (i18n):** `src/i18n/request.ts` (next-intl config; read locale cookie → default ro),
`src/i18n/locale.ts` (cookie get/set + `setLocaleAction` that also persists `users.locale`),
`src/messages/ro.json`, `src/messages/hu.json`; wrap `next.config.ts` with
`createNextIntlPlugin`; `src/components/language-switcher.tsx`.

**Changed:** `layout.tsx` (`NextIntlClientProvider`, `<html lang>`, seed cookie from
`users.locale`); `src/lib/labels.ts` (maps/helpers → message-key lookups keyed by the **same
enum codes**); `src/lib/format.ts` (locale-aware, keep Bucharest); all 9 pages + ~9 client
components (`getTranslations`/`useTranslations`); `src/app/actions.ts` (localized errors);
`src/lib/validation.ts` (localized Zod messages); `src/lib/notifications.ts` +
`src/emails/notification.tsx` (recipient locale); `src/lib/referat-document.ts` (viewer locale);
`src/db/queries.ts` + `src/lib/session.ts` (expose `locale`).

**Rename:** brand in `app-shell` / `login-form` / `layout` metadata; `notifications.ts` subjects;
`emails/notification.tsx` footer; `mail.ts` FROM; docs (README / DEPLOY / GHID-DEMO / CLAUDE);
regenerate `public/assets/aviso-wordmark.svg` + `-inverse.svg` text → "HydroKov" (keep filenames;
keep `aviso-mark.svg` droplet; keep `avi-` CSS prefix; keep `@aviso.local` seed emails).

## Translation subagent (Hungarian)
The HU translation is delegated to a dedicated specialist subagent, not done inline:
- **Agent definition:** `.claude/agents/translator.md` — persona: professional translator,
  **native Hungarian**, expert in **Romanian → Hungarian** for the public-administration /
  water-utility domain as used by the Hungarian minority in Romania (Transylvania). Formal
  register (the "dvs." equivalent), correct administrative terminology, consistent glossary.
- **Input/output:** given the finalized `src/messages/ro.json` (source of truth) + a short
  glossary of fixed domain terms (referat de necesitate, aviz, șef serviciu, achiziții,
  director economic, etc.), it produces `src/messages/hu.json` with **identical keys**, leaving
  interpolation placeholders (`{item}`, `{n}`) and ICU syntax intact.
- **QA:** a key-parity test must pass; the agent self-checks that no key is missing/extra and no
  placeholder was dropped. Native human review of domain terms is a flagged follow-up.

## Tests (written first)
- **Message parity:** `ro.json` and `hu.json` have identical key sets.
- **Label resolver:** each status/taskType/capability code → correct RO + HU label; unknown code
  falls back.
- **Locale persistence:** `setLocaleAction` writes cookie + `users.locale`; config defaults to RO.
- **Rename guard:** no user-visible "Aviso" in brand/metadata/wordmark/email constants.
- **Invariant:** translating labels never changes stored enum values (`createRequisition` still
  persists `status='in_progress'`, `taskType='SEF_BIROU'`, …); engine/repo/authz tests stay green.
- **Format smoke:** `ro-RO` vs `hu-HU` number/date output.

## Approval-chain invariants preserved
i18n + rename are presentation-only: `domain/workflow.ts`, `db/repo.ts` (transition in same tx,
append-only audit), per-task authz, task materialization, threshold/workflow routing — all
unchanged. Labels translate **display only**, keyed off existing enum codes; stored DB values
never change. `requisitionStatusBadge` keeps its `tone`, only `label` localizes.

## Order of work
1. Rename → HydroKov (independent, low-risk).
2. next-intl scaffolding + extract current strings into `ro.json` (UI still all-RO, behavior identical).
3. Locale-aware `labels.ts` + `format.ts`.
4. Convert pages → client components → actions/validation to `t()`.
5. `users.locale` migration + language switcher + login seeding + localized emails/PDF.
6. **Translation subagent** drafts `hu.json` from `ro.json`; parity test green.
7. Re-seed local + Neon; verify both languages in the browser.

# i18n conversion contract (READ FIRST)

We are retrofitting **next-intl** into the app. Romanian (`ro`) is the default and is
already the only language present. Your job: replace **hardcoded Romanian UI text** in your
assigned files with message lookups, and localize **enum labels + date/number formatting**
via the shared accessors. Hungarian is translated later by another agent — you only touch `ro`.

This is **presentation-only**. Do NOT change any logic, control flow, routes, server-action
behavior, DB writes, enum codes, CSS class names, or variable names.

## How to translate

### Inline UI prose (titles, subs, buttons, table headers, empty states, placeholders, hints, aria-labels)
Use next-intl with **full dotted keys** (no namespace argument):

- **Server Component** (async function, no `"use client"`):
  ```ts
  import { getTranslations, getLocale } from "next-intl/server";
  import type { Locale } from "@/i18n/locale";
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  // ...  t("home.title")   t("home.greeting", { name })
  ```
- **Client Component** (`"use client"`):
  ```ts
  import { useTranslations, useLocale } from "next-intl";
  import type { Locale } from "@/i18n/locale";
  const t = useTranslations();
  const locale = useLocale() as Locale;
  ```
Interpolation uses ICU placeholders in the message, e.g. `"title": "Referat #{id}"` → `t("...", { id })`.

### Enum labels — DO NOT use t(); use the locale-aware accessors from `@/lib/labels`
Pass the active `locale`:
- `statusLabel(code, locale)`, `taskStatusLabel(code, locale)`, `taskTypeLabel(code, locale)`,
  `procurementLabel(code, locale)`, `actionLabel(code, locale)`, `capabilityLabel(code, locale)`,
  `approverStrategyLabel(code, locale)`
- `primaryRole(capabilities, locale)`
- `requisitionStatusBadge(status, locale)` → `{ tone, label }`
- `describeCondition(appliesWhen, locale)` → string
- `formatLei(minorOrNull, locale)` → string (handles `—` and the lei/lej unit)
These REPLACE the old `STATUS_LABELS`, `TASK_TYPE_LABELS`, `CAPABILITY_LABELS`,
`PROCUREMENT_TYPE_LABELS`, `APPROVER_STRATEGY_LABELS` maps (now removed). If a file built
option arrays from those maps (e.g. `Object.entries(CAPABILITY_LABELS)`), rebuild them from
`ASSIGNABLE_CAPABILITIES` mapped through `capabilityLabel(code, locale)` inside the component.

### Dates from `@/lib/format`
`formatDate(d, locale)` and `formatDateTime(d, locale)` — pass the active `locale`.

## Your message fragment
Write every prose string you use into the `ro` fragment files you OWN (listed in your task),
e.g. `src/messages/ro/home.json`. Group keys logically. Keys are dotted by the file's
namespace = filename, so `home.json` holds `{ "title": "...", "table": { "item": "..." } }`
and you call `t("home.title")`, `t("home.table.item")`.

- You may **read** `src/messages/ro/common.json`, `nav.json`, and `src/messages/ro/labels.json`
  for keys to reuse (see common keys below) — but **do NOT edit** fragments you don't own.
- Reuse `common.*` for generic buttons/words instead of duplicating.

### Available `common.*` keys (reuse these)
cancel, save, saveChanges, create, add, edit, delete, close, back, search, none ("—"),
noneWord ("Niciunul"), yes, no, active, inactive, activeF ("Activă"), inactiveF ("Inactivă"),
downloadPdf ("Descarcă PDF"), saving ("Se salvează…"), sending ("Se trimite…"),
status ("Status"), pieces ("buc."), all ("Toate").

## Do NOT translate
User-entered data (item names, justification text, comments, user names, emails, cost-center
values), enum codes, route paths, CSS classes, `data-*`, variable/function names. Preserve all
Romanian diacritics (ș, ț, ă, î, â) exactly in the `ro` fragment.

## When done
- Make sure every prose string in your files now comes from `t(...)` and every enum label/date
  goes through the accessors with `locale`.
- Do NOT run project-wide `pnpm typecheck`/`lint` (other agents are editing in parallel — it
  will show their in-progress errors). Self-review your own files for type-correctness.
- Report: files changed, the fragment key tree you authored, and anything you were unsure about.

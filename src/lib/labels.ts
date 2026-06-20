/**
 * Enum → display-label accessors. Locale-aware (ro default / hu), backed by the
 * `labels` message fragments. These are plain synchronous functions so they work
 * everywhere — server components, client components, and pure server modules
 * (queries, PDF, email) — by passing the active locale (useLocale()/getLocale(),
 * or the recipient/viewer locale for email/PDF). Display only: the stored enum
 * codes (status, taskType, capability, …) never change.
 */
import { intlLocale, type Locale } from "@/i18n/locale";
import roLabels from "@/messages/ro/labels.json";
import huLabels from "@/messages/hu/labels.json";

type LabelGroups = typeof roLabels;
type GroupKey = "status" | "taskStatus" | "taskType" | "procurementType" | "action" | "capability" | "approverStrategy" | "statusBadge" | "docType";

const DATA: Record<Locale, Record<string, unknown>> = { ro: roLabels, hu: huLabels };

function group(locale: Locale, name: GroupKey): Record<string, string> {
  const loc = (DATA[locale]?.[name] as Record<string, string>) ?? {};
  const ro = (DATA.ro[name] as Record<string, string>) ?? {};
  return { ...ro, ...loc };
}
function lookup(locale: Locale, name: GroupKey, code: string): string {
  return group(locale, name)[code] ?? code;
}
function scalar(locale: Locale, key: keyof LabelGroups, fallback: string): string {
  return (DATA[locale]?.[key] as string) || (DATA.ro[key] as string) || fallback;
}

export const statusLabel = (code: string, locale: Locale = "ro") => lookup(locale, "status", code);
export const taskStatusLabel = (code: string, locale: Locale = "ro") => lookup(locale, "taskStatus", code);
export const taskTypeLabel = (code: string, locale: Locale = "ro") => lookup(locale, "taskType", code);
export const procurementLabel = (code: string, locale: Locale = "ro") => lookup(locale, "procurementType", code);
export const actionLabel = (code: string, locale: Locale = "ro") => lookup(locale, "action", code);
export const capabilityLabel = (code: string, locale: Locale = "ro") => lookup(locale, "capability", code);
export const approverStrategyLabel = (code: string, locale: Locale = "ro") => lookup(locale, "approverStrategy", code);
export const docTypeLabel = (code: string, locale: Locale = "ro") => lookup(locale, "docType", code);

/** Capabilities an admin can assign to a user (HYDROKOV roles; ordered). */
export const ASSIGNABLE_CAPABILITIES = [
  "angajat",
  "sef_ierarhic",
  "birou_achizitii",
  "coord_achizitii",
  "director_economic",
  "director_general",
  "admin",
] as const;

const ROLE_PRIORITY = [
  "director_general",
  "director_economic",
  "coord_achizitii",
  "birou_achizitii",
  "sef_ierarhic",
  "angajat",
];

/** The most senior capability code a user holds (pure; translate at the call site). */
export function primaryCapability(capabilities: string[]): string | null {
  for (const cap of ROLE_PRIORITY) {
    if (capabilities.includes(cap)) return cap;
  }
  return capabilities[0] ?? null;
}

/** The most senior capability a user holds, as a display label. */
export function primaryRole(capabilities: string[], locale: Locale = "ro"): string {
  const cap = primaryCapability(capabilities);
  return cap ? capabilityLabel(cap, locale) : scalar(locale, "userFallback", "Utilizator");
}

export type StatusTone = "pending" | "approved" | "rejected" | "sentback" | "finalized" | "neutral";

/** Maps a requisition's stored status to a design-system status badge (tone + label). */
export function requisitionStatusBadge(status: string, locale: Locale = "ro"): { tone: StatusTone; label: string } {
  const labels = group(locale, "statusBadge");
  switch (status) {
    case "approved":
      return { tone: "finalized", label: labels.approved ?? "Finalizat" };
    case "seap_initiated":
      return { tone: "approved", label: labels.seap_initiated ?? "Inițiat în SEAP" };
    case "returned":
      return { tone: "sentback", label: labels.returned ?? "Returnat la solicitant" };
    case "rejected":
      return { tone: "rejected", label: labels.rejected ?? "Respins" };
    default:
      return { tone: "pending", label: labels.in_progress ?? "În curs" };
  }
}

/** Human summary of an approval step's applies_when condition. */
export function describeCondition(cond: unknown, locale: Locale = "ro"): string {
  const c = (cond ?? null) as Record<string, unknown> | null;
  const cd = (DATA[locale]?.condition ?? DATA.ro.condition ?? {}) as Record<string, string>;
  const ro = (DATA.ro.condition ?? {}) as Record<string, string>;
  const phrase = (k: string) => cd[k] ?? ro[k] ?? k;
  if (c == null) return phrase("always");
  if ("all" in c) return phrase("composite");
  if (c.field === "needsIt") return phrase("needsIt");
  if (c.field === "needsSsm") return phrase("needsSsm");
  if (c.field === "procurementType") {
    return phrase("procurementType").replace("{type}", procurementLabel(String(c.eq), locale));
  }
  if (c.field === "estimatedValueMinor") {
    const amount = ((Number(c.gt) || 0) / 100).toLocaleString(intlLocale(locale));
    return phrase("value").replace("{amount}", amount);
  }
  return phrase("advanced");
}

export function formatLei(minor: number | null, locale: Locale = "ro"): string {
  if (minor === null) return "—";
  const unit = scalar(locale, "currencyUnit", "lei");
  return `${(minor / 100).toLocaleString(intlLocale(locale), { minimumFractionDigits: 2 })} ${unit}`;
}

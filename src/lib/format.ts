/**
 * Date formatting for the UI. Pinned to Romania's timezone so timestamps render
 * in local time regardless of where the server runs (Vercel runs in UTC).
 * The locale (ro default / hu) selects the BCP-47 tag; the timezone never changes.
 */
import { intlLocale, type Locale } from "@/i18n/locale";

const TIME_ZONE = "Europe/Bucharest";

export const formatDate = (d: Date | string, locale: Locale = "ro"): string =>
  new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));

export const formatDateTime = (d: Date | string, locale: Locale = "ro"): string =>
  new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));

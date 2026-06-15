/**
 * Date formatting for the UI. Pinned to Romania's timezone so timestamps render
 * in local time regardless of where the server runs (Vercel runs in UTC).
 */
const TIME_ZONE = "Europe/Bucharest";

export const formatDate = (d: Date | string): string =>
  new Intl.DateTimeFormat("ro-RO", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));

export const formatDateTime = (d: Date | string): string =>
  new Intl.DateTimeFormat("ro-RO", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));

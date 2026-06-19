/**
 * Pure locale constants/types — safe to import from client OR server.
 * (The server-only cookie reader lives in ./locale.server.ts.)
 */
export const LOCALES = ["ro", "hu"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ro";
export const LOCALE_COOKIE = "hk_locale";

export function isLocale(value: unknown): value is Locale {
  return value === "ro" || value === "hu";
}

export function coerceLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** BCP-47 tag for Intl APIs. */
export function intlLocale(locale: Locale): string {
  return locale === "hu" ? "hu-HU" : "ro-RO";
}

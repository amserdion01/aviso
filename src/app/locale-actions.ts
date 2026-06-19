"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { coerceLocale, LOCALE_COOKIE, type Locale } from "@/i18n/locale";

const ONE_YEAR = 60 * 60 * 24 * 365;

async function writeLocaleCookie(locale: Locale) {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
}

/**
 * Switch the active UI language. Persists to the cookie (drives the UI) and,
 * for a logged-in user, to users.locale (drives notification emails).
 */
export async function setLocaleAction(next: string): Promise<void> {
  const locale = coerceLocale(next);
  await writeLocaleCookie(locale);
  const user = await getCurrentUser();
  if (user) {
    await db.update(users).set({ locale }).where(eq(users.id, user.id));
  }
}

/**
 * Seed the locale cookie from the user's stored preference (called right after
 * a successful sign-in, before the redirect).
 */
export async function syncLocaleCookieFromUser(): Promise<void> {
  const user = await getCurrentUser();
  if (user) await writeLocaleCookie(coerceLocale(user.locale));
}

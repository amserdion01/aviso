import "server-only";
import { cookies } from "next/headers";
import { coerceLocale, LOCALE_COOKIE, type Locale } from "./locale";

/** Read the active locale from the cookie (server-side). Falls back to ro. */
export async function readLocaleCookie(): Promise<Locale> {
  const store = await cookies();
  return coerceLocale(store.get(LOCALE_COOKIE)?.value);
}

import { getRequestConfig } from "next-intl/server";
import { readLocaleCookie } from "./locale.server";
import { loadMessages } from "./messages";

/**
 * next-intl request config (cookie mode — no [locale] URL segment).
 * The active locale comes from the hk_locale cookie (default ro). Every
 * Server/Client component then reads messages via getTranslations/useTranslations.
 * Messages are split into one fragment file per namespace (see ./messages).
 */
export default getRequestConfig(async () => {
  const locale = await readLocaleCookie();
  return { locale, messages: await loadMessages(locale) };
});

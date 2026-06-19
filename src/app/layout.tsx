import type { Metadata } from "next";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { inboxFor, activeSubstituteFor, notificationsFor } from "@/db/queries";
import { primaryRole } from "@/lib/labels";
import { AppShell } from "@/components/app-shell";
import { coerceLocale } from "@/i18n/locale";

import { formatDate as fmtDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "HydroKov — Referate de necesitate",
  description: "Flux de aprobare a referatelor de necesitate",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = coerceLocale(await getLocale());
  const messages = await getMessages();
  const user = await getCurrentUser();

  let inboxCount = 0;
  let activeSubstitute: { name: string; until: string } | null = null;
  let notifications: Awaited<ReturnType<typeof notificationsFor>> = { items: [], unread: 0 };
  if (user) {
    const [inbox, substitute, notifs] = await Promise.all([
      inboxFor(user.id),
      activeSubstituteFor(user.id),
      notificationsFor(user.id),
    ]);
    inboxCount = inbox.length;
    if (substitute) activeSubstitute = { name: substitute.delegateName, until: fmtDate(substitute.endsAt, locale) };
    notifications = notifs;
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {user ? (
            <AppShell
              user={{ name: user.name, email: user.email }}
              roleLabel={primaryRole(user.capabilities, locale)}
              inboxCount={inboxCount}
              isAdmin={isAdmin(user)}
              activeSubstitute={activeSubstitute}
              notifications={notifications}
            >
              {children}
            </AppShell>
          ) : (
            children
          )}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

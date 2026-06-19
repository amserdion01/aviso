import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { inboxFor, activeSubstituteFor, notificationsFor } from "@/db/queries";
import { primaryRole } from "@/lib/labels";
import { AppShell } from "@/components/app-shell";

import { formatDate as fmtDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "HydroKov — Referate de necesitate",
  description: "Flux de aprobare a referatelor de necesitate",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
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
    if (substitute) activeSubstitute = { name: substitute.delegateName, until: fmtDate(substitute.endsAt) };
    notifications = notifs;
  }

  return (
    <html lang="ro">
      <body>
        {user ? (
          <AppShell
            user={{ name: user.name, email: user.email }}
            roleLabel={primaryRole(user.capabilities)}
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
      </body>
    </html>
  );
}

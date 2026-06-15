import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { inboxFor, activeSubstituteFor } from "@/db/queries";
import { primaryRole } from "@/lib/labels";
import { AppShell } from "@/components/app-shell";

const fmtDate = (d: Date) => new Intl.DateTimeFormat("ro-RO").format(d);

export const metadata: Metadata = {
  title: "Aviso — Referate de necesitate",
  description: "Flux de aprobare a referatelor de necesitate",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  let inboxCount = 0;
  let activeSubstitute: { name: string; until: string } | null = null;
  if (user) {
    const [inbox, substitute] = await Promise.all([inboxFor(user.id), activeSubstituteFor(user.id)]);
    inboxCount = inbox.length;
    if (substitute) activeSubstitute = { name: substitute.delegateName, until: fmtDate(substitute.endsAt) };
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

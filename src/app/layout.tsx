import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { inboxFor } from "@/db/queries";
import { primaryRole } from "@/lib/labels";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Aviso — Referate de necesitate",
  description: "Flux de aprobare a referatelor de necesitate",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="ro">
      <body>
        {user ? (
          <AppShell
            user={{ name: user.name, email: user.email }}
            roleLabel={primaryRole(user.capabilities)}
            inboxCount={(await inboxFor(user.id)).length}
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

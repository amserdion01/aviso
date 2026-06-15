import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = {
  title: "Aviso — Referate de necesitate",
  description: "Flux de aprobare a referatelor de necesitate",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="ro" className="h-full antialiased">
      <body className="min-h-full bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold">
              Aviso
            </Link>
            {user && (
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/referate/nou" className="hover:underline">
                  Referat nou
                </Link>
                <Link href="/inbox" className="hover:underline">
                  Inbox
                </Link>
                <Link href="/delegari" className="hover:underline">
                  Delegări
                </Link>
                <span className="text-gray-500">{user.name}</span>
                <SignOutButton />
              </nav>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}

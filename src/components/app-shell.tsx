"use client";
import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { Avatar, CountBadge } from "@/components/ui/primitives";
import { ToastHost } from "@/components/ui/toast-host";
import { NotificationsBell, type NotificationItem } from "@/components/notifications-bell";
import { signOut } from "@/lib/auth-client";

interface NavDef {
  href: string;
  label: string;
  icon: IconName;
  match: (path: string) => boolean;
}

const NAV: NavDef[] = [
  { href: "/inbox", label: "Inboxul meu", icon: "inbox", match: (p) => p === "/inbox" },
  { href: "/referate/nou", label: "Referat nou", icon: "file-plus-2", match: (p) => p === "/referate/nou" },
  { href: "/", label: "Toate referatele", icon: "files", match: (p) => p === "/" || (p.startsWith("/referate/") && p !== "/referate/nou") },
  { href: "/achizitii", label: "Achiziții", icon: "shopping-cart", match: (p) => p.startsWith("/achizitii") },
  { href: "/admin", label: "Administrare", icon: "settings", match: (p) => p.startsWith("/admin") || p.startsWith("/delegari") },
];

export function AppShell({
  user,
  roleLabel,
  inboxCount = 0,
  isAdmin = false,
  activeSubstitute,
  notifications,
  children,
}: {
  user: { name: string; email: string };
  roleLabel: string;
  inboxCount?: number;
  isAdmin?: boolean;
  activeSubstitute?: { name: string; until: string } | null;
  notifications: { items: NotificationItem[]; unread: number };
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  async function doSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="avi-app">
      <header className="avi-topbar">
        <Link href="/" className="avi-topbar__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/aviso-mark.svg" width={26} height={26} alt="" />
          <span className="avi-topbar__name">Aviso</span>
          <span className="avi-topbar__org">Apa Covasna</span>
        </Link>
        <form action="/" className="avi-topbar__search">
          <Icon name="search" />
          <input name="q" placeholder="Caută referat, articol sau centru de cost…" aria-label="Caută" />
        </form>
        <div className="avi-topbar__right">
          <NotificationsBell items={notifications.items} unread={notifications.unread} />
          <div className="avi-usermenu">
            <button className="avi-usermenu__btn" onClick={() => setMenu((m) => !m)}>
              <Avatar name={user.name} size="sm" />
              <span className="avi-usermenu__meta">
                <span className="avi-usermenu__nm">{user.name}</span>
                <span className="avi-usermenu__rl">{roleLabel}</span>
              </span>
              <Icon name="chevron-down" />
            </button>
            {menu && (
              <div className="avi-usermenu__pop" onMouseLeave={() => setMenu(false)}>
                <div className="avi-usermenu__head">
                  <div className="avi-usermenu__nm2">{user.name}</div>
                  <div className="avi-usermenu__em">{user.email}</div>
                </div>
                <Link href="/delegari" className="avi-usermenu__item" onClick={() => setMenu(false)}>
                  <Icon name="repeat" /> Setează înlocuitor
                </Link>
                <div className="avi-usermenu__sep" />
                <button className="avi-usermenu__item avi-usermenu__item--danger" onClick={doSignOut}>
                  <Icon name="log-out" /> Deconectare
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="avi-body">
        <nav className="avi-sidebar">
          <div className="avi-sidebar__group">
            {NAV.filter((it) => it.href !== "/admin" || isAdmin).map((it) => {
              const active = it.match(pathname);
              return (
                <Link key={it.href} href={it.href} className={"avi-navitem" + (active ? " is-active" : "")} aria-current={active ? "page" : undefined}>
                  <span className="avi-navitem__icon"><Icon name={it.icon} /></span>
                  <span className="avi-navitem__label">{it.label}</span>
                  {it.href === "/inbox" && inboxCount > 0 && <span className="avi-navitem__trailing"><CountBadge count={inboxCount} /></span>}
                </Link>
              );
            })}
          </div>
          <div className="avi-sidebar__foot">
            <Link href="/delegari" className="avi-sidebar__sub" style={{ textDecoration: "none" }}>
              <Icon name="shield-check" />
              <div>
                <div className="avi-sidebar__subt">Înlocuitor activ</div>
                <div className="avi-sidebar__subd">
                  {activeSubstitute ? `${activeSubstitute.name} · până la ${activeSubstitute.until}` : "Niciunul setat"}
                </div>
              </div>
            </Link>
          </div>
        </nav>
        <main className="avi-main">{children}</main>
      </div>
      <Suspense fallback={null}>
        <ToastHost />
      </Suspense>
    </div>
  );
}

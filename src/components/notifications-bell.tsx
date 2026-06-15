"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { markNotificationsReadAction } from "@/app/actions";
import { CountBadge } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/icon";

export interface NotificationItem {
  requisitionId: string;
  item: string;
  action: string;
  toStatus: string;
  actorName: string;
  createdAt: string | Date;
  unread: boolean;
}

type Kind = "approved" | "finalized" | "rejected" | "sentback";

function kindOf(n: NotificationItem): Kind {
  if (n.action === "reject") return "rejected";
  if (n.action === "send_back") return "sentback";
  if (n.action === "approve" && n.toStatus === "approved") return "finalized";
  return "approved";
}

const ICON: Record<Kind, IconName> = {
  approved: "check",
  finalized: "check-check",
  rejected: "x",
  sentback: "corner-up-left",
};

function line(n: NotificationItem): string {
  switch (kindOf(n)) {
    case "rejected":
      return `${n.actorName} a respins referatul`;
    case "sentback":
      return `${n.actorName} a trimis înapoi referatul`;
    case "finalized":
      return "Referatul tău a fost aprobat complet";
    default:
      return `${n.actorName} a avizat referatul`;
  }
}

const fmtWhen = (d: string | Date) =>
  new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

export function NotificationsBell({ items, unread }: { items: NotificationItem[]; unread: number }) {
  const [open, setOpen] = useState(false);
  const [localUnread, setLocalUnread] = useState(unread);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && localUnread > 0) {
      setLocalUnread(0);
      startTransition(() => {
        markNotificationsReadAction().catch(() => {});
      });
    }
  }

  return (
    <div className="avi-notif">
      <button className="avi-iconbtn avi-iconbtn--ghost avi-iconbtn--md" aria-label="Notificări" onClick={toggle}>
        <Icon name="bell" />
      </button>
      {localUnread > 0 && (
        <span className="avi-notif__count">
          <CountBadge count={localUnread} tone="danger" />
        </span>
      )}
      {open && (
        <div className="avi-notif__pop" onMouseLeave={() => setOpen(false)}>
          <div className="avi-notif__head">
            <span className="avi-notif__title">Notificări</span>
          </div>
          <div className="avi-notif__list">
            {items.length === 0 ? (
              <div className="avi-notif__empty">Nicio notificare deocamdată.</div>
            ) : (
              items.map((n, i) => {
                const kind = kindOf(n);
                return (
                  <Link
                    key={i}
                    href={`/referate/${n.requisitionId}`}
                    className={"avi-notif__item" + (n.unread ? " avi-notif__item--unread" : "")}
                    onClick={() => setOpen(false)}
                  >
                    <span className={`avi-notif__ico avi-notif__ico--${kind}`}>
                      <Icon name={ICON[kind]} />
                    </span>
                    <span className="avi-notif__body">
                      <span className="avi-notif__txt">
                        {line(n)} <b>„{n.item}”</b>
                      </span>
                      <span className="avi-notif__time">{fmtWhen(n.createdAt)}</span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

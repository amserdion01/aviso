"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { markNotificationsReadAction } from "@/app/actions";
import { CountBadge } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/icon";

export type NotificationType = "approved" | "finalized" | "rejected" | "sentback" | "todo";
export interface NotificationItem {
  type: NotificationType;
  requisitionId: string;
  item: string;
  actorName: string | null;
  taskLabel: string | null;
  createdAt: string | Date;
  unread: boolean;
}

const ICON: Record<NotificationType, IconName> = {
  approved: "check",
  finalized: "check-check",
  rejected: "x",
  sentback: "corner-up-left",
  todo: "inbox",
};

function line(n: NotificationItem): string {
  switch (n.type) {
    case "rejected":
      return `${n.actorName} a respins referatul`;
    case "sentback":
      return `${n.actorName} a trimis înapoi referatul`;
    case "finalized":
      return "Referatul tău a fost aprobat complet";
    case "todo":
      return n.taskLabel ? `De aprobat (${n.taskLabel})` : "Ai un referat de aprobat";
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
                return (
                  <Link
                    key={i}
                    href={`/referate/${n.requisitionId}`}
                    className={"avi-notif__item" + (n.unread ? " avi-notif__item--unread" : "")}
                    onClick={() => setOpen(false)}
                  >
                    <span className={`avi-notif__ico avi-notif__ico--${n.type}`}>
                      <Icon name={ICON[n.type]} />
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

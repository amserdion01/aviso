"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/i18n/locale";
import { markNotificationsReadAction } from "@/app/actions";
import { CountBadge } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/icon";
import { taskTypeLabel } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

export type NotificationType = "approved" | "finalized" | "rejected" | "sentback" | "todo";
export interface NotificationItem {
  type: NotificationType;
  requisitionId: string;
  item: string;
  actorName: string | null;
  taskType: string | null;
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

export function NotificationsBell({ items, unread }: { items: NotificationItem[]; unread: number }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [localUnread, setLocalUnread] = useState(unread);
  const [, startTransition] = useTransition();

  function line(n: NotificationItem): string {
    switch (n.type) {
      case "rejected":
        return t("notifications.lines.rejected", { actor: n.actorName ?? "" });
      case "sentback":
        return t("notifications.lines.sentback", { actor: n.actorName ?? "" });
      case "finalized":
        return t("notifications.lines.finalized");
      case "todo":
        return n.taskType
          ? t("notifications.lines.todoTyped", { task: taskTypeLabel(n.taskType, locale) })
          : t("notifications.lines.todo");
      default:
        return t("notifications.lines.approved", { actor: n.actorName ?? "" });
    }
  }

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
      <button className="avi-iconbtn avi-iconbtn--ghost avi-iconbtn--md" aria-label={t("notifications.ariaLabel")} onClick={toggle}>
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
            <span className="avi-notif__title">{t("notifications.title")}</span>
          </div>
          <div className="avi-notif__list">
            {items.length === 0 ? (
              <div className="avi-notif__empty">{t("notifications.empty")}</div>
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
                      <span className="avi-notif__time">{formatDateTime(n.createdAt, locale)}</span>
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

import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import { requireUser } from "@/lib/session";
import { inboxFor } from "@/db/queries";
import { actReferatAction } from "@/app/actions";
import { taskTypeLabel } from "@/lib/labels";
import {
  PageHead,
  Table,
  Avatar,
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  CountBadge,
  Card,
  type Column,
} from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { Tabs } from "@/components/ui/tabs";

import { formatDate as fmtDate } from "@/lib/format";

type Task = Awaited<ReturnType<typeof inboxFor>>[number];

export default async function InboxPage() {
  const user = await requireUser();
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const tasks = await inboxFor(user.id);

  const columns: Column<Task>[] = [
    {
      key: "solicitant",
      header: t("inbox.table.requester"),
      render: (task) => (
        <div className="avi-cell-user">
          <Avatar name={task.requesterName} size="sm" />
          <div>
            <div className="avi-cell-user__nm">{task.requesterName}</div>
            <div className="avi-cell-user__id">#{task.requisitionId.slice(0, 8)}</div>
          </div>
        </div>
      ),
    },
    {
      key: "articol",
      header: t("inbox.table.item"),
      render: (task) => (
        <Link href={`/referate/${task.requisitionId}`} className="avi-link">
          <div className="avi-cell-strong">{task.item}</div>
          <div className="avi-cell-muted">
            {task.quantity} {t("common.pieces")}
            {task.onBehalfOf && <span className="avi-urgent"> {t("inbox.onBehalfOf", { name: task.onBehalfOf })}</span>}
          </div>
        </Link>
      ),
    },
    {
      key: "pas",
      header: t("inbox.table.yourStep"),
      render: (task) => <Badge variant="accent">{taskTypeLabel(task.taskType, locale)}</Badge>,
    },
    { key: "createdAt", header: t("inbox.table.received"), render: (task) => <span className="avi-cell-mono">{fmtDate(task.createdAt, locale)}</span> },
    {
      key: "actions",
      header: t("inbox.table.actions"),
      align: "right",
      render: (task) => (
        <div className="avi-rowactions">
          {task.taskType === "INCADRARE" ? (
            <ButtonLink href={`/referate/${task.requisitionId}`} size="sm" variant="primary">
              {t("inbox.classify")}
            </ButtonLink>
          ) : (
            <form action={actReferatAction}>
              <input type="hidden" name="requisitionId" value={task.requisitionId} />
              <Button type="submit" name="action" value="approve" size="sm" variant="primary" iconLeft={<Icon name="check" />}>
                {t("inbox.approve")}
              </Button>
            </form>
          )}
          <ButtonLink href={`/referate/${task.requisitionId}?action=send_back`} size="sm" variant="secondary" aria-label={t("inbox.sendBack")}>
            <Icon name="corner-up-left" />
          </ButtonLink>
          <ButtonLink href={`/referate/${task.requisitionId}?action=reject`} size="sm" variant="secondary" aria-label={t("inbox.reject")}>
            <Icon name="x" />
          </ButtonLink>
        </div>
      ),
    },
  ];

  const waitingPanel =
    tasks.length > 0 ? (
      <Table columns={columns} data={tasks} rowKey={(task) => task.taskId} />
    ) : (
      <Card padding="sm">
        <EmptyState
          icon="inbox"
          title={t("inbox.emptyWaiting.title")}
          description={t("inbox.emptyWaiting.description")}
          actions={
            <ButtonLink href="/referate/nou" variant="secondary" iconLeft={<Icon name="file-plus-2" />}>
              {t("inbox.emptyWaiting.create")}
            </ButtonLink>
          }
        />
      </Card>
    );

  const trimisePanel = (
    <Card padding="sm">
      <EmptyState
        icon="send"
        title={t("inbox.emptySent.title")}
        description={t("inbox.emptySent.description")}
        actions={
          <ButtonLink href="/" variant="secondary" iconLeft={<Icon name="files" />}>
            {t("inbox.emptySent.viewAll")}
          </ButtonLink>
        }
      />
    </Card>
  );

  return (
    <div className="avi-screen">
      <PageHead title={t("inbox.title")} sub={t("inbox.sub")} />
      <Tabs
        items={[
          { value: "asteptare", label: t("inbox.tabs.waiting"), trailing: <CountBadge count={tasks.length} /> },
          { value: "trimise", label: t("inbox.tabs.sent") },
        ]}
        panels={{ asteptare: waitingPanel, trimise: trimisePanel }}
      />
    </div>
  );
}

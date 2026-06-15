import Link from "next/link";
import { requireUser } from "@/lib/session";
import { inboxFor } from "@/db/queries";
import { actReferatAction } from "@/app/actions";
import { TASK_TYPE_LABELS } from "@/lib/labels";
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

const fmtDate = (d: Date) => new Intl.DateTimeFormat("ro-RO").format(d);

type Task = Awaited<ReturnType<typeof inboxFor>>[number];

export default async function InboxPage() {
  const user = await requireUser();
  const tasks = await inboxFor(user.id);

  const columns: Column<Task>[] = [
    {
      key: "solicitant",
      header: "Solicitant",
      render: (t) => (
        <div className="avi-cell-user">
          <Avatar name={t.requesterName} size="sm" />
          <div>
            <div className="avi-cell-user__nm">{t.requesterName}</div>
            <div className="avi-cell-user__id">#{t.requisitionId.slice(0, 8)}</div>
          </div>
        </div>
      ),
    },
    {
      key: "articol",
      header: "Articol",
      render: (t) => (
        <Link href={`/referate/${t.requisitionId}`} className="avi-link">
          <div className="avi-cell-strong">{t.item}</div>
          <div className="avi-cell-muted">
            {t.quantity} buc.
            {t.onBehalfOf && <span className="avi-urgent"> · în numele {t.onBehalfOf}</span>}
          </div>
        </Link>
      ),
    },
    {
      key: "pas",
      header: "Pasul tău",
      render: (t) => <Badge variant="accent">{TASK_TYPE_LABELS[t.taskType] ?? t.taskType}</Badge>,
    },
    { key: "createdAt", header: "Primit", render: (t) => <span className="avi-cell-mono">{fmtDate(t.createdAt)}</span> },
    {
      key: "actions",
      header: "Acțiuni",
      align: "right",
      render: (t) => (
        <div className="avi-rowactions">
          {t.taskType === "INCADRARE" ? (
            <ButtonLink href={`/referate/${t.requisitionId}`} size="sm" variant="primary">
              Încadrează
            </ButtonLink>
          ) : (
            <form action={actReferatAction}>
              <input type="hidden" name="requisitionId" value={t.requisitionId} />
              <Button type="submit" name="action" value="approve" size="sm" variant="primary" iconLeft={<Icon name="check" />}>
                Aprobă
              </Button>
            </form>
          )}
          <ButtonLink href={`/referate/${t.requisitionId}?action=send_back`} size="sm" variant="secondary" aria-label="Trimite înapoi">
            <Icon name="corner-up-left" />
          </ButtonLink>
          <ButtonLink href={`/referate/${t.requisitionId}?action=reject`} size="sm" variant="secondary" aria-label="Respinge">
            <Icon name="x" />
          </ButtonLink>
        </div>
      ),
    },
  ];

  const waitingPanel =
    tasks.length > 0 ? (
      <Table columns={columns} data={tasks} rowKey={(t) => t.taskId} />
    ) : (
      <Card padding="sm">
        <EmptyState
          icon="inbox"
          title="Inbox gol"
          description="Nu ai niciun referat care așteaptă aprobarea ta. Bună treabă!"
          actions={
            <ButtonLink href="/referate/nou" variant="secondary" iconLeft={<Icon name="file-plus-2" />}>
              Creează un referat
            </ButtonLink>
          }
        />
      </Card>
    );

  const trimisePanel = (
    <Card padding="sm">
      <EmptyState
        icon="send"
        title="Niciun referat trimis"
        description="Referatele inițiate de tine apar în „Toate referatele”, cu statusul lor curent."
        actions={
          <ButtonLink href="/" variant="secondary" iconLeft={<Icon name="files" />}>
            Vezi toate referatele
          </ButtonLink>
        }
      />
    </Card>
  );

  return (
    <div className="avi-screen">
      <PageHead title="Inboxul meu" sub="Referate care așteaptă aprobarea ta." />
      <Tabs
        items={[
          { value: "asteptare", label: "În așteptare", trailing: <CountBadge count={tasks.length} /> },
          { value: "trimise", label: "Trimise de mine" },
        ]}
        panels={{ asteptare: waitingPanel, trimise: trimisePanel }}
      />
    </div>
  );
}

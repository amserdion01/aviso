import { requireUser } from "@/lib/session";
import { myDelegations, selectableUsers } from "@/db/queries";
import { DelegationForm } from "@/components/delegation-form";
import { CAPABILITY_LABELS } from "@/lib/labels";
import {
  PageHead,
  Card,
  Table,
  Avatar,
  Badge,
  StatusBadge,
  EmptyState,
  type Column,
} from "@/components/ui/primitives";

const fmtDate = (d: Date) => new Intl.DateTimeFormat("ro-RO").format(d);

type Del = Awaited<ReturnType<typeof myDelegations>>[number];

export default async function DelegariPage() {
  const user = await requireUser();
  const [list, users] = await Promise.all([myDelegations(user.id), selectableUsers(user.id)]);

  const columns: Column<Del>[] = [
    {
      key: "inlocuitor",
      header: "Înlocuitor",
      render: (d) => (
        <div className="avi-cell-user">
          <Avatar name={d.delegateName} size="sm" />
          <div className="avi-cell-user__nm">{d.delegateName}</div>
        </div>
      ),
    },
    { key: "capability", header: "Capabilitate", render: (d) => <Badge variant="outline">{d.capability ? (CAPABILITY_LABELS[d.capability] ?? d.capability) : "Toate"}</Badge> },
    { key: "perioada", header: "Perioada", render: (d) => <span className="avi-cell-mono">{fmtDate(d.startsAt)} – {fmtDate(d.endsAt)}</span> },
    { key: "status", header: "Status", render: (d) => <StatusBadge status={d.active ? "approved" : "neutral"} label={d.active ? "Activă" : "Inactivă"} size="sm" /> },
  ];

  return (
    <div className="avi-screen avi-screen--narrow">
      <PageHead title="Delegări / înlocuitori" sub="Desemnează un înlocuitor care îți preia taskurile pe o perioadă (concediu etc.)." />

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <Card title="Adaugă înlocuitor" subtitle="Aprobatorul de rezervă preia sarcinile în perioada selectată." padding="lg">
          <DelegationForm users={users} capabilities={user.capabilities} submitLabel="Salvează delegarea" />
        </Card>

        {list.length === 0 ? (
          <Card padding="sm">
            <EmptyState icon="repeat" title="Nicio delegare" description="Delegările pe care le creezi vor apărea aici cu perioada și statusul lor." />
          </Card>
        ) : (
          <Table columns={columns} data={list} rowKey={(d) => d.id} />
        )}
      </div>
    </div>
  );
}

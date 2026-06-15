import { requireAdmin } from "@/lib/session";
import { allUsers, allDelegations, selectableUsers } from "@/db/queries";
import { DelegationForm } from "@/components/delegation-form";
import { UserActiveToggle } from "@/components/user-active-toggle";
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
import { Tabs } from "@/components/ui/tabs";

const fmtDate = (d: Date) => new Intl.DateTimeFormat("ro-RO").format(d);

type User = Awaited<ReturnType<typeof allUsers>>[number];
type Del = Awaited<ReturnType<typeof allDelegations>>[number];

export default async function AdminPage() {
  const me = await requireAdmin();
  const [users, delegari, pickUsers] = await Promise.all([allUsers(), allDelegations(), selectableUsers(me.id)]);

  const userCols: Column<User>[] = [
    {
      key: "name",
      header: "Utilizator",
      render: (u) => (
        <div className="avi-cell-user">
          <Avatar name={u.name} size="sm" />
          <div>
            <div className="avi-cell-user__nm">{u.name}</div>
            <div className="avi-cell-user__id">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "roles",
      header: "Roluri în traseu",
      render: (u) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
          {u.capabilities.length ? (
            u.capabilities.map((c) => <Badge key={c} variant={c.startsWith("director") ? "accent" : "default"}>{CAPABILITY_LABELS[c] ?? c}</Badge>)
          ) : (
            <span className="avi-cell-muted">—</span>
          )}
        </div>
      ),
    },
    { key: "dept", header: "Departament", render: (u) => <span className="avi-cell-muted">{u.deptName ?? "—"}</span> },
    { key: "active", header: "Activ", align: "center", render: (u) => <UserActiveToggle userId={u.id} active={u.active} /> },
  ];

  const delCols: Column<Del>[] = [
    {
      key: "titular",
      header: "Titular",
      render: (d) => (
        <div className="avi-cell-user">
          <Avatar name={d.titular} size="sm" />
          <div className="avi-cell-user__nm">{d.titular}</div>
        </div>
      ),
    },
    { key: "rol", header: "Capabilitate", render: (d) => <Badge variant="outline">{d.capability ? (CAPABILITY_LABELS[d.capability] ?? d.capability) : "Toate"}</Badge> },
    {
      key: "inlocuitor",
      header: "Înlocuitor",
      render: (d) => (
        <div className="avi-cell-user">
          <Avatar name={d.inlocuitor} size="sm" />
          <div className="avi-cell-user__nm">{d.inlocuitor}</div>
        </div>
      ),
    },
    { key: "perioada", header: "Perioada", render: (d) => <span className="avi-cell-mono">{fmtDate(d.startsAt)} – {fmtDate(d.endsAt)}</span> },
    { key: "status", header: "Status", render: (d) => <StatusBadge status={d.active ? "approved" : "neutral"} label={d.active ? "Activă" : "Inactivă"} size="sm" /> },
  ];

  const usersPanel = <Table columns={userCols} data={users} rowKey={(u) => u.id} />;

  const delegariPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <Card title="Adaugă înlocuitor" subtitle="Aprobatorul de rezervă preia sarcinile în perioada selectată." padding="lg">
        <DelegationForm users={pickUsers} capabilities={me.capabilities} submitLabel="Salvează delegarea" />
      </Card>
      {delegari.length === 0 ? (
        <Card padding="sm">
          <EmptyState icon="repeat" title="Nicio delegare configurată" description="Delegările active și programate vor apărea aici." />
        </Card>
      ) : (
        <Table columns={delCols} data={delegari} rowKey={(d) => d.id} />
      )}
    </div>
  );

  return (
    <div className="avi-screen">
      <PageHead title="Administrare" sub="Gestionează utilizatorii, rolurile din traseu și înlocuitorii." />
      <Tabs
        items={[
          { value: "utilizatori", label: "Utilizatori & roluri" },
          { value: "delegari", label: "Delegări / înlocuitori" },
        ]}
        panels={{ utilizatori: usersPanel, delegari: delegariPanel }}
      />
    </div>
  );
}

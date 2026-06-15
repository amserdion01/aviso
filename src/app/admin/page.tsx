import { requireAdmin } from "@/lib/session";
import { allUsers, allDelegations, selectableUsers, allOrgUnits, allWorkflows, stepsForWorkflow } from "@/db/queries";
import { DelegationForm } from "@/components/delegation-form";
import { UsersAdmin } from "@/components/users-admin";
import { WorkflowAdmin, type WorkflowStep } from "@/components/workflow-admin";
import { CAPABILITY_LABELS } from "@/lib/labels";
import { PageHead, Card, Table, Avatar, Badge, StatusBadge, EmptyState, type Column } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";

import { formatDate as fmtDate } from "@/lib/format";

type Del = Awaited<ReturnType<typeof allDelegations>>[number];

export default async function AdminPage() {
  const me = await requireAdmin();
  const [users, delegari, pickUsers, orgUnits, workflows] = await Promise.all([
    allUsers(),
    allDelegations(),
    selectableUsers(me.id),
    allOrgUnits(),
    allWorkflows(),
  ]);

  const stepLists = await Promise.all(workflows.map((w) => stepsForWorkflow(w.id)));
  const stepsByWorkflow: Record<string, WorkflowStep[]> = {};
  workflows.forEach((w, i) => {
    stepsByWorkflow[w.id] = stepLists[i];
  });

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

  const usersPanel = <UsersAdmin users={users} orgUnits={orgUnits} />;

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
      <PageHead title="Administrare" sub="Gestionează utilizatorii, rolurile din traseu, înlocuitorii și fluxul de avizare." />
      <Tabs
        items={[
          { value: "utilizatori", label: "Utilizatori & roluri" },
          { value: "delegari", label: "Delegări / înlocuitori" },
          { value: "flux", label: "Flux de avizare" },
        ]}
        panels={{ utilizatori: usersPanel, delegari: delegariPanel, flux: <WorkflowAdmin workflows={workflows} stepsByWorkflow={stepsByWorkflow} /> }}
      />
    </div>
  );
}

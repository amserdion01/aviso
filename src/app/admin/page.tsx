import { requireAdmin } from "@/lib/session";
import { allUsers, allDelegations, selectableUsers, allOrgUnits, allWorkflows, stepsForWorkflow } from "@/db/queries";
import { DelegationForm } from "@/components/delegation-form";
import { UsersAdmin } from "@/components/users-admin";
import { WorkflowAdmin, type WorkflowStep } from "@/components/workflow-admin";
import { capabilityLabel } from "@/lib/labels";
import { PageHead, Card, Table, Avatar, Badge, StatusBadge, EmptyState, type Column } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/locale";

import { formatDate as fmtDate } from "@/lib/format";

type Del = Awaited<ReturnType<typeof allDelegations>>[number];

export default async function AdminPage() {
  const me = await requireAdmin();
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
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
      header: t("admin.delegations.columns.titular"),
      render: (d) => (
        <div className="avi-cell-user">
          <Avatar name={d.titular} size="sm" />
          <div className="avi-cell-user__nm">{d.titular}</div>
        </div>
      ),
    },
    { key: "rol", header: t("admin.delegations.columns.capability"), render: (d) => <Badge variant="outline">{d.capability ? capabilityLabel(d.capability, locale) : t("common.all")}</Badge> },
    {
      key: "inlocuitor",
      header: t("admin.delegations.columns.inlocuitor"),
      render: (d) => (
        <div className="avi-cell-user">
          <Avatar name={d.inlocuitor} size="sm" />
          <div className="avi-cell-user__nm">{d.inlocuitor}</div>
        </div>
      ),
    },
    { key: "perioada", header: t("admin.delegations.columns.perioada"), render: (d) => <span className="avi-cell-mono">{fmtDate(d.startsAt, locale)} – {fmtDate(d.endsAt, locale)}</span> },
    { key: "status", header: t("common.status"), render: (d) => <StatusBadge status={d.active ? "approved" : "neutral"} label={d.active ? t("common.activeF") : t("common.inactiveF")} size="sm" /> },
  ];

  const usersPanel = <UsersAdmin users={users} orgUnits={orgUnits} />;

  const delegariPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <Card title={t("admin.delegations.addTitle")} subtitle={t("admin.delegations.addSubtitle")} padding="lg">
        <DelegationForm users={pickUsers} capabilities={me.capabilities} submitLabel={t("admin.delegations.submitLabel")} />
      </Card>
      {delegari.length === 0 ? (
        <Card padding="sm">
          <EmptyState icon="repeat" title={t("admin.delegations.emptyTitle")} description={t("admin.delegations.emptyDescription")} />
        </Card>
      ) : (
        <Table columns={delCols} data={delegari} rowKey={(d) => d.id} />
      )}
    </div>
  );

  return (
    <div className="avi-screen">
      <PageHead title={t("admin.title")} sub={t("admin.sub")} />
      <Tabs
        items={[
          { value: "utilizatori", label: t("admin.tabs.users") },
          { value: "delegari", label: t("admin.tabs.delegations") },
          { value: "flux", label: t("admin.tabs.workflow") },
        ]}
        panels={{ utilizatori: usersPanel, delegari: delegariPanel, flux: <WorkflowAdmin workflows={workflows} stepsByWorkflow={stepsByWorkflow} /> }}
      />
    </div>
  );
}

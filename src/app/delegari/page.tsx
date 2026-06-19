import { requireUser } from "@/lib/session";
import { myDelegations, selectableUsers } from "@/db/queries";
import { DelegationForm } from "@/components/delegation-form";
import { capabilityLabel } from "@/lib/labels";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
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

import { formatDate as fmtDate } from "@/lib/format";

type Del = Awaited<ReturnType<typeof myDelegations>>[number];

export default async function DelegariPage() {
  const user = await requireUser();
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const [list, users] = await Promise.all([myDelegations(user.id), selectableUsers(user.id)]);

  const columns: Column<Del>[] = [
    {
      key: "inlocuitor",
      header: t("delegations.columns.inlocuitor"),
      render: (d) => (
        <div className="avi-cell-user">
          <Avatar name={d.delegateName} size="sm" />
          <div className="avi-cell-user__nm">{d.delegateName}</div>
        </div>
      ),
    },
    { key: "capability", header: t("delegations.columns.capability"), render: (d) => <Badge variant="outline">{d.capability ? capabilityLabel(d.capability, locale) : t("common.all")}</Badge> },
    { key: "perioada", header: t("delegations.columns.perioada"), render: (d) => <span className="avi-cell-mono">{fmtDate(d.startsAt, locale)} – {fmtDate(d.endsAt, locale)}</span> },
    { key: "status", header: t("common.status"), render: (d) => <StatusBadge status={d.active ? "approved" : "neutral"} label={d.active ? t("common.activeF") : t("common.inactiveF")} size="sm" /> },
  ];

  return (
    <div className="avi-screen avi-screen--narrow">
      <PageHead title={t("delegations.title")} sub={t("delegations.sub")} />

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <Card title={t("delegations.addTitle")} subtitle={t("delegations.addSubtitle")} padding="lg">
          <DelegationForm users={users} capabilities={user.capabilities} submitLabel={t("delegations.submitLabel")} />
        </Card>

        {list.length === 0 ? (
          <Card padding="sm">
            <EmptyState icon="repeat" title={t("delegations.emptyTitle")} description={t("delegations.emptyDescription")} />
          </Card>
        ) : (
          <Table columns={columns} data={list} rowKey={(d) => d.id} />
        )}
      </div>
    </div>
  );
}

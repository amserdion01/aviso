import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import { requireUser } from "@/lib/session";
import { finalizedRequisitions } from "@/db/queries";
import { formatLei } from "@/lib/labels";
import {
  PageHead,
  Table,
  Avatar,
  Badge,
  StatusBadge,
  ButtonLink,
  EmptyState,
  Card,
  type Column,
} from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

import { formatDate } from "@/lib/format";

type Row = Awaited<ReturnType<typeof finalizedRequisitions>>[number];

export default async function AchizitiiPage() {
  await requireUser();
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const items = await finalizedRequisitions();

  const fmtDate = (d: Date | null) => (d ? formatDate(d, locale) : t("common.none"));

  const totalValue = items.reduce((sum, r) => sum + (r.estimatedValueMinor ?? 0), 0);
  const totalQty = items.reduce((sum, r) => sum + r.quantity, 0);

  const columns: Column<Row>[] = [
    { key: "id", header: t("procurement.table.referat"), render: (r) => <span className="avi-cell-mono avi-cell-strong">#{r.id.slice(0, 8)}</span> },
    {
      key: "articol",
      header: t("procurement.table.item"),
      render: (r) => (
        <div>
          <div className="avi-cell-strong">{r.item}</div>
          <div className="avi-cell-muted">{r.quantity} {t("common.pieces")}</div>
        </div>
      ),
    },
    { key: "centru", header: t("procurement.table.costCenter"), render: (r) => <Badge variant="outline" icon={<Icon name="building-2" />}>{r.costCenter}</Badge> },
    {
      key: "solicitant",
      header: t("procurement.table.requester"),
      render: (r) => (
        <div className="avi-cell-user">
          <Avatar name={r.requesterName} size="sm" />
          <div className="avi-cell-user__nm">{r.requesterName}</div>
        </div>
      ),
    },
    { key: "valoare", header: t("procurement.table.estimatedValue"), align: "right", render: (r) => <span className="avi-cell-mono avi-cell-strong">{formatLei(r.estimatedValueMinor, locale)}</span> },
    { key: "approvedAt", header: t("procurement.table.approvedAt"), render: (r) => <span className="avi-cell-mono">{fmtDate(r.approvedAt)}</span> },
    { key: "status", header: t("common.status"), render: () => <StatusBadge status="finalized" size="sm" /> },
    {
      key: "act",
      header: "",
      align: "right",
      render: (r) => (
        <ButtonLink href={`/referate/${r.id}/pdf`} size="sm" variant="secondary" iconLeft={<Icon name="download" />} target="_blank" rel="noopener noreferrer">
          PDF
        </ButtonLink>
      ),
    },
  ];

  return (
    <div className="avi-screen">
      <PageHead title={t("procurement.title")} sub={t("procurement.sub")} />

      <div className="avi-stats">
        <div className="avi-stat">
          <div className="avi-stat__ico" style={{ background: "var(--teal-50)", color: "var(--teal-600)" }}><Icon name="check-check" /></div>
          <div>
            <div className="avi-stat__n">{items.length}</div>
            <div className="avi-stat__l">{t("procurement.stats.readyForProcurement")}</div>
          </div>
        </div>
        <div className="avi-stat">
          <div className="avi-stat__ico" style={{ background: "var(--blue-50)", color: "var(--blue-600)" }}><Icon name="banknote" /></div>
          <div>
            <div className="avi-stat__n">{formatLei(totalValue, locale)}</div>
            <div className="avi-stat__l">{t("procurement.stats.estimatedValue")}</div>
          </div>
        </div>
        <div className="avi-stat">
          <div className="avi-stat__ico" style={{ background: "var(--amber-50)", color: "var(--amber-600)" }}><Icon name="package" /></div>
          <div>
            <div className="avi-stat__n">{totalQty}</div>
            <div className="avi-stat__l">{t("procurement.stats.totalItems")}</div>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <Card padding="sm">
          <EmptyState
            icon="shopping-cart"
            title={t("procurement.empty.title")}
            description={t("procurement.empty.description")}
          />
        </Card>
      ) : (
        <Table columns={columns} data={items} rowKey={(r) => r.id} />
      )}
    </div>
  );
}

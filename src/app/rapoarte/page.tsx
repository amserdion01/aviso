import { getTranslations, getLocale } from "next-intl/server";
import { intlLocale, type Locale } from "@/i18n/locale";
import { requireUser } from "@/lib/session";
import { reportsData } from "@/db/queries";
import { taskTypeLabel, formatLei } from "@/lib/labels";
import { PageHead, Card, Table, StatusBadge, Badge, EmptyState, type Column } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

type StepRow = { taskType: string; n: number };
type SpendRow = { costCenter: string; total: number };

export default async function RapoartePage() {
  await requireUser();
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const data = await reportsData();

  const fmtDays = (d: number) =>
    d > 0 ? t("reports.days", { value: d.toLocaleString(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }) : t("common.none");

  const stepCols: Column<StepRow>[] = [
    { key: "pas", header: t("reports.queueByStep.stepHeader"), render: (r) => <span className="avi-cell-strong">{taskTypeLabel(r.taskType, locale)}</span> },
    { key: "n", header: t("reports.queueByStep.countHeader"), align: "right", render: (r) => <span className="avi-cell-mono avi-cell-strong">{r.n}</span> },
  ];

  const spendCols: Column<SpendRow>[] = [
    { key: "cc", header: t("reports.spend.costCenterHeader"), render: (r) => <Badge variant="outline" icon={<Icon name="building-2" />}>{r.costCenter}</Badge> },
    { key: "total", header: t("reports.spend.valueHeader"), align: "right", render: (r) => <span className="avi-cell-mono avi-cell-strong">{formatLei(r.total, locale)}</span> },
  ];

  const statusRows: Array<{ tone: "pending" | "finalized" | "rejected"; label: string; n: number }> = [
    { tone: "pending", label: t("reports.statusGroups.inProgress"), n: data.byStatus.in_progress ?? 0 },
    { tone: "finalized", label: t("reports.statusGroups.finalized"), n: data.byStatus.approved ?? 0 },
    { tone: "rejected", label: t("reports.statusGroups.rejected"), n: data.byStatus.rejected ?? 0 },
  ];

  return (
    <div className="avi-screen">
      <PageHead title={t("reports.title")} sub={t("reports.sub")} />

      <div className="avi-stats avi-stats--4">
        <div className="avi-stat">
          <div className="avi-stat__ico" style={{ background: "var(--gray-100)", color: "var(--gray-600)" }}><Icon name="files" /></div>
          <div><div className="avi-stat__n">{data.total}</div><div className="avi-stat__l">{t("reports.stats.totalReferate")}</div></div>
        </div>
        <div className="avi-stat">
          <div className="avi-stat__ico" style={{ background: "var(--teal-50)", color: "var(--teal-600)" }}><Icon name="check-check" /></div>
          <div><div className="avi-stat__n">{data.finalizedCount}</div><div className="avi-stat__l">{t("reports.stats.finalized")}</div></div>
        </div>
        <div className="avi-stat">
          <div className="avi-stat__ico" style={{ background: "var(--blue-50)", color: "var(--blue-600)" }}><Icon name="banknote" /></div>
          <div><div className="avi-stat__n">{formatLei(data.totalValue, locale)}</div><div className="avi-stat__l">{t("reports.stats.finalizedValue")}</div></div>
        </div>
        <div className="avi-stat">
          <div className="avi-stat__ico" style={{ background: "var(--amber-50)", color: "var(--amber-600)" }}><Icon name="clock" /></div>
          <div><div className="avi-stat__n">{fmtDays(data.avgDays)}</div><div className="avi-stat__l">{t("reports.stats.avgTime")}</div></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-7)", alignItems: "start" }}>
        <Card title={t("reports.statusDistribution")} padding="lg">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {statusRows.map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <StatusBadge status={s.tone} label={s.label} />
                <span className="avi-cell-mono avi-cell-strong">{s.n}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title={t("reports.queueByStep.title")} subtitle={t("reports.queueByStep.subtitle")} padding="lg">
          {data.waitingByStep.length === 0 ? (
            <EmptyState icon="check-check" title={t("reports.queueByStep.emptyTitle")} description={t("reports.queueByStep.emptyDescription")} />
          ) : (
            <Table columns={stepCols} data={data.waitingByStep} rowKey={(r) => r.taskType} />
          )}
        </Card>
      </div>

      <div style={{ height: "var(--space-7)" }} />

      <Card title={t("reports.spend.title")} subtitle={t("reports.spend.subtitle")} padding="lg">
        {data.spendByCostCenter.length === 0 ? (
          <EmptyState icon="banknote" title={t("reports.spend.emptyTitle")} description={t("reports.spend.emptyDescription")} />
        ) : (
          <Table columns={spendCols} data={data.spendByCostCenter} rowKey={(r) => r.costCenter} />
        )}
      </Card>
    </div>
  );
}

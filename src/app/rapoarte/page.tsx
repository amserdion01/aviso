import { requireUser } from "@/lib/session";
import { reportsData } from "@/db/queries";
import { TASK_TYPE_LABELS, formatLei } from "@/lib/labels";
import { PageHead, Card, Table, StatusBadge, Badge, EmptyState, type Column } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

const fmtDays = (d: number) => (d > 0 ? `${d.toFixed(1).replace(".", ",")} zile` : "—");

type StepRow = { taskType: string; n: number };
type SpendRow = { costCenter: string; total: number };

export default async function RapoartePage() {
  await requireUser();
  const data = await reportsData();

  const stepCols: Column<StepRow>[] = [
    { key: "pas", header: "Pas", render: (r) => <span className="avi-cell-strong">{TASK_TYPE_LABELS[r.taskType] ?? r.taskType}</span> },
    { key: "n", header: "Referate", align: "right", render: (r) => <span className="avi-cell-mono avi-cell-strong">{r.n}</span> },
  ];

  const spendCols: Column<SpendRow>[] = [
    { key: "cc", header: "Centru de cost", render: (r) => <Badge variant="outline" icon={<Icon name="building-2" />}>{r.costCenter}</Badge> },
    { key: "total", header: "Valoare estimată", align: "right", render: (r) => <span className="avi-cell-mono avi-cell-strong">{formatLei(r.total)}</span> },
  ];

  const statusRows: Array<{ tone: "pending" | "finalized" | "rejected"; label: string; n: number }> = [
    { tone: "pending", label: "În curs", n: data.byStatus.in_progress ?? 0 },
    { tone: "finalized", label: "Finalizate", n: data.byStatus.approved ?? 0 },
    { tone: "rejected", label: "Respinse", n: data.byStatus.rejected ?? 0 },
  ];

  return (
    <div className="avi-screen">
      <PageHead title="Rapoarte" sub="Indicatori despre fluxul de avizare al referatelor." />

      <div className="avi-stats avi-stats--4">
        <div className="avi-stat">
          <div className="avi-stat__ico" style={{ background: "var(--gray-100)", color: "var(--gray-600)" }}><Icon name="files" /></div>
          <div><div className="avi-stat__n">{data.total}</div><div className="avi-stat__l">Total referate</div></div>
        </div>
        <div className="avi-stat">
          <div className="avi-stat__ico" style={{ background: "var(--teal-50)", color: "var(--teal-600)" }}><Icon name="check-check" /></div>
          <div><div className="avi-stat__n">{data.finalizedCount}</div><div className="avi-stat__l">Finalizate</div></div>
        </div>
        <div className="avi-stat">
          <div className="avi-stat__ico" style={{ background: "var(--blue-50)", color: "var(--blue-600)" }}><Icon name="banknote" /></div>
          <div><div className="avi-stat__n">{formatLei(data.totalValue)}</div><div className="avi-stat__l">Valoare finalizată</div></div>
        </div>
        <div className="avi-stat">
          <div className="avi-stat__ico" style={{ background: "var(--amber-50)", color: "var(--amber-600)" }}><Icon name="clock" /></div>
          <div><div className="avi-stat__n">{fmtDays(data.avgDays)}</div><div className="avi-stat__l">Timp mediu avizare</div></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-7)", alignItems: "start" }}>
        <Card title="Distribuție pe status" padding="lg">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {statusRows.map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <StatusBadge status={s.tone} label={s.label} />
                <span className="avi-cell-mono avi-cell-strong">{s.n}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Coadă pe pas" subtitle="Referate care așteaptă acum la fiecare pas" padding="lg">
          {data.waitingByStep.length === 0 ? (
            <EmptyState icon="check-check" title="Nicio coadă" description="Niciun referat nu așteaptă aprobare în acest moment." />
          ) : (
            <Table columns={stepCols} data={data.waitingByStep} rowKey={(r) => r.taskType} />
          )}
        </Card>
      </div>

      <div style={{ height: "var(--space-7)" }} />

      <Card title="Cheltuieli pe centru de cost" subtitle="Valoarea estimată a referatelor finalizate" padding="lg">
        {data.spendByCostCenter.length === 0 ? (
          <EmptyState icon="banknote" title="Niciun referat finalizat" description="Cheltuielile vor apărea aici după primele referate avizate complet." />
        ) : (
          <Table columns={spendCols} data={data.spendByCostCenter} rowKey={(r) => r.costCenter} />
        )}
      </Card>
    </div>
  );
}

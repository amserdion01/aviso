import Link from "next/link";
import { requireUser } from "@/lib/session";
import { searchRequisitions } from "@/db/queries";
import {
  PageHead,
  Card,
  Table,
  Avatar,
  Badge,
  StatusBadge,
  Button,
  Input,
  EmptyState,
  type Column,
} from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

const fmtDate = (d: Date) => new Intl.DateTimeFormat("ro-RO").format(d);

type Row = Awaited<ReturnType<typeof searchRequisitions>>[number];

const GROUPS: Array<{ status: string; tone: "pending" | "finalized" | "rejected"; label: string }> = [
  { status: "in_progress", tone: "pending", label: "În curs" },
  { status: "approved", tone: "finalized", label: "Finalizate" },
  { status: "rejected", tone: "rejected", label: "Respinse" },
];

function columns(): Column<Row>[] {
  return [
    { key: "id", header: "Referat", render: (r) => <Link href={`/referate/${r.id}`} className="avi-cell-mono avi-cell-strong avi-link">#{r.id.slice(0, 8)}</Link> },
    {
      key: "item",
      header: "Articol",
      render: (r) => (
        <div>
          <div className="avi-cell-strong">{r.item}</div>
          <div className="avi-cell-muted">{r.quantity} buc.</div>
        </div>
      ),
    },
    {
      key: "solicitant",
      header: "Solicitant",
      render: (r) => (
        <div className="avi-cell-user">
          <Avatar name={r.requesterName} size="sm" />
          <div className="avi-cell-user__nm">{r.requesterName}</div>
        </div>
      ),
    },
    { key: "centru", header: "Centru de cost", render: (r) => <Badge variant="outline" icon={<Icon name="building-2" />}>{r.costCenter}</Badge> },
    { key: "createdAt", header: "Creat", render: (r) => <span className="avi-cell-mono">{fmtDate(r.createdAt)}</span> },
  ];
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? await searchRequisitions(user.id, query) : [];
  const cols = columns();

  return (
    <div className="avi-screen">
      <PageHead title="Căutare" sub="Caută în referatele tale și în cele care îți sunt repartizate." />

      <form action="/cauta" style={{ display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-8)", maxWidth: 640 }}>
        <Input name="q" defaultValue={query} prefix={<Icon name="search" />} placeholder="Articol, centru de cost, solicitant sau ID referat…" aria-label="Caută" />
        <Button type="submit" variant="primary">Caută</Button>
      </form>

      {!query ? (
        <Card padding="sm">
          <EmptyState icon="search" title="Caută referate" description="Introdu un termen pentru a căuta după articol, centru de cost, solicitant sau ID." />
        </Card>
      ) : results.length === 0 ? (
        <Card padding="sm">
          <EmptyState icon="search" title="Niciun rezultat" description={`Niciun referat nu corespunde căutării „${query}”.`} />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-7)" }}>
          {GROUPS.map((g) => {
            const rows = results.filter((r) => r.status === g.status);
            if (rows.length === 0) return null;
            return (
              <Card
                key={g.status}
                padding="lg"
                title={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-4)" }}>
                    <StatusBadge status={g.tone} label={g.label} size="sm" /> {rows.length}
                  </span>
                }
              >
                <Table columns={cols} data={rows} rowKey={(r) => r.id} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

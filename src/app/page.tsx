import Link from "next/link";
import { requireUser } from "@/lib/session";
import { myRequisitions } from "@/db/queries";
import { requisitionStatusBadge } from "@/lib/labels";
import {
  PageHead,
  ButtonLink,
  Table,
  Badge,
  StatusBadge,
  EmptyState,
  Card,
  type Column,
} from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

const fmtDate = (d: Date) => new Intl.DateTimeFormat("ro-RO").format(d);

type Row = Awaited<ReturnType<typeof myRequisitions>>[number];

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const all = await myRequisitions(user.id);
  const mine = query
    ? all.filter((r) => {
        const hay = `${r.item} ${r.costCenter} ${r.id}`.toLowerCase();
        return hay.includes(query.toLowerCase());
      })
    : all;

  const columns: Column<Row>[] = [
    {
      key: "id",
      header: "Referat",
      render: (r) => (
        <Link href={`/referate/${r.id}`} className="avi-cell-mono avi-cell-strong avi-link">
          #{r.id.slice(0, 8)}
        </Link>
      ),
    },
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
      key: "costCenter",
      header: "Centru de cost",
      render: (r) => <Badge variant="outline" icon={<Icon name="building-2" />}>{r.costCenter}</Badge>,
    },
    { key: "createdAt", header: "Creat", render: (r) => <span className="avi-cell-mono">{fmtDate(r.createdAt)}</span> },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const b = requisitionStatusBadge(r.status);
        return <StatusBadge status={b.tone} label={b.label} size="sm" />;
      },
    },
  ];

  return (
    <div className="avi-screen">
      <PageHead
        title="Toate referatele"
        sub={query ? `Rezultate pentru „${query}” — ${mine.length} referat(e).` : "Referatele inițiate de tine și starea lor curentă."}
      >
        <ButtonLink href="/referate/nou" variant="primary" iconLeft={<Icon name="file-plus-2" />}>
          Referat nou
        </ButtonLink>
      </PageHead>

      {mine.length === 0 ? (
        <Card padding="sm">
          {query ? (
            <EmptyState
              icon="search"
              title="Niciun rezultat"
              description={`Niciun referat nu corespunde căutării „${query}”.`}
              actions={
                <ButtonLink href="/" variant="secondary" iconLeft={<Icon name="files" />}>
                  Vezi toate referatele
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState
              icon="files"
              title="Niciun referat încă"
              description="Referatele pe care le inițiezi vor apărea aici, cu statusul lor pe traseul de avizare."
              actions={
                <ButtonLink href="/referate/nou" variant="secondary" iconLeft={<Icon name="file-plus-2" />}>
                  Creează un referat
                </ButtonLink>
              }
            />
          )}
        </Card>
      ) : (
        <Table columns={columns} data={mine} rowKey={(r) => r.id} />
      )}
    </div>
  );
}

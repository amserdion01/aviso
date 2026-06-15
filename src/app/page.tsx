import Link from "next/link";
import { requireUser, canSeeAllRequisitions } from "@/lib/session";
import { myRequisitions, allRequisitions } from "@/db/queries";
import { requisitionStatusBadge } from "@/lib/labels";
import {
  PageHead,
  ButtonLink,
  Table,
  Avatar,
  Badge,
  StatusBadge,
  EmptyState,
  Card,
  type Column,
} from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { formatDate as fmtDate } from "@/lib/format";

interface Row {
  id: string;
  item: string;
  quantity: number;
  costCenter: string;
  status: string;
  createdAt: Date;
  requesterName: string;
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const seeAll = canSeeAllRequisitions(user);
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const source: Row[] = seeAll
    ? await allRequisitions()
    : (await myRequisitions(user.id)).map((r) => ({ ...r, requesterName: user.name }));
  const rows = query
    ? source.filter((r) => `${r.item} ${r.costCenter} ${r.id} ${r.requesterName}`.toLowerCase().includes(query.toLowerCase()))
    : source;

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
    ...(seeAll
      ? [
          {
            key: "solicitant",
            header: "Solicitant",
            render: (r: Row) => (
              <div className="avi-cell-user">
                <Avatar name={r.requesterName} size="sm" />
                <div className="avi-cell-user__nm">{r.requesterName}</div>
              </div>
            ),
          },
        ]
      : []),
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

  const baseSub = seeAll
    ? "Toate referatele din sistem și starea lor curentă."
    : "Referatele inițiate de tine și starea lor curentă.";

  return (
    <div className="avi-screen">
      <PageHead title="Toate referatele" sub={query ? `Rezultate pentru „${query}” — ${rows.length} referat(e).` : baseSub}>
        <ButtonLink href="/referate/nou" variant="primary" iconLeft={<Icon name="file-plus-2" />}>
          Referat nou
        </ButtonLink>
      </PageHead>

      {rows.length === 0 ? (
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
              title={seeAll ? "Niciun referat în sistem" : "Niciun referat încă"}
              description={
                seeAll
                  ? "Când angajații trimit referate, vor apărea aici cu statusul lor pe traseul de avizare."
                  : "Referatele pe care le inițiezi vor apărea aici, cu statusul lor pe traseul de avizare."
              }
              actions={
                <ButtonLink href="/referate/nou" variant="secondary" iconLeft={<Icon name="file-plus-2" />}>
                  Creează un referat
                </ButtonLink>
              }
            />
          )}
        </Card>
      ) : (
        <Table columns={columns} data={rows} rowKey={(r) => r.id} />
      )}
    </div>
  );
}

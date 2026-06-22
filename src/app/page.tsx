import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import { requireUser, canSeeAllRequisitions } from "@/lib/session";
import { involvedRequisitions, allRequisitions } from "@/db/queries";
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
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const seeAll = canSeeAllRequisitions(user);
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const source: Row[] = seeAll ? await allRequisitions() : await involvedRequisitions(user.id);
  const rows = query
    ? source.filter((r) => `${r.item} ${r.costCenter} ${r.id} ${r.requesterName}`.toLowerCase().includes(query.toLowerCase()))
    : source;

  const columns: Column<Row>[] = [
    {
      key: "id",
      header: t("home.table.referat"),
      render: (r) => (
        <Link href={`/referate/${r.id}`} className="avi-cell-mono avi-cell-strong avi-link">
          #{r.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      key: "item",
      header: t("home.table.item"),
      render: (r) => (
        <div>
          <div className="avi-cell-strong">{r.item}</div>
          <div className="avi-cell-muted">{r.quantity} {t("common.pieces")}</div>
        </div>
      ),
    },
    {
      key: "solicitant",
      header: t("home.table.requester"),
      render: (r: Row) => (
        <div className="avi-cell-user">
          <Avatar name={r.requesterName} size="sm" />
          <div className="avi-cell-user__nm">{r.requesterName}</div>
        </div>
      ),
    },
    {
      key: "costCenter",
      header: t("home.table.costCenter"),
      render: (r) => <Badge variant="outline" icon={<Icon name="building-2" />}>{r.costCenter}</Badge>,
    },
    { key: "createdAt", header: t("home.table.createdAt"), render: (r) => <span className="avi-cell-mono">{fmtDate(r.createdAt, locale)}</span> },
    {
      key: "status",
      header: t("common.status"),
      render: (r) => {
        const b = requisitionStatusBadge(r.status, locale);
        return <StatusBadge status={b.tone} label={b.label} size="sm" />;
      },
    },
  ];

  const baseSub = seeAll ? t("home.subAll") : t("home.subMine");

  return (
    <div className="avi-screen">
      <PageHead title={t("home.title")} sub={query ? t("home.subResults", { query, count: rows.length }) : baseSub}>
        <ButtonLink href="/referate/nou" variant="primary" iconLeft={<Icon name="file-plus-2" />}>
          {t("home.newReferat")}
        </ButtonLink>
      </PageHead>

      {rows.length === 0 ? (
        <Card padding="sm">
          {query ? (
            <EmptyState
              icon="search"
              title={t("home.empty.noResultsTitle")}
              description={t("home.empty.noResultsDescription", { query })}
              actions={
                <ButtonLink href="/" variant="secondary" iconLeft={<Icon name="files" />}>
                  {t("home.empty.viewAll")}
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState
              icon="files"
              title={seeAll ? t("home.empty.noneAllTitle") : t("home.empty.noneMineTitle")}
              description={seeAll ? t("home.empty.noneAllDescription") : t("home.empty.noneMineDescription")}
              actions={
                <ButtonLink href="/referate/nou" variant="secondary" iconLeft={<Icon name="file-plus-2" />}>
                  {t("home.empty.create")}
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

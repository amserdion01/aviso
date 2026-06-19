import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
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

import { formatDate as fmtDate } from "@/lib/format";

type Row = Awaited<ReturnType<typeof searchRequisitions>>[number];

type T = Awaited<ReturnType<typeof getTranslations>>;

function columns(t: T, locale: Locale): Column<Row>[] {
  return [
    { key: "id", header: t("search.table.referat"), render: (r) => <Link href={`/referate/${r.id}`} className="avi-cell-mono avi-cell-strong avi-link">#{r.id.slice(0, 8)}</Link> },
    {
      key: "item",
      header: t("search.table.item"),
      render: (r) => (
        <div>
          <div className="avi-cell-strong">{r.item}</div>
          <div className="avi-cell-muted">{r.quantity} {t("common.pieces")}</div>
        </div>
      ),
    },
    {
      key: "solicitant",
      header: t("search.table.requester"),
      render: (r) => (
        <div className="avi-cell-user">
          <Avatar name={r.requesterName} size="sm" />
          <div className="avi-cell-user__nm">{r.requesterName}</div>
        </div>
      ),
    },
    { key: "centru", header: t("search.table.costCenter"), render: (r) => <Badge variant="outline" icon={<Icon name="building-2" />}>{r.costCenter}</Badge> },
    { key: "createdAt", header: t("search.table.createdAt"), render: (r) => <span className="avi-cell-mono">{fmtDate(r.createdAt, locale)}</span> },
  ];
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? await searchRequisitions(user.id, query) : [];
  const cols = columns(t, locale);

  const groups: Array<{ status: string; tone: "pending" | "finalized" | "rejected"; label: string }> = [
    { status: "in_progress", tone: "pending", label: t("search.groups.inProgress") },
    { status: "approved", tone: "finalized", label: t("search.groups.finalized") },
    { status: "rejected", tone: "rejected", label: t("search.groups.rejected") },
  ];

  return (
    <div className="avi-screen">
      <PageHead title={t("search.title")} sub={t("search.sub")} />

      <form action="/cauta" style={{ display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-8)", maxWidth: 640 }}>
        <Input name="q" defaultValue={query} prefix={<Icon name="search" />} placeholder={t("search.placeholder")} aria-label={t("search.ariaSearch")} />
        <Button type="submit" variant="primary">{t("common.search")}</Button>
      </form>

      {!query ? (
        <Card padding="sm">
          <EmptyState icon="search" title={t("search.promptTitle")} description={t("search.promptDescription")} />
        </Card>
      ) : results.length === 0 ? (
        <Card padding="sm">
          <EmptyState icon="search" title={t("search.noResultsTitle")} description={t("search.noResultsDescription", { query })} />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-7)" }}>
          {groups.map((g) => {
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

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

const fmtDate = (d: Date | null) => (d ? new Intl.DateTimeFormat("ro-RO").format(d) : "—");

type Row = Awaited<ReturnType<typeof finalizedRequisitions>>[number];

export default async function AchizitiiPage() {
  await requireUser();
  const items = await finalizedRequisitions();

  const totalValue = items.reduce((sum, r) => sum + (r.estimatedValueMinor ?? 0), 0);
  const totalQty = items.reduce((sum, r) => sum + r.quantity, 0);

  const columns: Column<Row>[] = [
    { key: "id", header: "Referat", render: (r) => <span className="avi-cell-mono avi-cell-strong">#{r.id.slice(0, 8)}</span> },
    {
      key: "articol",
      header: "Articol",
      render: (r) => (
        <div>
          <div className="avi-cell-strong">{r.item}</div>
          <div className="avi-cell-muted">{r.quantity} buc.</div>
        </div>
      ),
    },
    { key: "centru", header: "Centru de cost", render: (r) => <Badge variant="outline" icon={<Icon name="building-2" />}>{r.costCenter}</Badge> },
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
    { key: "valoare", header: "Valoare est.", align: "right", render: (r) => <span className="avi-cell-mono avi-cell-strong">{formatLei(r.estimatedValueMinor)}</span> },
    { key: "approvedAt", header: "Aprobat", render: (r) => <span className="avi-cell-mono">{fmtDate(r.approvedAt)}</span> },
    { key: "status", header: "Status", render: () => <StatusBadge status="finalized" size="sm" /> },
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
      <PageHead title="Achiziții" sub="Referate avizate complet, gata pentru procesul de achiziție." />

      <div className="avi-stats">
        <div className="avi-stat">
          <div className="avi-stat__ico" style={{ background: "var(--teal-50)", color: "var(--teal-600)" }}><Icon name="check-check" /></div>
          <div>
            <div className="avi-stat__n">{items.length}</div>
            <div className="avi-stat__l">Gata de achiziție</div>
          </div>
        </div>
        <div className="avi-stat">
          <div className="avi-stat__ico" style={{ background: "var(--blue-50)", color: "var(--blue-600)" }}><Icon name="banknote" /></div>
          <div>
            <div className="avi-stat__n">{formatLei(totalValue)}</div>
            <div className="avi-stat__l">Valoare estimată</div>
          </div>
        </div>
        <div className="avi-stat">
          <div className="avi-stat__ico" style={{ background: "var(--amber-50)", color: "var(--amber-600)" }}><Icon name="package" /></div>
          <div>
            <div className="avi-stat__n">{totalQty}</div>
            <div className="avi-stat__l">Articole totale</div>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <Card padding="sm">
          <EmptyState
            icon="shopping-cart"
            title="Niciun referat finalizat"
            description="Referatele avizate complet vor apărea aici, gata de descărcat ca PDF pentru achiziție."
          />
        </Card>
      ) : (
        <Table columns={columns} data={items} rowKey={(r) => r.id} />
      )}
    </div>
  );
}

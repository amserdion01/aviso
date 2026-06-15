import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, isAdmin } from "@/lib/session";
import { requisitionDetail, commentsFor, isInvolvedInRequisition } from "@/db/queries";
import { addCommentAction } from "@/app/actions";
import {
  TASK_TYPE_LABELS,
  PROCUREMENT_TYPE_LABELS,
  requisitionStatusBadge,
  formatLei,
} from "@/lib/labels";
import {
  Card,
  Stepper,
  StatusBadge,
  Avatar,
  Badge,
  Button,
  Textarea,
  AuditTimeline,
  type Step,
  type StepStatus,
  type AuditEvent,
  type AuditType,
} from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { ReferatActionPanel } from "@/components/referat-action-panel";

const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);

const TASK_STATUS_TO_STEP: Record<string, StepStatus> = {
  approved: "done",
  waiting: "current",
  pending: "pending",
  rejected: "rejected",
  sent_back: "sentback",
};

const ACTION_TO_AUDIT: Record<string, { type: AuditType; verb: string }> = {
  create: { type: "created", verb: "a creat referatul" },
  approve: { type: "approved", verb: "a aprobat" },
  reject: { type: "rejected", verb: "a respins" },
  send_back: { type: "sentback", verb: "a trimis înapoi" },
};

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="avi-meta__l">{label}</div>
      <div className="avi-meta__v">{children}</div>
    </div>
  );
}

export default async function ReferatDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { action } = await searchParams;
  // Only people involved in the referat (or admins) may view it; 404 otherwise
  // so we don't reveal that it exists.
  if (!isAdmin(user) && !(await isInvolvedInRequisition(user.id, id))) notFound();
  const detail = await requisitionDetail(id);
  if (!detail) notFound();
  const comments = await commentsFor(id);

  const { requisition: r, tasks, history, activeTask } = detail;
  const canAct = activeTask?.effectiveApproverId === user.id;
  const canSendBack = tasks.some((t) => activeTask && t.stepOrder < activeTask.stepOrder && t.status === "approved");
  const badge = requisitionStatusBadge(r.status);

  const steps: Step[] = tasks
    .filter((t) => t.status !== "skipped")
    .map((t) => {
      const status = TASK_STATUS_TO_STEP[t.status] ?? "pending";
      const sublabel =
        status === "done"
          ? t.actedAt
            ? fmtDateTime(t.actedAt).split(",")[0]
            : "Aprobat"
          : status === "current"
            ? "În lucru"
            : status === "sentback"
              ? "Retrimis"
              : "În așteptare";
      return { label: TASK_TYPE_LABELS[t.taskType] ?? t.taskType, sublabel, status };
    });

  const events: AuditEvent[] = history.map((h) => {
    const map = ACTION_TO_AUDIT[h.action] ?? { type: "comment" as AuditType, verb: h.action };
    return {
      type: map.type,
      actor: h.actorName,
      action: map.verb,
      time: fmtDateTime(h.createdAt),
      comment: h.comment ?? undefined,
    };
  });

  const initialMode =
    canAct && (action === "reject" || action === "send_back") ? (action as "reject" | "send_back") : null;

  return (
    <div className="avi-screen">
      <Link href="/inbox" className="avi-back">
        <Icon name="arrow-left" /> Înapoi la inbox
      </Link>

      <div className="avi-detail-head">
        <div>
          <div className="avi-detail-id">Referat #{r.id.slice(0, 8)}</div>
          <h1 className="avi-detail-title">{r.item}</h1>
          <div className="avi-detail-by">
            <Avatar name={r.requesterName} size="sm" />
            <span>
              Solicitat de <b>{r.requesterName}</b>
            </span>
            <span className="avi-dot-sep">·</span>
            <span className="avi-cell-mono">{fmtDateTime(r.createdAt)}</span>
          </div>
        </div>
        <StatusBadge status={badge.tone} label={badge.label} icon="icon" />
      </div>

      <div className="avi-detail-grid">
        <div className="avi-detail-main">
          <Card title="Traseu de avizare" subtitle="Pașii aplicabili acestui referat și starea fiecăruia" padding="lg">
            <Stepper steps={steps} orientation="vertical" />
          </Card>

          <Card title="Date referat" padding="lg">
            <div className="avi-meta-grid">
              <Meta label="Articol">{r.item}</Meta>
              <Meta label="Cantitate">
                <b>{r.quantity}</b> buc.
              </Meta>
              <Meta label="Centru de cost">
                <Badge variant="outline" icon={<Icon name="building-2" />}>{r.costCenter}</Badge>
              </Meta>
              <Meta label="Valoare estimată">{formatLei(r.estimatedValueMinor)}</Meta>
              {r.procurementType && (
                <Meta label="Tip achiziție">{PROCUREMENT_TYPE_LABELS[r.procurementType] ?? r.procurementType}</Meta>
              )}
              <Meta label="Avize">
                {[r.needsIt ? "IT" : null, r.needsSsm ? "SSM" : null].filter(Boolean).join(" · ") || "—"}
              </Meta>
              <div className="avi-col-2">
                <Meta label="Justificare">
                  <span className="avi-justif">{r.justification}</span>
                </Meta>
              </div>
            </div>
          </Card>

          <Card title="Istoric & audit" subtitle="Toate acțiunile, în ordine cronologică" padding="lg">
            <AuditTimeline events={events} />
          </Card>

          <Card title="Discuție" subtitle="Comentarii și observații pe acest referat" padding="lg">
            <div className="avi-comments">
              {comments.length === 0 ? (
                <p className="avi-comments__empty">Niciun comentariu încă. Începe discuția mai jos.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="avi-comment">
                    <Avatar name={c.authorName} size="sm" />
                    <div className="avi-comment__body">
                      <div className="avi-comment__head">
                        <span className="avi-comment__author">{c.authorName}</span>
                        <span className="avi-comment__time">{fmtDateTime(c.createdAt)}</span>
                      </div>
                      <div className="avi-comment__text">{c.body}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form action={addCommentAction} className="avi-comment-form">
              <input type="hidden" name="requisitionId" value={r.id} />
              <Textarea name="body" rows={3} required placeholder="Scrie un comentariu…" aria-label="Comentariu" />
              <div className="avi-comment-form__actions">
                <Button type="submit" variant="primary" iconLeft={<Icon name="send" />}>
                  Trimite comentariul
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <aside className="avi-detail-side">
          {canAct ? (
            <ReferatActionPanel
              requisitionId={r.id}
              stepLabel={activeTask ? (TASK_TYPE_LABELS[activeTask.taskType] ?? activeTask.taskType) : ""}
              needsClassification={activeTask?.taskType === "INCADRARE"}
              canSendBack={canSendBack}
              initialMode={initialMode}
              pdfHref={r.status === "approved" ? `/referate/${r.id}/pdf` : undefined}
            />
          ) : (
            <div className="avi-actionpanel">
              <div className="avi-actionpanel__readonly">
                <Icon name="lock" />
                <div>
                  <div className="avi-actionpanel__t">Doar vizualizare</div>
                  <div className="avi-actionpanel__d">Acest referat nu așteaptă o acțiune din partea ta.</div>
                </div>
              </div>
              {r.status === "approved" && (
                <div className="avi-actionpanel__foot">
                  <a className="avi-btn avi-btn--ghost avi-btn--sm" href={`/referate/${r.id}/pdf`} target="_blank" rel="noopener noreferrer">
                    <span className="avi-btn__ico"><Icon name="download" /></span>
                    <span>Descarcă PDF</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

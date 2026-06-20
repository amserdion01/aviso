import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, isAdmin } from "@/lib/session";
import { requisitionDetail, commentsFor, isInvolvedInRequisition } from "@/db/queries";
import { addCommentAction } from "@/app/actions";
import { getTranslations, getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import {
  taskTypeLabel,
  procurementLabel,
  docTypeLabel,
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

import { formatDateTime as fmtDateTime } from "@/lib/format";

const TASK_STATUS_TO_STEP: Record<string, StepStatus> = {
  approved: "done",
  waiting: "current",
  pending: "pending",
  rejected: "rejected",
  sent_back: "sentback",
};

const ACTION_AUDIT_TYPE: Record<string, AuditType> = {
  create: "created",
  approve: "approved",
  reject: "rejected",
  send_back: "sentback",
};

const ACTION_AUDIT_KEY: Record<string, string> = {
  create: "referatDetail.audit.create",
  approve: "referatDetail.audit.approve",
  reject: "referatDetail.audit.reject",
  send_back: "referatDetail.audit.sendBack",
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
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
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
  const badge = requisitionStatusBadge(r.status, locale);

  const steps: Step[] = tasks
    .filter((task) => task.status !== "skipped")
    .map((task) => {
      const status = TASK_STATUS_TO_STEP[task.status] ?? "pending";
      const sublabel =
        status === "done"
          ? task.actedAt
            ? fmtDateTime(task.actedAt, locale).split(",")[0]
            : t("referatDetail.stepper.approved")
          : status === "current"
            ? t("referatDetail.stepper.inProgress")
            : status === "sentback"
              ? t("referatDetail.stepper.resent")
              : t("referatDetail.stepper.waiting");
      return { label: taskTypeLabel(task.taskType, locale), sublabel, status };
    });

  const events: AuditEvent[] = history.map((h) => {
    const auditType = ACTION_AUDIT_TYPE[h.action] ?? ("comment" as AuditType);
    const auditKey = ACTION_AUDIT_KEY[h.action];
    return {
      type: auditType,
      actor: h.actorName,
      action: auditKey ? t(auditKey) : h.action,
      time: fmtDateTime(h.createdAt, locale),
      comment: h.comment ?? undefined,
    };
  });

  const initialMode =
    canAct && (action === "reject" || action === "send_back") ? (action as "reject" | "send_back") : null;

  return (
    <div className="avi-screen">
      <Link href="/inbox" className="avi-back">
        <Icon name="arrow-left" /> {t("referatDetail.backToInbox")}
      </Link>

      <div className="avi-detail-head">
        <div>
          <div className="avi-detail-id">{t("referatDetail.idLabel", { id: r.id.slice(0, 8) })}</div>
          <h1 className="avi-detail-title">{r.item}</h1>
          <div className="avi-detail-by">
            <Avatar name={r.requesterName} size="sm" />
            <span>
              {t("referatDetail.requestedBy")} <b>{r.requesterName}</b>
            </span>
            <span className="avi-dot-sep">·</span>
            <span className="avi-cell-mono">{fmtDateTime(r.createdAt, locale)}</span>
          </div>
        </div>
        <StatusBadge status={badge.tone} label={badge.label} icon="icon" />
      </div>

      <div className="avi-detail-grid">
        <div className="avi-detail-main">
          <Card title={t("referatDetail.stepper.title")} subtitle={t("referatDetail.stepper.subtitle")} padding="lg">
            <Stepper steps={steps} orientation="vertical" />
          </Card>

          <Card title={t("referatDetail.data.title")} padding="lg">
            <div className="avi-meta-grid">
              <Meta label={t("referatDetail.data.item")}>{r.item}</Meta>
              <Meta label={t("referatDetail.data.quantity")}>
                <b>{r.quantity}</b> {t("common.pieces")}
              </Meta>
              <Meta label={t("referatDetail.data.costCenter")}>
                <Badge variant="outline" icon={<Icon name="building-2" />}>{r.costCenter}</Badge>
              </Meta>
              <Meta label={t("referatDetail.data.estimatedValue")}>{formatLei(r.estimatedValueMinor, locale)}</Meta>
              {r.procurementType && (
                <Meta label={t("referatDetail.data.procurementType")}>{procurementLabel(r.procurementType, locale)}</Meta>
              )}
              <Meta label={t("referatDetail.data.docType")}>{docTypeLabel(r.docType, locale)}</Meta>
              <Meta label={t("referatDetail.data.inPaap")}>{r.inPaap ? t("common.yes") : t("common.no")}</Meta>
              {r.inSeapCatalog !== null && (
                <Meta label={t("referatDetail.data.inSeapCatalog")}>{r.inSeapCatalog ? t("common.yes") : t("common.no")}</Meta>
              )}
              {r.notaJustificativa && (
                <div className="avi-col-2">
                  <Meta label={t("referatDetail.data.nota")}>
                    <span className="avi-justif">{r.notaJustificativa}</span>
                  </Meta>
                </div>
              )}
              <div className="avi-col-2">
                <Meta label={t("referatDetail.data.justification")}>
                  <span className="avi-justif">{r.justification}</span>
                </Meta>
              </div>
            </div>
          </Card>

          <Card title={t("referatDetail.history.title")} subtitle={t("referatDetail.history.subtitle")} padding="lg">
            <AuditTimeline events={events} />
          </Card>

          <Card title={t("referatDetail.discussion.title")} subtitle={t("referatDetail.discussion.subtitle")} padding="lg">
            <div className="avi-comments">
              {comments.length === 0 ? (
                <p className="avi-comments__empty">{t("referatDetail.discussion.empty")}</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="avi-comment">
                    <Avatar name={c.authorName} size="sm" />
                    <div className="avi-comment__body">
                      <div className="avi-comment__head">
                        <span className="avi-comment__author">{c.authorName}</span>
                        <span className="avi-comment__time">{fmtDateTime(c.createdAt, locale)}</span>
                      </div>
                      <div className="avi-comment__text">{c.body}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form action={addCommentAction} className="avi-comment-form">
              <input type="hidden" name="requisitionId" value={r.id} />
              <Textarea name="body" rows={3} required placeholder={t("referatDetail.discussion.placeholder")} aria-label={t("referatDetail.discussion.ariaLabel")} />
              <div className="avi-comment-form__actions">
                <Button type="submit" variant="primary" iconLeft={<Icon name="send" />}>
                  {t("referatDetail.discussion.submit")}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <aside className="avi-detail-side">
          {canAct ? (
            <ReferatActionPanel
              requisitionId={r.id}
              stepLabel={activeTask ? taskTypeLabel(activeTask.taskType, locale) : ""}
              needsClassification={activeTask?.taskType === "INCADRARE"}
              needsValuation={activeTask?.taskType === "ACHIZITII_EVALUARE"}
              canSendBack={canSendBack}
              initialMode={initialMode}
              pdfHref={r.status === "approved" || r.status === "seap_initiated" ? `/referate/${r.id}/pdf` : undefined}
            />
          ) : (
            <div className="avi-actionpanel">
              <div className="avi-actionpanel__readonly">
                <Icon name="lock" />
                <div>
                  <div className="avi-actionpanel__t">{t("referatDetail.readonly.title")}</div>
                  <div className="avi-actionpanel__d">{t("referatDetail.readonly.description")}</div>
                </div>
              </div>
              {(r.status === "approved" || r.status === "seap_initiated") && (
                <div className="avi-actionpanel__foot">
                  <a className="avi-btn avi-btn--ghost avi-btn--sm" href={`/referate/${r.id}/pdf`} target="_blank" rel="noopener noreferrer">
                    <span className="avi-btn__ico"><Icon name="download" /></span>
                    <span>{t("common.downloadPdf")}</span>
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

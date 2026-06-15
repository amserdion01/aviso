import { and, asc, count, desc, eq, gte, ilike, inArray, lte, ne, or, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./index";
import { approvalSteps, approvalTasks, delegations, orgUnits, requisitionComments, requisitionTransitions, requisitions, userCapabilities, users } from "./schema";
import { activeDelegationsForDelegate } from "./delegations-repo";
import { TASK_TYPE_LABELS } from "@/lib/labels";

/**
 * Tasks waiting in a given approver's inbox — their own plus any routed to them
 * via an active delegation (date window + capability scope enforced here).
 */
export async function inboxFor(userId: string) {
  const now = new Date();
  const covering = await activeDelegationsForDelegate(db, userId, now);
  const baseIds = [userId, ...covering.map((c) => c.delegatorId)];

  const baseApprover = alias(users, "base_approver");
  const rows = await db
    .select({
      taskId: approvalTasks.id,
      taskType: approvalTasks.taskType,
      requiredCapability: approvalTasks.requiredCapability,
      effectiveApproverId: approvalTasks.effectiveApproverId,
      baseApproverName: baseApprover.name,
      requisitionId: requisitions.id,
      item: requisitions.item,
      quantity: requisitions.quantity,
      requesterName: users.name,
      createdAt: requisitions.createdAt,
    })
    .from(approvalTasks)
    .innerJoin(requisitions, eq(requisitions.id, approvalTasks.requisitionId))
    .innerJoin(users, eq(users.id, requisitions.requesterId))
    .innerJoin(baseApprover, eq(baseApprover.id, approvalTasks.effectiveApproverId))
    .where(and(inArray(approvalTasks.effectiveApproverId, baseIds), eq(approvalTasks.status, "waiting")))
    .orderBy(asc(requisitions.createdAt));

  return rows
    .filter((t) => {
      if (t.effectiveApproverId === userId) return true;
      return covering.some(
        (c) => c.delegatorId === t.effectiveApproverId && (c.capability === null || c.capability === t.requiredCapability),
      );
    })
    .map((t) => ({ ...t, onBehalfOf: t.effectiveApproverId === userId ? null : t.baseApproverName }));
}

/** Delegations created by a user (as delegator), with the delegate's name. */
export async function myDelegations(userId: string) {
  const delegate = alias(users, "delegate_user");
  return db
    .select({
      id: delegations.id,
      delegateName: delegate.name,
      capability: delegations.capability,
      startsAt: delegations.startsAt,
      endsAt: delegations.endsAt,
      active: delegations.active,
    })
    .from(delegations)
    .innerJoin(delegate, eq(delegate.id, delegations.delegateId))
    .where(eq(delegations.delegatorId, userId))
    .orderBy(desc(delegations.startsAt));
}

/**
 * Everything needed to render the finalized referat PDF: header fields,
 * requester + org unit, and each step with who signed it and when.
 */
export async function referatDocument(id: string) {
  const birou = alias(orgUnits, "doc_birou");
  const serviciu = alias(orgUnits, "doc_serviciu");
  const [row] = await db
    .select({
      id: requisitions.id,
      item: requisitions.item,
      quantity: requisitions.quantity,
      justification: requisitions.justification,
      costCenter: requisitions.costCenter,
      estimatedValueMinor: requisitions.estimatedValueMinor,
      needsIt: requisitions.needsIt,
      needsSsm: requisitions.needsSsm,
      procurementType: requisitions.procurementType,
      status: requisitions.status,
      createdAt: requisitions.createdAt,
      requesterName: users.name,
      requesterEmail: users.email,
      birouName: birou.name,
      serviciuName: serviciu.name,
    })
    .from(requisitions)
    .innerJoin(users, eq(users.id, requisitions.requesterId))
    .leftJoin(birou, eq(birou.id, requisitions.orgUnitId))
    .leftJoin(serviciu, eq(serviciu.id, birou.parentId))
    .where(eq(requisitions.id, id))
    .limit(1);
  if (!row) return null;

  const actedBy = alias(users, "doc_acted_by");
  const steps = await db
    .select({
      stepOrder: approvalTasks.stepOrder,
      taskType: approvalTasks.taskType,
      status: approvalTasks.status,
      actedAt: approvalTasks.actedAt,
      actedByName: actedBy.name,
    })
    .from(approvalTasks)
    .leftJoin(actedBy, eq(actedBy.id, approvalTasks.actedBy))
    .where(eq(approvalTasks.requisitionId, id))
    .orderBy(asc(approvalTasks.stepOrder));

  return { ...row, steps };
}

export type ReferatDocumentData = NonNullable<Awaited<ReturnType<typeof referatDocument>>>;

export type NotificationType = "approved" | "finalized" | "rejected" | "sentback" | "todo";
export interface NotificationRow {
  type: NotificationType;
  requisitionId: string;
  item: string;
  actorName: string | null;
  taskLabel: string | null;
  createdAt: Date;
  unread: boolean;
}

/**
 * Unified notifications feed:
 *  - requester-facing: actions others took on the referate you submitted;
 *  - approver-facing: referate currently waiting on you (arrival time = the
 *    most-recent transition, i.e. when the previous step advanced it to you).
 * Unread = events newer than the user's notifications_seen_at.
 */
export async function notificationsFor(userId: string): Promise<{ items: NotificationRow[]; unread: number }> {
  const actor = alias(users, "notif_actor");
  const events = await db
    .select({
      requisitionId: requisitions.id,
      item: requisitions.item,
      action: requisitionTransitions.action,
      toStatus: requisitionTransitions.toStatus,
      actorName: actor.name,
      createdAt: requisitionTransitions.createdAt,
    })
    .from(requisitionTransitions)
    .innerJoin(requisitions, eq(requisitions.id, requisitionTransitions.requisitionId))
    .innerJoin(actor, eq(actor.id, requisitionTransitions.actorId))
    .where(
      and(
        eq(requisitions.requesterId, userId),
        ne(requisitionTransitions.actorId, userId),
        inArray(requisitionTransitions.action, ["approve", "reject", "send_back"]),
      ),
    )
    .orderBy(desc(requisitionTransitions.createdAt))
    .limit(20);

  const todos = await db
    .select({
      requisitionId: requisitions.id,
      item: requisitions.item,
      taskType: approvalTasks.taskType,
      arrivedAt: requisitionTransitions.createdAt,
    })
    .from(approvalTasks)
    .innerJoin(requisitions, eq(requisitions.id, approvalTasks.requisitionId))
    .leftJoin(
      requisitionTransitions,
      and(eq(requisitionTransitions.requisitionId, requisitions.id), eq(requisitionTransitions.isMostRecent, true)),
    )
    .where(and(eq(approvalTasks.effectiveApproverId, userId), eq(approvalTasks.status, "waiting")));

  const [me] = await db
    .select({ seenAt: users.notificationsSeenAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const seenAt = me?.seenAt ?? null;

  const merged: Array<Omit<NotificationRow, "unread">> = [
    ...events.map((e) => ({
      type:
        e.action === "reject"
          ? ("rejected" as const)
          : e.action === "send_back"
            ? ("sentback" as const)
            : e.toStatus === "approved"
              ? ("finalized" as const)
              : ("approved" as const),
      requisitionId: e.requisitionId,
      item: e.item,
      actorName: e.actorName,
      taskLabel: null,
      createdAt: e.createdAt,
    })),
    ...todos.map((t) => ({
      type: "todo" as const,
      requisitionId: t.requisitionId,
      item: t.item,
      actorName: null,
      taskLabel: TASK_TYPE_LABELS[t.taskType] ?? t.taskType,
      createdAt: t.arrivedAt ?? new Date(0),
    })),
  ];

  merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const items: NotificationRow[] = merged
    .slice(0, 20)
    .map((n) => ({ ...n, unread: seenAt === null || n.createdAt > seenAt }));
  return { items, unread: items.filter((i) => i.unread).length };
}

/** The current user's active substitute right now (as delegator), if any. */
export async function activeSubstituteFor(userId: string) {
  const now = new Date();
  const [row] = await db
    .select({ delegateName: users.name, endsAt: delegations.endsAt })
    .from(delegations)
    .innerJoin(users, eq(users.id, delegations.delegateId))
    .where(
      and(
        eq(delegations.delegatorId, userId),
        eq(delegations.active, true),
        lte(delegations.startsAt, now),
        gte(delegations.endsAt, now),
      ),
    )
    .orderBy(asc(delegations.endsAt))
    .limit(1);
  return row ?? null;
}

/** Aggregated figures for the reports dashboard (read-only). */
export async function reportsData() {
  const statusRows = await db
    .select({ status: requisitions.status, n: count() })
    .from(requisitions)
    .groupBy(requisitions.status);
  const byStatus: Record<string, number> = { in_progress: 0, approved: 0, rejected: 0 };
  for (const r of statusRows) byStatus[r.status] = Number(r.n);
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);

  const finalized = await finalizedRequisitions();
  const totalValue = finalized.reduce((s, r) => s + (r.estimatedValueMinor ?? 0), 0);
  const durations = finalized
    .filter((r) => r.approvedAt)
    .map((r) => r.approvedAt!.getTime() - r.createdAt.getTime());
  const avgDays = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length / 86_400_000 : 0;

  const waitingRows = await db
    .select({ taskType: approvalTasks.taskType, n: count() })
    .from(approvalTasks)
    .where(eq(approvalTasks.status, "waiting"))
    .groupBy(approvalTasks.taskType);
  const waitingByStep = waitingRows.map((r) => ({ taskType: r.taskType, n: Number(r.n) })).sort((a, b) => b.n - a.n);

  const spendRows = await db
    .select({ costCenter: requisitions.costCenter, total: sum(requisitions.estimatedValueMinor) })
    .from(requisitions)
    .where(eq(requisitions.status, "approved"))
    .groupBy(requisitions.costCenter);
  const spendByCostCenter = spendRows
    .map((r) => ({ costCenter: r.costCenter, total: Number(r.total ?? 0) }))
    .sort((a, b) => b.total - a.total);

  return { byStatus, total, totalValue, avgDays, finalizedCount: finalized.length, waitingByStep, spendByCostCenter };
}

/** The approval-chain template steps, ordered, for the workflow editor. */
export async function allApprovalSteps() {
  return db.select().from(approvalSteps).orderBy(asc(approvalSteps.stepOrder));
}

/** All org units (serviciu + birou), for the admin user form. */
export async function allOrgUnits() {
  return db
    .select({ id: orgUnits.id, name: orgUnits.name, kind: orgUnits.kind })
    .from(orgUnits)
    .orderBy(asc(orgUnits.name));
}

/** Active users other than `excludeId`, for the delegate picker. */
export async function selectableUsers(excludeId: string) {
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(asc(users.name));
  return rows.filter((u) => u.id !== excludeId);
}

/** Fully-approved requisitions ready for procurement, with requester + approval time. */
export async function finalizedRequisitions() {
  return db
    .select({
      id: requisitions.id,
      item: requisitions.item,
      quantity: requisitions.quantity,
      costCenter: requisitions.costCenter,
      estimatedValueMinor: requisitions.estimatedValueMinor,
      procurementType: requisitions.procurementType,
      requesterName: users.name,
      createdAt: requisitions.createdAt,
      approvedAt: requisitionTransitions.createdAt,
    })
    .from(requisitions)
    .innerJoin(users, eq(users.id, requisitions.requesterId))
    .leftJoin(
      requisitionTransitions,
      and(eq(requisitionTransitions.requisitionId, requisitions.id), eq(requisitionTransitions.isMostRecent, true)),
    )
    .where(eq(requisitions.status, "approved"))
    .orderBy(desc(requisitionTransitions.createdAt));
}

/** All users with their org unit and capabilities, for the admin screen. */
export async function allUsers() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      active: users.active,
      orgUnitId: users.orgUnitId,
      deptName: orgUnits.name,
    })
    .from(users)
    .leftJoin(orgUnits, eq(orgUnits.id, users.orgUnitId))
    .orderBy(asc(users.name));

  const caps = await db.select({ userId: userCapabilities.userId, capability: userCapabilities.capability }).from(userCapabilities);
  const byUser = new Map<string, string[]>();
  for (const c of caps) {
    const list = byUser.get(c.userId) ?? [];
    list.push(c.capability);
    byUser.set(c.userId, list);
  }
  return rows.map((u) => ({ ...u, capabilities: byUser.get(u.id) ?? [] }));
}

/** All delegations (org-wide), with titular + substitute names. */
export async function allDelegations() {
  const delegator = alias(users, "deleg_titular");
  const delegate = alias(users, "deleg_inlocuitor");
  return db
    .select({
      id: delegations.id,
      titular: delegator.name,
      inlocuitor: delegate.name,
      capability: delegations.capability,
      startsAt: delegations.startsAt,
      endsAt: delegations.endsAt,
      active: delegations.active,
    })
    .from(delegations)
    .innerJoin(delegator, eq(delegator.id, delegations.delegatorId))
    .innerJoin(delegate, eq(delegate.id, delegations.delegateId))
    .orderBy(desc(delegations.startsAt));
}

/**
 * Search the referate a user is involved in (they requested it, or it was
 * routed to them) by item, cost center, id, or requester name.
 */
export async function searchRequisitions(userId: string, q: string) {
  const term = q.trim();
  if (!term) return [];
  const pattern = `%${term.replace(/[%_]/g, (m) => `\\${m}`)}%`;

  const myTaskReqIds = db
    .select({ id: approvalTasks.requisitionId })
    .from(approvalTasks)
    .where(eq(approvalTasks.effectiveApproverId, userId));

  return db
    .select({
      id: requisitions.id,
      item: requisitions.item,
      quantity: requisitions.quantity,
      costCenter: requisitions.costCenter,
      status: requisitions.status,
      createdAt: requisitions.createdAt,
      requesterName: users.name,
    })
    .from(requisitions)
    .innerJoin(users, eq(users.id, requisitions.requesterId))
    .where(
      and(
        or(eq(requisitions.requesterId, userId), inArray(requisitions.id, myTaskReqIds)),
        or(
          ilike(requisitions.item, pattern),
          ilike(requisitions.costCenter, pattern),
          ilike(requisitions.id, pattern),
          ilike(users.name, pattern),
        ),
      ),
    )
    .orderBy(desc(requisitions.createdAt))
    .limit(100);
}

/** Requisitions created by a user. */
export async function myRequisitions(userId: string) {
  return db
    .select()
    .from(requisitions)
    .where(eq(requisitions.requesterId, userId))
    .orderBy(desc(requisitions.createdAt));
}

/**
 * Whether a user is involved in a requisition: the requester, an approver it
 * was routed to (current or past), someone who acted on it (incl. as a
 * delegate), or a delegate currently covering an approver it's waiting on.
 */
export async function isInvolvedInRequisition(userId: string, requisitionId: string): Promise<boolean> {
  const [own] = await db
    .select({ id: requisitions.id })
    .from(requisitions)
    .where(and(eq(requisitions.id, requisitionId), eq(requisitions.requesterId, userId)))
    .limit(1);
  if (own) return true;

  const [task] = await db
    .select({ id: approvalTasks.id })
    .from(approvalTasks)
    .where(
      and(
        eq(approvalTasks.requisitionId, requisitionId),
        or(eq(approvalTasks.effectiveApproverId, userId), eq(approvalTasks.actedBy, userId)),
      ),
    )
    .limit(1);
  if (task) return true;

  // Delegate currently covering an approver this referat is waiting on.
  const covering = await activeDelegationsForDelegate(db, userId, new Date());
  if (covering.length) {
    const rows = await db
      .select({ effectiveApproverId: approvalTasks.effectiveApproverId, requiredCapability: approvalTasks.requiredCapability })
      .from(approvalTasks)
      .where(
        and(
          eq(approvalTasks.requisitionId, requisitionId),
          eq(approvalTasks.status, "waiting"),
          inArray(approvalTasks.effectiveApproverId, covering.map((c) => c.delegatorId)),
        ),
      );
    if (
      rows.some((r) =>
        covering.some((c) => c.delegatorId === r.effectiveApproverId && (c.capability === null || c.capability === r.requiredCapability)),
      )
    ) {
      return true;
    }
  }
  return false;
}

/** Discussion comments on a requisition, oldest first, with author names. */
export async function commentsFor(requisitionId: string) {
  return db
    .select({
      id: requisitionComments.id,
      body: requisitionComments.body,
      createdAt: requisitionComments.createdAt,
      authorName: users.name,
    })
    .from(requisitionComments)
    .innerJoin(users, eq(users.id, requisitionComments.authorId))
    .where(eq(requisitionComments.requisitionId, requisitionId))
    .orderBy(asc(requisitionComments.createdAt));
}

/** Full detail for one requisition: header, tasks, and audit history. */
export async function requisitionDetail(id: string) {
  const [requisition] = await db
    .select({
      id: requisitions.id,
      requesterId: requisitions.requesterId,
      orgUnitId: requisitions.orgUnitId,
      item: requisitions.item,
      quantity: requisitions.quantity,
      justification: requisitions.justification,
      costCenter: requisitions.costCenter,
      estimatedValueMinor: requisitions.estimatedValueMinor,
      needsIt: requisitions.needsIt,
      needsSsm: requisitions.needsSsm,
      procurementType: requisitions.procurementType,
      status: requisitions.status,
      createdAt: requisitions.createdAt,
      requesterName: users.name,
    })
    .from(requisitions)
    .innerJoin(users, eq(users.id, requisitions.requesterId))
    .where(eq(requisitions.id, id))
    .limit(1);
  if (!requisition) return null;

  const tasks = await db
    .select()
    .from(approvalTasks)
    .where(eq(approvalTasks.requisitionId, id))
    .orderBy(asc(approvalTasks.stepOrder));

  const history = await db
    .select({
      seq: requisitionTransitions.seq,
      action: requisitionTransitions.action,
      fromStatus: requisitionTransitions.fromStatus,
      toStatus: requisitionTransitions.toStatus,
      comment: requisitionTransitions.comment,
      createdAt: requisitionTransitions.createdAt,
      actorName: users.name,
    })
    .from(requisitionTransitions)
    .innerJoin(users, eq(users.id, requisitionTransitions.actorId))
    .where(eq(requisitionTransitions.requisitionId, id))
    .orderBy(asc(requisitionTransitions.seq));

  const activeTask = tasks.find((t) => t.status === "waiting") ?? null;
  return { requisition, tasks, history, activeTask };
}

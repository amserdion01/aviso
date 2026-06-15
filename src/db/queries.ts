import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./index";
import { approvalTasks, delegations, orgUnits, requisitionTransitions, requisitions, users } from "./schema";
import { activeDelegationsForDelegate } from "./delegations-repo";

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

/** Active users other than `excludeId`, for the delegate picker. */
export async function selectableUsers(excludeId: string) {
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(asc(users.name));
  return rows.filter((u) => u.id !== excludeId);
}

/** Requisitions created by a user. */
export async function myRequisitions(userId: string) {
  return db
    .select()
    .from(requisitions)
    .where(eq(requisitions.requesterId, userId))
    .orderBy(desc(requisitions.createdAt));
}

/** Full detail for one requisition: header, tasks, and audit history. */
export async function requisitionDetail(id: string) {
  const [requisition] = await db.select().from(requisitions).where(eq(requisitions.id, id)).limit(1);
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

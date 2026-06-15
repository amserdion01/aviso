import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { approvalTasks, requisitionTransitions, requisitions, users } from "./schema";

/** Tasks waiting in a given approver's inbox, with requisition summary. */
export async function inboxFor(userId: string) {
  return db
    .select({
      taskId: approvalTasks.id,
      taskType: approvalTasks.taskType,
      label: approvalTasks.taskType,
      requisitionId: requisitions.id,
      item: requisitions.item,
      quantity: requisitions.quantity,
      requesterName: users.name,
      createdAt: requisitions.createdAt,
    })
    .from(approvalTasks)
    .innerJoin(requisitions, eq(requisitions.id, approvalTasks.requisitionId))
    .innerJoin(users, eq(users.id, requisitions.requesterId))
    .where(and(eq(approvalTasks.effectiveApproverId, userId), eq(approvalTasks.status, "waiting")))
    .orderBy(asc(requisitions.createdAt));
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

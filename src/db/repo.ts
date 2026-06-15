import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "./index";
import {
  approvalTasks,
  requisitionTransitions,
  requisitions,
  userCapabilities,
  users,
} from "./schema";
import { SLICE_STEPS } from "@/domain/chain";
import {
  act,
  createWorkflow,
  type ActInput,
  type StepDef,
  type WorkflowState,
} from "@/domain/workflow";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateRequisitionInput {
  requesterId: string;
  orgUnitId: string;
  item: string;
  quantity: number;
  justification: string;
  costCenter: string;
  estimatedValueMinor?: number | null;
  needsIt?: boolean;
  needsSsm?: boolean;
}

export class ApproverResolutionError extends Error {
  constructor(step: StepDef) {
    super(`No eligible approver for step "${step.taskType}" (${step.requiredCapability})`);
    this.name = "ApproverResolutionError";
  }
}

// The slice treats sef_birou as org-relative; everything else as capability-wide.
function isOrgRelative(step: StepDef): boolean {
  return step.requiredCapability === "sef_birou";
}

/**
 * Resolve the effective approver for a step. Slice rules:
 *  - sef_birou: a user with the capability in the requester's own org unit
 *  - director / others: any active user holding the required capability
 * Phase 3 layers active delegations on top of this.
 */
async function resolveApprover(tx: Tx, step: StepDef, orgUnitId: string): Promise<string> {
  const conditions = [eq(userCapabilities.capability, step.requiredCapability), eq(users.active, true)];
  if (isOrgRelative(step)) {
    conditions.push(eq(users.orgUnitId, orgUnitId));
  }
  const rows = await tx
    .select({ id: users.id })
    .from(userCapabilities)
    .innerJoin(users, eq(users.id, userCapabilities.userId))
    .where(and(...conditions))
    .limit(1);
  const found = rows[0];
  if (!found) throw new ApproverResolutionError(step);
  return found.id;
}

/** Create a requisition and its initial approval tasks + audit row in one tx. */
export async function createRequisition(input: CreateRequisitionInput): Promise<string> {
  const requisitionId = randomUUID();

  await db.transaction(async (tx) => {
    const approverByOrder = new Map<number, string>();
    for (const step of SLICE_STEPS) {
      approverByOrder.set(step.order, await resolveApprover(tx, step, input.orgUnitId));
    }

    const state = createWorkflow(
      input.requesterId,
      SLICE_STEPS,
      (step) => approverByOrder.get(step.order)!,
      {
        needsIt: input.needsIt ?? false,
        needsSsm: input.needsSsm ?? false,
        procurementType: null,
        estimatedValueMinor: input.estimatedValueMinor ?? null,
      },
    );

    await tx.insert(requisitions).values({
      id: requisitionId,
      requesterId: input.requesterId,
      orgUnitId: input.orgUnitId,
      item: input.item,
      quantity: input.quantity,
      justification: input.justification,
      costCenter: input.costCenter,
      estimatedValueMinor: input.estimatedValueMinor ?? null,
      needsIt: input.needsIt ?? false,
      needsSsm: input.needsSsm ?? false,
      status: state.status,
    });

    await tx.insert(approvalTasks).values(
      state.tasks.map((t) => ({
        id: randomUUID(),
        requisitionId,
        stepOrder: t.stepOrder,
        taskType: t.taskType,
        requiredCapability: t.requiredCapability,
        effectiveApproverId: t.effectiveApproverId,
        status: t.status,
      })),
    );

    const create = state.transitions[0];
    await tx.insert(requisitionTransitions).values({
      id: randomUUID(),
      requisitionId,
      seq: create.seq,
      actorId: create.actorId,
      action: create.action,
      fromStatus: create.fromStatus,
      toStatus: create.toStatus,
      comment: create.comment,
      isMostRecent: create.isMostRecent,
    });
  });

  return requisitionId;
}

/** Load the persisted workflow state for the engine. */
async function loadState(tx: Tx, requisitionId: string): Promise<WorkflowState> {
  const [req] = await tx
    .select({
      requesterId: requisitions.requesterId,
      status: requisitions.status,
      needsIt: requisitions.needsIt,
      needsSsm: requisitions.needsSsm,
      procurementType: requisitions.procurementType,
      estimatedValueMinor: requisitions.estimatedValueMinor,
    })
    .from(requisitions)
    .where(eq(requisitions.id, requisitionId))
    .limit(1);
  if (!req) throw new Error(`Requisition ${requisitionId} not found`);

  const taskRows = await tx
    .select()
    .from(approvalTasks)
    .where(eq(approvalTasks.requisitionId, requisitionId))
    .orderBy(asc(approvalTasks.stepOrder));

  const transitionRows = await tx
    .select()
    .from(requisitionTransitions)
    .where(eq(requisitionTransitions.requisitionId, requisitionId))
    .orderBy(asc(requisitionTransitions.seq));

  return {
    requesterId: req.requesterId,
    status: req.status as WorkflowState["status"],
    context: {
      needsIt: req.needsIt,
      needsSsm: req.needsSsm,
      procurementType: req.procurementType,
      estimatedValueMinor: req.estimatedValueMinor,
    },
    steps: SLICE_STEPS,
    tasks: taskRows.map((t) => ({
      stepOrder: t.stepOrder,
      taskType: t.taskType,
      requiredCapability: t.requiredCapability,
      effectiveApproverId: t.effectiveApproverId,
      status: t.status as WorkflowState["tasks"][number]["status"],
    })),
    transitions: transitionRows.map((t) => ({
      seq: t.seq,
      actorId: t.actorId,
      action: t.action as WorkflowState["transitions"][number]["action"],
      fromStatus: t.fromStatus as WorkflowState["status"],
      toStatus: t.toStatus as WorkflowState["status"],
      comment: t.comment,
      isMostRecent: t.isMostRecent,
    })),
  };
}

/**
 * Apply an approval action and persist the new state + its single new audit row
 * in ONE transaction. If the engine rejects the action (authorization, finished
 * workflow) it throws before any write, so nothing is persisted.
 */
export async function actOnTask(input: ActInput & { requisitionId: string }): Promise<WorkflowState> {
  return db.transaction(async (tx) => {
    const state = await loadState(tx, input.requisitionId);
    const activeBefore = state.tasks.find((t) => t.status === "waiting");

    const next = act(state, {
      actorId: input.actorId,
      action: input.action,
      comment: input.comment,
    });

    await tx
      .update(requisitions)
      .set({ status: next.status, procurementType: next.context.procurementType })
      .where(eq(requisitions.id, input.requisitionId));

    for (const task of next.tasks) {
      const isActed = activeBefore && task.stepOrder === activeBefore.stepOrder;
      await tx
        .update(approvalTasks)
        .set({
          status: task.status,
          ...(isActed ? { actedBy: input.actorId, actedAt: new Date() } : {}),
        })
        .where(
          and(
            eq(approvalTasks.requisitionId, input.requisitionId),
            eq(approvalTasks.stepOrder, task.stepOrder),
          ),
        );
    }

    await tx
      .update(requisitionTransitions)
      .set({ isMostRecent: false })
      .where(eq(requisitionTransitions.requisitionId, input.requisitionId));

    const newTransition = next.transitions[next.transitions.length - 1];
    await tx.insert(requisitionTransitions).values({
      id: randomUUID(),
      requisitionId: input.requisitionId,
      seq: newTransition.seq,
      actorId: newTransition.actorId,
      action: newTransition.action,
      fromStatus: newTransition.fromStatus,
      toStatus: newTransition.toStatus,
      comment: newTransition.comment,
      isMostRecent: true,
    });

    return next;
  });
}

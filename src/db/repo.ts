import { randomUUID } from "node:crypto";
import { and, asc, eq, or } from "drizzle-orm";
import { db } from "./index";
import {
  approvalSteps,
  approvalTasks,
  orgUnits,
  requisitionTransitions,
  requisitions,
  userCapabilities,
  users,
} from "./schema";
import { DIRECTOR_TYPE_CAPABILITY } from "@/domain/chain";
import { isActiveDelegate } from "./delegations-repo";
import {
  act,
  createWorkflow,
  type ActInput,
  type Condition,
  type SendBackTarget,
  type StepDef,
  type WorkflowState,
} from "@/domain/workflow";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Exec = typeof db | Tx;
type StepRow = typeof approvalSteps.$inferSelect;

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
  workflowId: string;
}

export class ApproverResolutionError extends Error {
  constructor(taskType: string, capability: string) {
    super(`No eligible approver for step "${taskType}" (${capability})`);
    this.name = "ApproverResolutionError";
  }
}

function parseSendBack(v: string): SendBackTarget {
  if (v === "previous" || v === "requester") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : "previous";
}

function rowToStepDef(row: StepRow): StepDef {
  return {
    order: row.stepOrder,
    taskType: row.taskType,
    requiredCapability: row.requiredCapability,
    label: row.label,
    approverStrategy: row.approverStrategy as StepDef["approverStrategy"],
    appliesWhen: (row.appliesWhen ?? null) as Condition,
    onSendBack: parseSendBack(row.onSendBack),
    blocking: row.blocking,
    setsProcurementType: row.setsProcurementType,
  };
}

/** The approval-chain template for a workflow, ordered. (null = all steps, legacy.) */
async function loadTemplate(exec: Exec, workflowId: string | null): Promise<StepRow[]> {
  const rows = workflowId
    ? await exec.select().from(approvalSteps).where(eq(approvalSteps.workflowId, workflowId)).orderBy(asc(approvalSteps.stepOrder))
    : await exec.select().from(approvalSteps).orderBy(asc(approvalSteps.stepOrder));
  if (rows.length === 0) throw new Error("No approval_steps template seeded");
  return rows;
}

async function getOrgUnit(tx: Tx, id: string) {
  const [row] = await tx.select().from(orgUnits).where(eq(orgUnits.id, id)).limit(1);
  return row ?? null;
}

async function firstUserWithCapability(tx: Tx, capability: string, orgFilter?: ReturnType<typeof or>) {
  const conditions = [eq(userCapabilities.capability, capability), eq(users.active, true)];
  if (orgFilter) conditions.push(orgFilter);
  const rows = await tx
    .select({ id: users.id })
    .from(userCapabilities)
    .innerJoin(users, eq(users.id, userCapabilities.userId))
    .leftJoin(orgUnits, eq(orgUnits.id, users.orgUnitId))
    .where(and(...conditions))
    .limit(1);
  return rows[0]?.id ?? null;
}

/**
 * Resolve the effective approver for a template step.
 *  - capability:       any active user holding the required capability
 *  - org_relative:     a holder within the requester's birou (param 'birou')
 *                      or serviciu (param 'serviciu')
 *  - director_by_unit: the director whose type matches the requester's serviciu
 * Phase 3 layers active delegations on top of this.
 */
async function resolveApprover(tx: Tx, row: StepRow, requesterOrgUnitId: string): Promise<string> {
  let userId: string | null = null;

  if (row.approverStrategy === "capability") {
    userId = await firstUserWithCapability(tx, row.requiredCapability);
  } else if (row.approverStrategy === "org_relative") {
    if (row.approverParam === "serviciu") {
      const birou = await getOrgUnit(tx, requesterOrgUnitId);
      const serviciuId = birou?.parentId ?? requesterOrgUnitId;
      userId = await firstUserWithCapability(
        tx,
        row.requiredCapability,
        or(eq(orgUnits.id, serviciuId), eq(orgUnits.parentId, serviciuId)),
      );
    } else {
      userId = await firstUserWithCapability(tx, row.requiredCapability, eq(users.orgUnitId, requesterOrgUnitId));
    }
  } else if (row.approverStrategy === "director_by_unit") {
    const birou = await getOrgUnit(tx, requesterOrgUnitId);
    const serviciuId = birou?.parentId ?? requesterOrgUnitId;
    const serviciu = await getOrgUnit(tx, serviciuId);
    const capability = serviciu?.directorType ? DIRECTOR_TYPE_CAPABILITY[serviciu.directorType] : undefined;
    if (capability) userId = await firstUserWithCapability(tx, capability);
  }

  if (!userId) throw new ApproverResolutionError(row.taskType, row.requiredCapability);
  return userId;
}

/** Create a requisition and its initial approval tasks + audit row in one tx. */
export async function createRequisition(input: CreateRequisitionInput): Promise<string> {
  const requisitionId = randomUUID();

  await db.transaction(async (tx) => {
    const templateRows = await loadTemplate(tx, input.workflowId);
    const steps = templateRows.map(rowToStepDef);

    const approverByOrder = new Map<number, string>();
    for (const row of templateRows) {
      approverByOrder.set(row.stepOrder, await resolveApprover(tx, row, input.orgUnitId));
    }

    const state = createWorkflow(
      input.requesterId,
      steps,
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
      workflowId: input.workflowId,
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

/** Load the persisted workflow state (with the template) for the engine. */
async function loadState(exec: Exec, requisitionId: string): Promise<WorkflowState> {
  const [req] = await exec
    .select({
      requesterId: requisitions.requesterId,
      status: requisitions.status,
      workflowId: requisitions.workflowId,
      needsIt: requisitions.needsIt,
      needsSsm: requisitions.needsSsm,
      procurementType: requisitions.procurementType,
      estimatedValueMinor: requisitions.estimatedValueMinor,
    })
    .from(requisitions)
    .where(eq(requisitions.id, requisitionId))
    .limit(1);
  if (!req) throw new Error(`Requisition ${requisitionId} not found`);

  const steps = (await loadTemplate(exec, req.workflowId)).map(rowToStepDef);

  const taskRows = await exec
    .select()
    .from(approvalTasks)
    .where(eq(approvalTasks.requisitionId, requisitionId))
    .orderBy(asc(approvalTasks.stepOrder));

  const transitionRows = await exec
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
    steps,
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

/** Load the current workflow state for a requisition (e.g. for notifications). */
export async function getWorkflowState(requisitionId: string): Promise<WorkflowState> {
  return loadState(db, requisitionId);
}

/**
 * Apply an approval action and persist the new state + its single new audit row
 * in ONE transaction. If the engine rejects the action (authorization, finished
 * workflow, missing classification) it throws before any write, so nothing is
 * persisted.
 */
export async function actOnTask(input: ActInput & { requisitionId: string }): Promise<WorkflowState> {
  return db.transaction(async (tx) => {
    const state = await loadState(tx, input.requisitionId);
    const activeBefore = state.tasks.find((t) => t.status === "waiting");

    // Delegation: if the actor is an active delegate of the task's base approver
    // (for its capability), let them act on the base approver's behalf. The audit
    // transition records the delegate as the actor.
    if (activeBefore && input.actorId !== activeBefore.effectiveApproverId) {
      const delegated = await isActiveDelegate(
        tx,
        activeBefore.effectiveApproverId,
        input.actorId,
        activeBefore.requiredCapability,
        new Date(),
      );
      if (delegated) {
        activeBefore.effectiveApproverId = input.actorId;
      }
    }

    const next = act(state, {
      actorId: input.actorId,
      action: input.action,
      comment: input.comment,
      classification: input.classification,
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

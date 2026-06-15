/**
 * Pure, data-driven workflow engine for Aviso's approval routing.
 *
 * The chain is a template of ordered {@link StepDef}s. Each step carries an
 * `appliesWhen` predicate evaluated against the requisition's {@link RequisitionContext};
 * non-applicable steps are skipped as the flow advances. This expresses the real
 * Covasna BPMN — conditional IT/SSM, the achiziții-încadrare branch, and the
 * value threshold — without a graph engine.
 *
 * No database/framework dependency: every function takes a plain
 * {@link WorkflowState} and returns a new one. The repository resolves approvers
 * and persists the result (state + the single new transition) in one transaction.
 */

export type TaskStatus =
  | "pending"
  | "waiting"
  | "approved"
  | "rejected"
  | "sent_back"
  | "skipped";

export type RequisitionStatus = "in_progress" | "approved" | "rejected";

export type ApprovalAction = "approve" | "reject" | "send_back";
export type TransitionAction = ApprovalAction | "create";

export type ApproverStrategy = "org_relative" | "capability" | "director_by_unit";

/** Where a send-back returns to. Defaults to the previous applicable step. */
export type SendBackTarget = "previous" | "requester" | number;

/** Attributes of a requisition that drive conditional routing. */
export interface RequisitionContext {
  needsIt: boolean;
  needsSsm: boolean;
  procurementType: string | null;
  estimatedValueMinor: number | null;
}

/** A predicate over the requisition context. `null` = always applies. */
export type Condition =
  | { field: "needsIt"; eq: boolean }
  | { field: "needsSsm"; eq: boolean }
  | { field: "procurementType"; eq: string }
  | { field: "estimatedValueMinor"; gt: number }
  | null;

/** A step in the approval-chain template. */
export interface StepDef {
  order: number;
  taskType: string;
  requiredCapability: string;
  label: string;
  approverStrategy?: ApproverStrategy;
  appliesWhen?: Condition;
  onSendBack?: SendBackTarget;
  /** false = advisory (OPINIE); defaults to true (blocking). */
  blocking?: boolean;
  /** the achiziții-încadrare step: its approval sets context.procurementType. */
  setsProcurementType?: boolean;
}

/** One row per step per requisition. The active step is the single `waiting` task. */
export interface Task {
  stepOrder: number;
  taskType: string;
  requiredCapability: string;
  effectiveApproverId: string;
  status: TaskStatus;
}

/** Append-only audit row. Exactly one row has `isMostRecent === true`. */
export interface Transition {
  seq: number;
  actorId: string;
  action: TransitionAction;
  fromStatus: RequisitionStatus;
  toStatus: RequisitionStatus;
  comment: string | null;
  isMostRecent: boolean;
}

export interface WorkflowState {
  requesterId: string;
  status: RequisitionStatus;
  context: RequisitionContext;
  steps: StepDef[];
  tasks: Task[];
  transitions: Transition[];
}

export interface ActInput {
  actorId: string;
  action: ApprovalAction;
  comment?: string;
  /** required when approving the step with setsProcurementType. */
  classification?: string;
}

export class AuthorizationError extends Error {
  constructor(actorId: string) {
    super(`User ${actorId} is not the approver for the active task`);
    this.name = "AuthorizationError";
  }
}

export class WorkflowFinishedError extends Error {
  constructor() {
    super("The requisition is already finished and cannot be acted on");
    this.name = "WorkflowFinishedError";
  }
}

export class SendBackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SendBackError";
  }
}

export class ClassificationRequiredError extends Error {
  constructor() {
    super("This step requires a procurement classification to approve");
    this.name = "ClassificationRequiredError";
  }
}

const DEFAULT_CONTEXT: RequisitionContext = {
  needsIt: false,
  needsSsm: false,
  procurementType: null,
  estimatedValueMinor: null,
};

/** Evaluate a step's condition against the requisition context. */
export function applies(condition: Condition | undefined, ctx: RequisitionContext): boolean {
  if (condition == null) return true;
  switch (condition.field) {
    case "needsIt":
      return ctx.needsIt === condition.eq;
    case "needsSsm":
      return ctx.needsSsm === condition.eq;
    case "procurementType":
      return ctx.procurementType === condition.eq;
    case "estimatedValueMinor":
      return (ctx.estimatedValueMinor ?? 0) > condition.gt;
  }
}

/** The single `waiting` task, or undefined when the workflow has finished. */
export function activeTask(state: WorkflowState): Task | undefined {
  return state.tasks.find((t) => t.status === "waiting");
}

/** Inbox query, mirrored as a pure predicate: waiting tasks routed to `userId`. */
export function inboxTasksFor(tasks: Task[], userId: string): Task[] {
  return tasks.filter((t) => t.status === "waiting" && t.effectiveApproverId === userId);
}

/**
 * Build the initial state for a new requisition: one task per template step.
 * The first applicable step is `waiting`; later steps are `pending` and become
 * `waiting` (or `skipped`) as the flow advances and the context is known.
 */
export function createWorkflow(
  requesterId: string,
  steps: StepDef[],
  resolveApprover: (step: StepDef) => string,
  context: RequisitionContext = DEFAULT_CONTEXT,
): WorkflowState {
  if (steps.length === 0) {
    throw new Error("A workflow needs at least one step");
  }
  const ordered = [...steps].sort((a, b) => a.order - b.order);
  const tasks: Task[] = ordered.map((step) => ({
    stepOrder: step.order,
    taskType: step.taskType,
    requiredCapability: step.requiredCapability,
    effectiveApproverId: resolveApprover(step),
    status: "pending" as TaskStatus,
  }));

  // Activate the first applicable step; skip any strictly-earlier non-applicable ones.
  let activated = false;
  for (const task of tasks) {
    const step = ordered.find((s) => s.order === task.stepOrder)!;
    if (applies(step.appliesWhen ?? null, context)) {
      task.status = "waiting";
      activated = true;
      break;
    }
    task.status = "skipped";
  }

  return {
    requesterId,
    status: activated ? "in_progress" : "approved",
    context: { ...context },
    steps: ordered,
    tasks,
    transitions: [
      {
        seq: 0,
        actorId: requesterId,
        action: "create",
        fromStatus: "in_progress",
        toStatus: activated ? "in_progress" : "approved",
        comment: null,
        isMostRecent: true,
      },
    ],
  };
}

function appendTransition(
  transitions: Transition[],
  partial: Omit<Transition, "seq" | "isMostRecent">,
): Transition[] {
  const cleared = transitions.map((t) => ({ ...t, isMostRecent: false }));
  cleared.push({ ...partial, seq: transitions.length, isMostRecent: true });
  return cleared;
}

/**
 * Advance to the next applicable pending step after `afterOrder`, skipping
 * non-applicable ones. Mutates the given task array; returns the resulting status.
 */
function activateNext(tasks: Task[], steps: StepDef[], ctx: RequisitionContext, afterOrder: number): RequisitionStatus {
  const candidates = tasks
    .filter((t) => t.stepOrder > afterOrder && t.status === "pending")
    .sort((a, b) => a.stepOrder - b.stepOrder);
  for (const task of candidates) {
    const step = steps.find((s) => s.order === task.stepOrder)!;
    if (applies(step.appliesWhen ?? null, ctx)) {
      task.status = "waiting";
      return "in_progress";
    }
    task.status = "skipped";
  }
  return "approved";
}

/**
 * Apply an approval action. Returns a new state; never mutates the input.
 * Throws on a finished workflow, an unauthorized actor, a missing classification,
 * or an impossible send-back.
 */
export function act(state: WorkflowState, input: ActInput): WorkflowState {
  const active = activeTask(state);
  if (!active) {
    throw new WorkflowFinishedError();
  }
  if (active.effectiveApproverId !== input.actorId) {
    throw new AuthorizationError(input.actorId);
  }

  const tasks = state.tasks.map((t) => ({ ...t }));
  const context = { ...state.context };
  const current = tasks.find((t) => t.stepOrder === active.stepOrder)!;
  const currentStep = state.steps.find((s) => s.order === active.stepOrder)!;
  const comment = input.comment ?? null;
  let nextStatus: RequisitionStatus = state.status;

  switch (input.action) {
    case "approve": {
      if (currentStep.setsProcurementType) {
        if (!input.classification) throw new ClassificationRequiredError();
        context.procurementType = input.classification;
      }
      current.status = "approved";
      nextStatus = activateNext(tasks, state.steps, context, current.stepOrder);
      break;
    }
    case "reject": {
      current.status = "rejected";
      for (const t of tasks) {
        if (t.status === "pending") t.status = "skipped";
      }
      nextStatus = "rejected";
      break;
    }
    case "send_back": {
      const target = currentStep.onSendBack ?? "previous";
      let dest: Task | undefined;
      if (target === "previous") {
        dest = tasks
          .filter((t) => t.stepOrder < current.stepOrder && t.status === "approved")
          .sort((a, b) => b.stepOrder - a.stepOrder)[0];
      } else if (typeof target === "number") {
        dest = tasks.find((t) => t.stepOrder === target);
      } else {
        throw new SendBackError("Send-back to requester is not yet supported");
      }
      if (!dest) throw new SendBackError("No valid step to send back to");
      current.status = "pending";
      dest.status = "waiting";
      break;
    }
  }

  return {
    ...state,
    status: nextStatus,
    context,
    tasks,
    transitions: appendTransition(state.transitions, {
      actorId: input.actorId,
      action: input.action,
      fromStatus: state.status,
      toStatus: nextStatus,
      comment,
    }),
  };
}

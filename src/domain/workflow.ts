/**
 * Pure workflow engine for Aviso's approval routing.
 *
 * This module is intentionally free of any database or framework dependency:
 * every function takes a plain {@link WorkflowState} and returns a new one, so the
 * riskiest logic in the app (routing, authorization, the audit invariant) is fast
 * to test in isolation. The repository layer is responsible for persisting the
 * returned state and its transitions inside a single database transaction.
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

/** A step in the approval-chain template. */
export interface StepDef {
  order: number;
  taskType: string;
  requiredCapability: string;
  label: string;
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
  tasks: Task[];
  transitions: Transition[];
}

export interface ActInput {
  actorId: string;
  action: ApprovalAction;
  comment?: string;
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

/** The single `waiting` task, or undefined when the workflow has finished. */
export function activeTask(state: WorkflowState): Task | undefined {
  return state.tasks.find((t) => t.status === "waiting");
}

/** Inbox query, mirrored as a pure predicate: waiting tasks routed to `userId`. */
export function inboxTasksFor(tasks: Task[], userId: string): Task[] {
  return tasks.filter((t) => t.status === "waiting" && t.effectiveApproverId === userId);
}

/**
 * Build the initial state for a new requisition: one task per step, the first
 * `waiting` and the rest `pending`, plus the opening audit row.
 */
export function createWorkflow(
  requesterId: string,
  steps: StepDef[],
  resolveApprover: (step: StepDef) => string,
): WorkflowState {
  if (steps.length === 0) {
    throw new Error("A workflow needs at least one step");
  }
  const ordered = [...steps].sort((a, b) => a.order - b.order);
  const tasks: Task[] = ordered.map((step, i) => ({
    stepOrder: step.order,
    taskType: step.taskType,
    requiredCapability: step.requiredCapability,
    effectiveApproverId: resolveApprover(step),
    status: i === 0 ? "waiting" : "pending",
  }));

  const createTransition: Transition = {
    seq: 0,
    actorId: requesterId,
    action: "create",
    fromStatus: "in_progress",
    toStatus: "in_progress",
    comment: null,
    isMostRecent: true,
  };

  return {
    requesterId,
    status: "in_progress",
    tasks,
    transitions: [createTransition],
  };
}

/** Append an audit row, clearing the previous most-recent flag. */
function appendTransition(
  transitions: Transition[],
  partial: Omit<Transition, "seq" | "isMostRecent">,
): Transition[] {
  const cleared = transitions.map((t) => ({ ...t, isMostRecent: false }));
  cleared.push({ ...partial, seq: transitions.length, isMostRecent: true });
  return cleared;
}

/**
 * Apply an approval action. Returns a new state; never mutates the input.
 * Throws {@link WorkflowFinishedError} if there is no active task,
 * {@link AuthorizationError} if the actor is not the active task's approver.
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
  const current = tasks.find((t) => t.stepOrder === active.stepOrder)!;
  const comment = input.comment ?? null;
  let nextStatus: RequisitionStatus = state.status;

  switch (input.action) {
    case "approve": {
      current.status = "approved";
      const next = tasks
        .filter((t) => t.stepOrder > current.stepOrder && t.status === "pending")
        .sort((a, b) => a.stepOrder - b.stepOrder)[0];
      if (next) {
        next.status = "waiting";
      } else {
        nextStatus = "approved";
      }
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
      const previous = tasks
        .filter((t) => t.stepOrder < current.stepOrder && t.status === "approved")
        .sort((a, b) => b.stepOrder - a.stepOrder)[0];
      if (!previous) {
        throw new SendBackError("Cannot send back from the first step");
      }
      current.status = "pending";
      previous.status = "waiting";
      break;
    }
  }

  return {
    ...state,
    status: nextStatus,
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

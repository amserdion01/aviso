import { describe, it, expect } from "vitest";
import {
  createWorkflow,
  act,
  activeTask,
  inboxTasksFor,
  AuthorizationError,
  WorkflowFinishedError,
  type StepDef,
  type WorkflowState,
} from "./workflow";

// Phase 1 slice: create -> sef birou -> director
const STEPS: StepDef[] = [
  { order: 1, taskType: "VERIFICARE_SEF_BIROU", requiredCapability: "sef_birou", label: "Verificare șef birou" },
  { order: 2, taskType: "APROBAT_DIRECTOR", requiredCapability: "director", label: "Aprobat director" },
];

const REQUESTER = "u_requester";
const SEF = "u_sef_birou";
const DIRECTOR = "u_director";

function resolver(step: StepDef): string {
  return step.requiredCapability === "sef_birou" ? SEF : DIRECTOR;
}

function fresh(): WorkflowState {
  return createWorkflow(REQUESTER, STEPS, resolver);
}

function mostRecentCount(s: WorkflowState): number {
  return s.transitions.filter((t) => t.isMostRecent).length;
}

describe("createWorkflow", () => {
  it("creates the first task waiting for the requester's sef birou", () => {
    const s = fresh();
    const active = activeTask(s)!;
    expect(active.requiredCapability).toBe("sef_birou");
    expect(active.effectiveApproverId).toBe(SEF);
    expect(active.status).toBe("waiting");
    expect(s.status).toBe("in_progress");
  });

  it("leaves later steps pending (only one waiting task at a time)", () => {
    const s = fresh();
    const waiting = s.tasks.filter((t) => t.status === "waiting");
    expect(waiting).toHaveLength(1);
    expect(s.tasks.find((t) => t.taskType === "APROBAT_DIRECTOR")!.status).toBe("pending");
  });

  it("records a single most-recent 'create' transition", () => {
    const s = fresh();
    expect(mostRecentCount(s)).toBe(1);
    expect(s.transitions.at(-1)!.action).toBe("create");
  });
});

describe("inbox / authorization", () => {
  it("shows the waiting task only in the assigned approver's inbox", () => {
    const s = fresh();
    expect(inboxTasksFor(s.tasks, SEF)).toHaveLength(1);
    expect(inboxTasksFor(s.tasks, DIRECTOR)).toHaveLength(0);
    expect(inboxTasksFor(s.tasks, REQUESTER)).toHaveLength(0);
  });

  it("rejects an action from a user the task is not routed to", () => {
    const s = fresh();
    expect(() => act(s, { actorId: DIRECTOR, action: "approve" })).toThrow(AuthorizationError);
  });

  it("rejects any action once the workflow is finished", () => {
    let s = fresh();
    s = act(s, { actorId: SEF, action: "approve" });
    s = act(s, { actorId: DIRECTOR, action: "approve" });
    expect(s.status).toBe("approved");
    expect(() => act(s, { actorId: DIRECTOR, action: "approve" })).toThrow(WorkflowFinishedError);
  });
});

describe("approve", () => {
  it("advances to the next step and appends exactly one transition", () => {
    const s0 = fresh();
    const before = s0.transitions.length;
    const s1 = act(s0, { actorId: SEF, action: "approve" });
    expect(s1.transitions.length).toBe(before + 1);
    expect(s1.transitions.at(-1)!.action).toBe("approve");
    expect(s1.transitions.at(-1)!.fromStatus).toBe("in_progress");
    expect(s1.transitions.at(-1)!.toStatus).toBe("in_progress");
    const active = activeTask(s1)!;
    expect(active.taskType).toBe("APROBAT_DIRECTOR");
    expect(active.effectiveApproverId).toBe(DIRECTOR);
    expect(s1.tasks.find((t) => t.taskType === "VERIFICARE_SEF_BIROU")!.status).toBe("approved");
  });

  it("never mutates the input state (pure)", () => {
    const s0 = fresh();
    const snapshot = JSON.stringify(s0);
    act(s0, { actorId: SEF, action: "approve" });
    expect(JSON.stringify(s0)).toBe(snapshot);
  });

  it("completes the requisition when the last step is approved", () => {
    let s = fresh();
    s = act(s, { actorId: SEF, action: "approve" });
    s = act(s, { actorId: DIRECTOR, action: "approve" });
    expect(s.status).toBe("approved");
    expect(activeTask(s)).toBeUndefined();
    expect(s.tasks.every((t) => t.status === "approved")).toBe(true);
  });
});

describe("reject", () => {
  it("ends the flow as rejected and records the comment", () => {
    const s = act(fresh(), { actorId: SEF, action: "reject", comment: "buget insuficient" });
    expect(s.status).toBe("rejected");
    const t = s.transitions.at(-1)!;
    expect(t.action).toBe("reject");
    expect(t.toStatus).toBe("rejected");
    expect(t.comment).toBe("buget insuficient");
    expect(activeTask(s)).toBeUndefined();
    expect(s.tasks.find((t) => t.taskType === "APROBAT_DIRECTOR")!.status).toBe("skipped");
  });
});

describe("send back", () => {
  it("returns the active task to the previous approver", () => {
    let s = fresh();
    s = act(s, { actorId: SEF, action: "approve" }); // now at director
    s = act(s, { actorId: DIRECTOR, action: "send_back", comment: "completează justificarea" });
    expect(s.status).toBe("in_progress");
    const active = activeTask(s)!;
    expect(active.taskType).toBe("VERIFICARE_SEF_BIROU");
    expect(active.effectiveApproverId).toBe(SEF);
    expect(s.tasks.find((t) => t.taskType === "APROBAT_DIRECTOR")!.status).toBe("pending");
    expect(s.transitions.at(-1)!.action).toBe("send_back");
  });

  it("refuses to send back from the first step", () => {
    const s = fresh();
    expect(() => act(s, { actorId: SEF, action: "send_back" })).toThrow();
  });
});

describe("audit invariant", () => {
  it("keeps exactly one most-recent transition through any sequence", () => {
    let s = fresh();
    expect(mostRecentCount(s)).toBe(1);
    s = act(s, { actorId: SEF, action: "approve" });
    expect(mostRecentCount(s)).toBe(1);
    s = act(s, { actorId: DIRECTOR, action: "send_back" });
    expect(mostRecentCount(s)).toBe(1);
    s = act(s, { actorId: SEF, action: "approve" });
    s = act(s, { actorId: DIRECTOR, action: "approve" });
    expect(mostRecentCount(s)).toBe(1);
    expect(s.transitions.every((t, i) => t.seq === i)).toBe(true);
  });
});

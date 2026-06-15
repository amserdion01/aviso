import { describe, it, expect } from "vitest";
import {
  createWorkflow,
  act,
  activeTask,
  applies,
  type StepDef,
  type RequisitionContext,
} from "./workflow";

// A reduced but representative slice of the real chain, exercising every
// generic feature: org-relative + capability + director_by_unit strategies,
// conditional IT, the procurement branch, and the value threshold.
const CHAIN: StepDef[] = [
  { order: 1, taskType: "SEF_BIROU", requiredCapability: "sef_birou", approverStrategy: "org_relative", appliesWhen: null, label: "Șef birou" },
  { order: 2, taskType: "IT", requiredCapability: "it", approverStrategy: "capability", appliesWhen: { field: "needsIt", eq: true }, label: "IT" },
  { order: 3, taskType: "INCADRARE", requiredCapability: "achizitii", approverStrategy: "capability", appliesWhen: null, setsProcurementType: true, label: "Achiziții încadrare" },
  { order: 4, taskType: "ACHIZITII", requiredCapability: "achizitii", approverStrategy: "capability", appliesWhen: { field: "procurementType", eq: "achizitii" }, label: "Achiziții" },
  { order: 5, taskType: "APROVIZIONARE", requiredCapability: "aprovizionare", approverStrategy: "capability", appliesWhen: { field: "procurementType", eq: "aprovizionare" }, label: "Aprovizionare" },
  { order: 6, taskType: "SERVICII", requiredCapability: "servicii", approverStrategy: "capability", appliesWhen: { field: "procurementType", eq: "servicii" }, label: "Servicii" },
  { order: 7, taskType: "DIRECTOR", requiredCapability: "director", approverStrategy: "director_by_unit", appliesWhen: null, label: "Aprobat director" },
  { order: 8, taskType: "DIRECTOR_GENERAL", requiredCapability: "director_general", approverStrategy: "capability", appliesWhen: { field: "estimatedValueMinor", gt: 10_000_00 }, label: "Aprobat director general" },
];

// Approver per capability — trivial resolver for the pure engine.
const approver = (s: StepDef) => `u_${s.requiredCapability}`;

function ctx(overrides: Partial<RequisitionContext> = {}): RequisitionContext {
  return { needsIt: false, needsSsm: false, procurementType: null, estimatedValueMinor: null, ...overrides };
}

describe("applies()", () => {
  it("treats a null condition as always-applies", () => {
    expect(applies(null, ctx())).toBe(true);
  });
  it("evaluates boolean, equality and threshold conditions", () => {
    expect(applies({ field: "needsIt", eq: true }, ctx({ needsIt: true }))).toBe(true);
    expect(applies({ field: "needsIt", eq: true }, ctx({ needsIt: false }))).toBe(false);
    expect(applies({ field: "procurementType", eq: "servicii" }, ctx({ procurementType: "servicii" }))).toBe(true);
    expect(applies({ field: "estimatedValueMinor", gt: 1000 }, ctx({ estimatedValueMinor: 1001 }))).toBe(true);
    expect(applies({ field: "estimatedValueMinor", gt: 1000 }, ctx({ estimatedValueMinor: 1000 }))).toBe(false);
  });
});

describe("conditional steps", () => {
  it("skips a non-applicable IT step when advancing past it", () => {
    let s = createWorkflow("req", CHAIN, approver, ctx({ needsIt: false }));
    expect(activeTask(s)!.taskType).toBe("SEF_BIROU");
    s = act(s, { actorId: "u_sef_birou", action: "approve" });
    // IT (order 2) should be skipped; next active is INCADRARE
    expect(s.tasks.find((t) => t.taskType === "IT")!.status).toBe("skipped");
    expect(activeTask(s)!.taskType).toBe("INCADRARE");
  });

  it("activates the IT step when the requisition needs IT", () => {
    let s = createWorkflow("req", CHAIN, approver, ctx({ needsIt: true }));
    s = act(s, { actorId: "u_sef_birou", action: "approve" });
    expect(activeTask(s)!.taskType).toBe("IT");
  });
});

describe("procurement branch (data-dependent)", () => {
  it("routes to exactly the classified branch and skips the others", () => {
    let s = createWorkflow("req", CHAIN, approver, ctx());
    s = act(s, { actorId: "u_sef_birou", action: "approve" }); // -> INCADRARE
    expect(activeTask(s)!.taskType).toBe("INCADRARE");
    s = act(s, { actorId: "u_achizitii", action: "approve", classification: "servicii" });
    expect(s.context.procurementType).toBe("servicii");
    expect(activeTask(s)!.taskType).toBe("SERVICII");
    s = act(s, { actorId: "u_servicii", action: "approve" });
    expect(s.tasks.find((t) => t.taskType === "ACHIZITII")!.status).toBe("skipped");
    expect(s.tasks.find((t) => t.taskType === "APROVIZIONARE")!.status).toBe("skipped");
    expect(activeTask(s)!.taskType).toBe("DIRECTOR");
  });

  it("requires a classification when approving the incadrare step", () => {
    let s = createWorkflow("req", CHAIN, approver, ctx());
    s = act(s, { actorId: "u_sef_birou", action: "approve" });
    expect(() => act(s, { actorId: "u_achizitii", action: "approve" })).toThrow();
  });
});

describe("value threshold", () => {
  it("includes director general only above the threshold", () => {
    // below threshold: chain ends at DIRECTOR
    let low = createWorkflow("req", CHAIN, approver, ctx({ estimatedValueMinor: 5_000_00, procurementType: "achizitii" }));
    low = runTo(low, [
      ["u_sef_birou", undefined],
      ["u_achizitii", "achizitii"],
      ["u_achizitii", undefined],
      ["u_director", undefined],
    ]);
    expect(low.status).toBe("approved");
    expect(low.tasks.find((t) => t.taskType === "DIRECTOR_GENERAL")!.status).toBe("skipped");

    // above threshold: director general required after director
    let high = createWorkflow("req", CHAIN, approver, ctx({ estimatedValueMinor: 50_000_00, procurementType: "achizitii" }));
    high = runTo(high, [
      ["u_sef_birou", undefined],
      ["u_achizitii", "achizitii"],
      ["u_achizitii", undefined],
      ["u_director", undefined],
    ]);
    expect(high.status).toBe("in_progress");
    expect(activeTask(high)!.taskType).toBe("DIRECTOR_GENERAL");
  });
});

describe("configurable send-back", () => {
  const TWO_STEP: StepDef[] = [
    { order: 1, taskType: "A", requiredCapability: "a", approverStrategy: "capability", appliesWhen: null, label: "A" },
    { order: 2, taskType: "B", requiredCapability: "b", approverStrategy: "capability", appliesWhen: null, onSendBack: "previous", label: "B" },
  ];
  it("returns to the previous step by default", () => {
    let s = createWorkflow("req", TWO_STEP, (st) => `u_${st.requiredCapability}`, ctx());
    s = act(s, { actorId: "u_a", action: "approve" });
    s = act(s, { actorId: "u_b", action: "send_back" });
    expect(activeTask(s)!.taskType).toBe("A");
  });
});

// Helper: run a list of [actor, classification?] approvals in order.
function runTo(state: ReturnType<typeof createWorkflow>, steps: Array<[string, string | undefined]>) {
  let s = state;
  for (const [actorId, classification] of steps) {
    s = act(s, { actorId, action: "approve", classification });
  }
  return s;
}

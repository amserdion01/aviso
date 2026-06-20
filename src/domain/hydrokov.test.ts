import { describe, it, expect } from "vitest";
import {
  applies,
  createWorkflow,
  act,
  resubmit,
  activeTask,
  ValuationRequiredError,
  AuthorizationError,
  type Condition,
  type RequisitionContext,
  type StepDef,
  type WorkflowState,
} from "./workflow";
import { HYDROKOV_CHAIN, HYDROKOV_THRESHOLD_MINOR } from "./chain";

const T = HYDROKOV_THRESHOLD_MINOR; // 500000 bani = 5000 lei

const STEPS: StepDef[] = HYDROKOV_CHAIN.map((s) => ({
  order: s.order,
  taskType: s.taskType,
  requiredCapability: s.requiredCapability,
  label: s.label,
  approverStrategy: s.approverStrategy,
  appliesWhen: s.appliesWhen ?? null,
  setsValuation: s.setsValuation,
}));

const ctx = (over: Partial<RequisitionContext> = {}): RequisitionContext => ({
  needsIt: false,
  needsSsm: false,
  procurementType: null,
  estimatedValueMinor: null,
  inSeapCatalog: null,
  ...over,
});

/** Approver id per step order (the pure engine resolves via this callback). */
const approver = (step: StepDef) => `u-${step.order}`;
const start = () => createWorkflow("requester", STEPS, approver, ctx());

function approveActive(state: WorkflowState, extra: Partial<Parameters<typeof act>[1]> = {}): WorkflowState {
  const a = activeTask(state)!;
  return act(state, { actorId: a.effectiveApproverId, action: "approve", ...extra });
}

const taskByType = (s: WorkflowState, type: string) => s.tasks.find((t) => t.taskType === type)!;

describe("applies() — HYDROKOV operators", () => {
  it("gte / lt on value", () => {
    expect(applies({ field: "estimatedValueMinor", gte: T }, ctx({ estimatedValueMinor: T }))).toBe(true);
    expect(applies({ field: "estimatedValueMinor", gte: T }, ctx({ estimatedValueMinor: T - 1 }))).toBe(false);
    expect(applies({ field: "estimatedValueMinor", lt: T }, ctx({ estimatedValueMinor: T - 1 }))).toBe(true);
    expect(applies({ field: "estimatedValueMinor", lt: T }, ctx({ estimatedValueMinor: T }))).toBe(false);
  });

  it("inSeapCatalog eq — null matches neither", () => {
    expect(applies({ field: "inSeapCatalog", eq: true }, ctx({ inSeapCatalog: true }))).toBe(true);
    expect(applies({ field: "inSeapCatalog", eq: false }, ctx({ inSeapCatalog: false }))).toBe(true);
    expect(applies({ field: "inSeapCatalog", eq: false }, ctx({ inSeapCatalog: null }))).toBe(false);
  });

  it("any / all combinators", () => {
    const externalOrder: Condition = {
      all: [{ field: "estimatedValueMinor", lt: T }, { field: "inSeapCatalog", eq: false }],
    };
    expect(applies(externalOrder, ctx({ estimatedValueMinor: 300000, inSeapCatalog: false }))).toBe(true);
    expect(applies(externalOrder, ctx({ estimatedValueMinor: 300000, inSeapCatalog: true }))).toBe(false);
    const needsDirectors: Condition = {
      any: [{ field: "estimatedValueMinor", gte: T }, externalOrder],
    };
    expect(applies(needsDirectors, ctx({ estimatedValueMinor: 600000, inSeapCatalog: true }))).toBe(true);
    expect(applies(needsDirectors, ctx({ estimatedValueMinor: 300000, inSeapCatalog: true }))).toBe(false);
  });
});

describe("HYDROKOV materialization", () => {
  it("starts at the superior avizare; rest pending", () => {
    const s = start();
    expect(activeTask(s)!.taskType).toBe("AVIZARE_SUPERIOR");
    expect(taskByType(s, "ACHIZITII_EVALUARE").status).toBe("pending");
    expect(s.status).toBe("in_progress");
  });

  it("approving the valuation step without a valuation throws", () => {
    const s = approveActive(start()); // superior approves -> Achiziții waiting
    expect(() => approveActive(s)).toThrow(ValuationRequiredError);
  });

  it("rejects an actor who is not the routed approver", () => {
    const s = start();
    expect(() => act(s, { actorId: "intruder", action: "approve" })).toThrow(AuthorizationError);
  });
});

describe("branch ≥ 5000 lei → directori secvențial → approved", () => {
  it("superior → achiziții(6000) → dir economic → dir general → approved", () => {
    let s = approveActive(start()); // superior
    s = approveActive(s, { valuation: { valueMinor: 600000, inSeapCatalog: true } }); // achiziții
    expect(activeTask(s)!.taskType).toBe("DIRECTOR_ECONOMIC");
    expect(taskByType(s, "COORD_ACHIZITII").status).toBe("skipped"); // not external order
    s = approveActive(s); // dir economic
    expect(activeTask(s)!.taskType).toBe("DIRECTOR_GENERAL");
    s = approveActive(s); // dir general
    expect(s.status).toBe("approved");
    expect(activeTask(s)).toBeUndefined();
  });
});

describe("branch < 5000 + SEAP → inițiat în SEAP (terminal, fără directori)", () => {
  it("superior → achiziții(3000, seap) → seap_initiated", () => {
    let s = approveActive(start()); // superior
    s = approveActive(s, { valuation: { valueMinor: 300000, inSeapCatalog: true } }); // achiziții
    expect(s.status).toBe("seap_initiated");
    expect(activeTask(s)).toBeUndefined();
    expect(taskByType(s, "DIRECTOR_ECONOMIC").status).toBe("skipped");
    expect(taskByType(s, "DIRECTOR_GENERAL").status).toBe("skipped");
    expect(taskByType(s, "COORD_ACHIZITII").status).toBe("skipped");
  });
});

describe("branch < 5000 fără SEAP → comandă externă (coord + directori)", () => {
  it("superior → achiziții(3000, no seap) → coord → dir economic → dir general → approved", () => {
    let s = approveActive(start()); // superior
    s = approveActive(s, { valuation: { valueMinor: 300000, inSeapCatalog: false } }); // achiziții
    expect(activeTask(s)!.taskType).toBe("COORD_ACHIZITII");
    s = approveActive(s); // coord achiziții
    expect(activeTask(s)!.taskType).toBe("DIRECTOR_ECONOMIC");
    s = approveActive(s); // dir economic
    expect(activeTask(s)!.taskType).toBe("DIRECTOR_GENERAL");
    s = approveActive(s); // dir general
    expect(s.status).toBe("approved");
  });
});

describe("reject + send-back", () => {
  it("reject at achiziții → rejected, pending skipped, transition recorded", () => {
    let s = approveActive(start());
    const a = activeTask(s)!;
    s = act(s, { actorId: a.effectiveApproverId, action: "reject", comment: "fără buget" });
    expect(s.status).toBe("rejected");
    expect(taskByType(s, "DIRECTOR_ECONOMIC").status).toBe("skipped");
    const last = s.transitions[s.transitions.length - 1];
    expect(last.action).toBe("reject");
    expect(last.comment).toBe("fără buget");
    expect(last.isMostRecent).toBe(true);
  });

  it("send-back from achiziții returns to the superior avizare", () => {
    let s = approveActive(start()); // superior approved -> achiziții waiting
    const a = activeTask(s)!;
    s = act(s, { actorId: a.effectiveApproverId, action: "send_back", comment: "completați oferta" });
    expect(activeTask(s)!.taskType).toBe("AVIZARE_SUPERIOR");
    expect(taskByType(s, "ACHIZITII_EVALUARE").status).toBe("pending");
  });

  it("send-back can target ANY earlier step and re-walks forward from there", () => {
    // Drive into the external-order branch up to Director Economic.
    let s = approveActive(start()); // superior
    s = approveActive(s, { valuation: { valueMinor: 300000, inSeapCatalog: false } }); // achiziții
    s = approveActive(s); // coord achiziții -> Director Economic waiting
    expect(activeTask(s)!.taskType).toBe("DIRECTOR_ECONOMIC");

    // Director Economic sends it all the way back to the superior (order 1).
    const de = activeTask(s)!;
    s = act(s, { actorId: de.effectiveApproverId, action: "send_back", sendBackTo: 1, comment: "reverificați necesitatea" });
    expect(activeTask(s)!.taskType).toBe("AVIZARE_SUPERIOR");
    // Every step after the superior is reset to pending (re-walk).
    expect(taskByType(s, "ACHIZITII_EVALUARE").status).toBe("pending");
    expect(taskByType(s, "COORD_ACHIZITII").status).toBe("pending");
    expect(taskByType(s, "DIRECTOR_ECONOMIC").status).toBe("pending");

    // Re-approving forward reaches the valuation step again.
    s = approveActive(s); // superior again
    expect(activeTask(s)!.taskType).toBe("ACHIZITII_EVALUARE");
  });

  it("rejects a send-back to a non-earlier or skipped step", () => {
    const s = approveActive(start()); // superior -> achiziții waiting
    const a = activeTask(s)!;
    // step 4 (Director Economic) is not an earlier step relative to achiziții (order 2)
    expect(() => act(s, { actorId: a.effectiveApproverId, action: "send_back", sendBackTo: 4 })).toThrow();
  });

  it("send back to the requester → 'returned'; resubmit restarts the chain", () => {
    let s = approveActive(start()); // superior -> achiziții waiting
    const a = activeTask(s)!;
    s = act(s, { actorId: a.effectiveApproverId, action: "send_back", toRequester: true, comment: "corectați cantitatea" });
    expect(s.status).toBe("returned");
    expect(activeTask(s)).toBeUndefined(); // no step is waiting while with the requester
    const ret = s.transitions[s.transitions.length - 1];
    expect(ret.action).toBe("send_back");
    expect(ret.toStatus).toBe("returned");

    // The requester resubmits → chain restarts at the first step.
    s = resubmit(s, s.requesterId);
    expect(s.status).toBe("in_progress");
    expect(activeTask(s)!.taskType).toBe("AVIZARE_SUPERIOR");
    const re = s.transitions[s.transitions.length - 1];
    expect(re.fromStatus).toBe("returned");
    expect(re.toStatus).toBe("in_progress");

    // Resubmitting something not returned throws.
    expect(() => resubmit(s, s.requesterId)).toThrow();
  });
});

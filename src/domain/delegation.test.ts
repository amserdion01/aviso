import { describe, it, expect } from "vitest";
import {
  isActiveAt,
  coversCapability,
  wouldCreateCycle,
  type DelegationWindow,
  type DelegationEdge,
} from "./delegation";

function win(overrides: Partial<DelegationWindow> = {}): DelegationWindow {
  return {
    active: true,
    startsAt: new Date("2026-06-01T00:00:00Z"),
    endsAt: new Date("2026-06-30T00:00:00Z"),
    capability: null,
    ...overrides,
  };
}

describe("isActiveAt", () => {
  const now = new Date("2026-06-15T12:00:00Z");
  it("is active within the window when flagged active", () => {
    expect(isActiveAt(win(), now)).toBe(true);
  });
  it("is inactive before the start or after the end", () => {
    expect(isActiveAt(win(), new Date("2026-05-31T00:00:00Z"))).toBe(false);
    expect(isActiveAt(win(), new Date("2026-07-01T00:00:00Z"))).toBe(false);
  });
  it("is inactive when the active flag is false", () => {
    expect(isActiveAt(win({ active: false }), now)).toBe(false);
  });
});

describe("coversCapability", () => {
  it("covers all capabilities when capability is null", () => {
    expect(coversCapability(win({ capability: null }), "it")).toBe(true);
  });
  it("covers only the matching capability when scoped", () => {
    expect(coversCapability(win({ capability: "it" }), "it")).toBe(true);
    expect(coversCapability(win({ capability: "it" }), "ru")).toBe(false);
  });
});

describe("wouldCreateCycle", () => {
  it("detects a direct 2-cycle (A->B then B->A)", () => {
    const edges: DelegationEdge[] = [{ delegatorId: "A", delegateId: "B" }];
    expect(wouldCreateCycle(edges, "B", "A")).toBe(true);
  });
  it("detects a transitive cycle (A->B, B->C, then C->A)", () => {
    const edges: DelegationEdge[] = [
      { delegatorId: "A", delegateId: "B" },
      { delegatorId: "B", delegateId: "C" },
    ];
    expect(wouldCreateCycle(edges, "C", "A")).toBe(true);
  });
  it("allows a non-cyclic delegation", () => {
    const edges: DelegationEdge[] = [{ delegatorId: "A", delegateId: "B" }];
    expect(wouldCreateCycle(edges, "C", "D")).toBe(false);
    expect(wouldCreateCycle(edges, "B", "C")).toBe(false);
  });
  it("treats self-delegation as a cycle", () => {
    expect(wouldCreateCycle([], "A", "A")).toBe(true);
  });
});

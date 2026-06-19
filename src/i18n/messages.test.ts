import { describe, it, expect } from "vitest";
import { loadMessages, NAMESPACES } from "./messages";
import {
  capabilityLabel,
  taskTypeLabel,
  statusLabel,
  requisitionStatusBadge,
  describeCondition,
  formatLei,
} from "@/lib/labels";

type Json = Record<string, unknown>;

/** All leaf key paths of a nested message object, sorted. */
function keyPaths(obj: Json, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...keyPaths(v as Json, path));
    else out.push(path);
  }
  return out.sort();
}

/** ICU/interpolation placeholders in a string, e.g. {item}, plus rich tags <b>/<it>. */
function placeholders(s: string): string[] {
  return [...s.matchAll(/\{(\w+)\}|<(\/?\w+)>/g)].map((m) => m[0]).sort();
}

function leafEntries(obj: Json, prefix = ""): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...leafEntries(v as Json, path));
    else if (typeof v === "string") out.push([path, v]);
  }
  return out;
}

const ro = loadMessages("ro") as Record<string, Json>;
const hu = loadMessages("hu") as Record<string, Json>;

describe("message catalog parity (ro ↔ hu)", () => {
  for (const ns of NAMESPACES) {
    it(`${ns}: identical key sets`, () => {
      expect(keyPaths(hu[ns])).toEqual(keyPaths(ro[ns]));
    });

    it(`${ns}: identical placeholders per key`, () => {
      const roLeaves = new Map(leafEntries(ro[ns]));
      for (const [path, huVal] of leafEntries(hu[ns])) {
        const roVal = roLeaves.get(path);
        if (roVal === undefined) continue;
        expect(placeholders(huVal), `${ns}.${path}`).toEqual(placeholders(roVal));
      }
    });
  }
});

describe("locale-aware label accessors", () => {
  it("translate enum codes per locale (display only)", () => {
    expect(capabilityLabel("director_general", "ro")).toBe("Director general");
    expect(capabilityLabel("director_general", "hu")).toBe("Vezérigazgató");
    expect(statusLabel("approved", "ro")).toBe("Aprobat");
    expect(taskTypeLabel("SEF_BIROU", "ro")).toMatch(/șef birou/i);
    expect(taskTypeLabel("SEF_BIROU", "hu")).not.toBe("SEF_BIROU"); // translated, not the code
  });

  it("falls back to the raw code for unknown enum values", () => {
    expect(capabilityLabel("nonexistent_role", "hu")).toBe("nonexistent_role");
  });

  it("status badge keeps its tone, only the label localizes", () => {
    expect(requisitionStatusBadge("approved", "ro")).toEqual({ tone: "finalized", label: "Finalizat" });
    expect(requisitionStatusBadge("approved", "hu").tone).toBe("finalized");
    expect(requisitionStatusBadge("rejected", "hu").tone).toBe("rejected");
  });

  it("formats money with the locale's currency unit", () => {
    expect(formatLei(null, "ro")).toBe("—");
    expect(formatLei(123456, "ro")).toMatch(/lei$/);
    expect(formatLei(123456, "hu")).toMatch(/lej$/);
  });

  it("describeCondition interpolates and localizes", () => {
    expect(describeCondition(null, "ro")).toBe("Întotdeauna");
    expect(describeCondition({ field: "needsIt", eq: true }, "hu")).not.toMatch(/Dacă/);
    expect(describeCondition({ field: "estimatedValueMinor", gt: 500000 }, "ro")).toMatch(/5\.000/);
  });
});

describe("rebrand guard (Aviso → HydroKov)", () => {
  it("the brand surfaces use HydroKov, never Aviso", () => {
    const surfaces = [
      (ro.email as Json).footer,
      (hu.email as Json).footer,
      (ro.login as Json).footer,
      (hu.login as Json).footer,
    ] as string[];
    for (const s of surfaces) {
      expect(s).toContain("HydroKov");
      expect(s).not.toContain("Aviso");
    }
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  approvalSteps,
  approvalTasks,
  delegations,
  orgUnits,
  requisitionTransitions,
  requisitions,
  userCapabilities,
  users,
  workflows,
} from "./schema";
import { actOnTask, createRequisition } from "./repo";
import { REAL_CHAIN } from "@/domain/chain";

const run = describe.skipIf(!process.env.RUN_DB_TESTS);

const SERVICIU = "srv-tehnic";
const BIROU = "br-proiectare";

// id == capability for readability; one user per capability in the chain.
const SEEDED = [
  ["u-angajat", "angajat"],
  ["u-sef_birou", "sef_birou"],
  ["u-sef_serviciu", "sef_serviciu"],
  ["u-secretariat", "secretariat"],
  ["u-it", "it"],
  ["u-ssm", "ssm"],
  ["u-ru", "ru"],
  ["u-magazie", "magazie"],
  ["u-director_economic", "director_economic"],
  ["u-achizitii", "achizitii"],
  ["u-aprovizionare", "aprovizionare"],
  ["u-servicii", "servicii"],
  ["u-director_tehnic", "director_tehnic"],
] as const;

async function reset() {
  await db.delete(requisitionTransitions);
  await db.delete(approvalTasks);
  await db.delete(requisitions);
  await db.delete(delegations);
  await db.delete(userCapabilities);
  await db.delete(users);
  await db.delete(orgUnits);
  await db.delete(approvalSteps);

  await db.insert(workflows).values({ id: "rc-wf", name: "Test" }).onConflictDoNothing();

  await db.insert(approvalSteps).values(
    REAL_CHAIN.map((s) => ({
      id: `step-${s.order}`,
      workflowId: "rc-wf",
      stepOrder: s.order,
      taskType: s.taskType,
      requiredCapability: s.requiredCapability,
      approverStrategy: s.approverStrategy,
      approverParam: s.approverParam ?? null,
      appliesWhen: s.appliesWhen ?? null,
      onSendBack: s.onSendBack ?? "previous",
      blocking: s.blocking ?? true,
      setsProcurementType: s.setsProcurementType ?? false,
      label: s.label,
    })),
  );

  await db.insert(orgUnits).values([
    { id: SERVICIU, name: "Tehnic", kind: "serviciu", directorType: "Director tehnic" },
    { id: BIROU, name: "Proiectare", kind: "birou", parentId: SERVICIU },
  ]);

  await db.insert(users).values(
    SEEDED.map(([id, cap]) => ({ id, name: cap, email: `${cap}@aviso.test`, orgUnitId: BIROU })),
  );
  await db.insert(userCapabilities).values(SEEDED.map(([id, cap]) => ({ userId: id, capability: cap })));
}

async function tasksFor(id: string) {
  return db.select().from(approvalTasks).where(eq(approvalTasks.requisitionId, id));
}

run("real chain — full happy path", () => {
  beforeEach(reset);

  it("routes through the whole chain, skipping IT/SSM and the unused branches", async () => {
    const id = await createRequisition({
      requesterId: "u-angajat",
      orgUnitId: BIROU,
      workflowId: "rc-wf",
      item: "Laptop birou",
      quantity: 1,
      justification: "Înlocuire echipament defect",
      costCenter: "CC-TECH",
      estimatedValueMinor: 350000,
      needsIt: false,
      needsSsm: false,
    });

    // org-relative resolution
    const tasks = await tasksFor(id);
    expect(tasks.find((t) => t.taskType === "SEF_BIROU")!.effectiveApproverId).toBe("u-sef_birou");
    expect(tasks.find((t) => t.taskType === "SEF_SERVICIU")!.effectiveApproverId).toBe("u-sef_serviciu");
    // director_by_unit: Tehnic serviciu -> director_tehnic
    expect(tasks.find((t) => t.taskType === "DIRECTOR")!.effectiveApproverId).toBe("u-director_tehnic");

    await actOnTask({ requisitionId: id, actorId: "u-sef_birou", action: "approve" });
    await actOnTask({ requisitionId: id, actorId: "u-sef_serviciu", action: "approve" });
    await actOnTask({ requisitionId: id, actorId: "u-secretariat", action: "approve" });
    // IT + SSM skipped (needs_it/needs_ssm false) -> next is RU
    let now = await tasksFor(id);
    expect(now.find((t) => t.taskType === "IT")!.status).toBe("skipped");
    expect(now.find((t) => t.taskType === "SSM")!.status).toBe("skipped");
    expect(now.find((t) => t.taskType === "RU")!.status).toBe("waiting");

    await actOnTask({ requisitionId: id, actorId: "u-ru", action: "approve" });
    await actOnTask({ requisitionId: id, actorId: "u-magazie", action: "approve" });
    await actOnTask({ requisitionId: id, actorId: "u-director_economic", action: "approve" });
    // incadrare classifies as 'servicii'
    await actOnTask({ requisitionId: id, actorId: "u-achizitii", action: "approve", classification: "servicii" });
    now = await tasksFor(id);
    expect(now.find((t) => t.taskType === "ACHIZITII")!.status).toBe("skipped");
    expect(now.find((t) => t.taskType === "APROVIZIONARE")!.status).toBe("skipped");
    expect(now.find((t) => t.taskType === "SERVICII")!.status).toBe("waiting");

    await actOnTask({ requisitionId: id, actorId: "u-servicii", action: "approve" });
    const final = await actOnTask({ requisitionId: id, actorId: "u-director_tehnic", action: "approve" });
    expect(final.status).toBe("approved");

    const [req] = await db.select().from(requisitions).where(eq(requisitions.id, id));
    expect(req.status).toBe("approved");
    expect(req.procurementType).toBe("servicii");
  });
});

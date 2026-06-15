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
import { AuthorizationError } from "@/domain/workflow";

/**
 * Integration tests against a live Postgres (docker compose up postgres + db:migrate).
 * Run with:  RUN_DB_TESTS=1 pnpm test --run
 */
const run = describe.skipIf(!process.env.RUN_DB_TESTS);

const OU = "ou_test";
const REQUESTER = "u_req";
const SEF = "u_sef";
const DIRECTOR = "u_dir";

async function reset() {
  // child -> parent order to respect FKs
  await db.delete(requisitionTransitions);
  await db.delete(approvalTasks);
  await db.delete(requisitions);
  await db.delete(delegations);
  await db.delete(userCapabilities);
  await db.delete(users);
  await db.delete(orgUnits);
  await db.delete(approvalSteps);

  await db.insert(workflows).values({ id: "wf-test", name: "Test" }).onConflictDoNothing();

  // Slice template: sef birou (org-relative) -> director (capability)
  await db.insert(approvalSteps).values([
    { id: "st-1", workflowId: "wf-test", stepOrder: 1, taskType: "VERIFICARE_SEF_BIROU", requiredCapability: "sef_birou", approverStrategy: "org_relative", approverParam: "birou", label: "Verificare șef birou" },
    { id: "st-2", workflowId: "wf-test", stepOrder: 2, taskType: "APROBAT_DIRECTOR", requiredCapability: "director", approverStrategy: "capability", label: "Aprobat director" },
  ]);

  await db.insert(orgUnits).values({ id: OU, name: "Birou Test", kind: "birou" });
  await db.insert(users).values([
    { id: REQUESTER, name: "Requester", email: "req@aviso.test", orgUnitId: OU },
    { id: SEF, name: "Sef Birou", email: "sef@aviso.test", orgUnitId: OU },
    { id: DIRECTOR, name: "Director", email: "dir@aviso.test", orgUnitId: OU },
  ]);
  await db.insert(userCapabilities).values([
    { userId: REQUESTER, capability: "angajat" },
    { userId: SEF, capability: "sef_birou" },
    { userId: DIRECTOR, capability: "director" },
  ]);
}

async function newReq(): Promise<string> {
  return createRequisition({
    requesterId: REQUESTER,
    orgUnitId: OU,
    workflowId: "wf-test",
    item: "Hârtie A4",
    quantity: 10,
    justification: "Stoc epuizat",
    costCenter: "CC-100",
  });
}

async function transitionsFor(id: string) {
  return db.select().from(requisitionTransitions).where(eq(requisitionTransitions.requisitionId, id));
}
async function tasksFor(id: string) {
  return db.select().from(approvalTasks).where(eq(approvalTasks.requisitionId, id));
}

run("createRequisition", () => {
  beforeEach(reset);

  it("creates tasks (sef waiting, director pending) and one create transition", async () => {
    const id = await newReq();
    const tasks = await tasksFor(id);
    expect(tasks).toHaveLength(2);
    const sef = tasks.find((t) => t.taskType === "VERIFICARE_SEF_BIROU")!;
    const dir = tasks.find((t) => t.taskType === "APROBAT_DIRECTOR")!;
    expect(sef.status).toBe("waiting");
    expect(sef.effectiveApproverId).toBe(SEF);
    expect(dir.status).toBe("pending");
    expect(dir.effectiveApproverId).toBe(DIRECTOR);

    const trans = await transitionsFor(id);
    expect(trans).toHaveLength(1);
    expect(trans[0].action).toBe("create");
    expect(trans.filter((t) => t.isMostRecent)).toHaveLength(1);
  });
});

run("actOnTask — atomicity & audit", () => {
  beforeEach(reset);

  it("approve advances and appends exactly one transition in the same tx", async () => {
    const id = await newReq();
    const next = await actOnTask({ requisitionId: id, actorId: SEF, action: "approve" });
    expect(next.status).toBe("in_progress");

    const tasks = await tasksFor(id);
    const sef = tasks.find((t) => t.taskType === "VERIFICARE_SEF_BIROU")!;
    const dir = tasks.find((t) => t.taskType === "APROBAT_DIRECTOR")!;
    expect(sef.status).toBe("approved");
    expect(sef.actedBy).toBe(SEF);
    expect(sef.actedAt).not.toBeNull();
    expect(dir.status).toBe("waiting");

    const trans = await transitionsFor(id);
    expect(trans).toHaveLength(2);
    expect(trans.filter((t) => t.isMostRecent)).toHaveLength(1);
    expect(trans.find((t) => t.isMostRecent)!.action).toBe("approve");
  });

  it("rolls back entirely when the actor is not authorized (nothing persisted)", async () => {
    const id = await newReq();
    await expect(
      actOnTask({ requisitionId: id, actorId: DIRECTOR, action: "approve" }),
    ).rejects.toBeInstanceOf(AuthorizationError);

    // unchanged: still 1 transition, sef still waiting
    const trans = await transitionsFor(id);
    expect(trans).toHaveLength(1);
    const tasks = await tasksFor(id);
    expect(tasks.find((t) => t.taskType === "VERIFICARE_SEF_BIROU")!.status).toBe("waiting");
  });

  it("keeps exactly one most-recent row through a full approve chain", async () => {
    const id = await newReq();
    await actOnTask({ requisitionId: id, actorId: SEF, action: "approve" });
    await actOnTask({ requisitionId: id, actorId: DIRECTOR, action: "approve" });

    const [req] = await db.select().from(requisitions).where(eq(requisitions.id, id));
    expect(req.status).toBe("approved");
    const trans = await transitionsFor(id);
    expect(trans.filter((t) => t.isMostRecent)).toHaveLength(1);
    expect((await tasksFor(id)).every((t) => t.status === "approved")).toBe(true);
  });

  it("send-back returns the active task to the previous approver", async () => {
    const id = await newReq();
    await actOnTask({ requisitionId: id, actorId: SEF, action: "approve" });
    await actOnTask({ requisitionId: id, actorId: DIRECTOR, action: "send_back", comment: "completează" });

    const tasks = await tasksFor(id);
    expect(tasks.find((t) => t.taskType === "VERIFICARE_SEF_BIROU")!.status).toBe("waiting");
    expect(tasks.find((t) => t.taskType === "APROBAT_DIRECTOR")!.status).toBe("pending");
    const trans = await transitionsFor(id);
    expect(trans.find((t) => t.isMostRecent)!.action).toBe("send_back");
  });
});

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
} from "./schema";
import { actOnTask, createRequisition } from "./repo";
import { createDelegation, CircularDelegationError } from "./delegations-repo";
import { inboxFor } from "./queries";
import { AuthorizationError } from "@/domain/workflow";

const run = describe.skipIf(!process.env.RUN_DB_TESTS);

const OU = "ou_deleg";
const REQUESTER = "u_req_d";
const SEF = "u_sef_d";
const DIRECTOR = "u_dir_d";
const DELEGATE = "u_delegate_d";

const DAY = 24 * 60 * 60 * 1000;

async function reset() {
  await db.delete(requisitionTransitions);
  await db.delete(approvalTasks);
  await db.delete(requisitions);
  await db.delete(delegations);
  await db.delete(userCapabilities);
  await db.delete(users);
  await db.delete(orgUnits);
  await db.delete(approvalSteps);

  await db.insert(approvalSteps).values([
    { id: "d-st-1", stepOrder: 1, taskType: "VERIFICARE_SEF_BIROU", requiredCapability: "sef_birou", approverStrategy: "org_relative", approverParam: "birou", label: "Șef birou" },
    { id: "d-st-2", stepOrder: 2, taskType: "APROBAT_DIRECTOR", requiredCapability: "director", approverStrategy: "capability", label: "Director" },
  ]);
  await db.insert(orgUnits).values({ id: OU, name: "Birou", kind: "birou" });
  await db.insert(users).values([
    { id: REQUESTER, name: "Req", email: "req-d@aviso.test", orgUnitId: OU },
    { id: SEF, name: "Sef", email: "sef-d@aviso.test", orgUnitId: OU },
    { id: DIRECTOR, name: "Dir", email: "dir-d@aviso.test", orgUnitId: OU },
    { id: DELEGATE, name: "Delegate", email: "deleg-d@aviso.test", orgUnitId: OU },
  ]);
  await db.insert(userCapabilities).values([
    { userId: SEF, capability: "sef_birou" },
    { userId: DIRECTOR, capability: "director" },
  ]);
}

function newReq() {
  return createRequisition({
    requesterId: REQUESTER,
    orgUnitId: OU,
    item: "Test",
    quantity: 1,
    justification: "x",
    costCenter: "CC",
  });
}

async function delegate(capability: string | null, startsAt: Date, endsAt: Date) {
  return createDelegation({ delegatorId: SEF, delegateId: DELEGATE, capability, startsAt, endsAt });
}

run("delegation routing", () => {
  beforeEach(reset);

  it("shows the delegated task in the delegate's inbox and lets them act", async () => {
    const now = Date.now();
    await delegate(null, new Date(now - DAY), new Date(now + DAY));
    const id = await newReq();

    const inbox = await inboxFor(DELEGATE);
    expect(inbox.map((t) => t.requisitionId)).toContain(id);

    const next = await actOnTask({ requisitionId: id, actorId: DELEGATE, action: "approve" });
    expect(next.status).toBe("in_progress");
    const tasks = await db.select().from(approvalTasks).where(eq(approvalTasks.requisitionId, id));
    expect(tasks.find((t) => t.taskType === "VERIFICARE_SEF_BIROU")!.status).toBe("approved");
    // audit records the delegate as actor
    expect(tasks.find((t) => t.taskType === "VERIFICARE_SEF_BIROU")!.actedBy).toBe(DELEGATE);
  });

  it("does not authorize a delegate when the delegation is scoped to another capability", async () => {
    const now = Date.now();
    await delegate("it", new Date(now - DAY), new Date(now + DAY)); // not sef_birou
    const id = await newReq();

    expect((await inboxFor(DELEGATE)).map((t) => t.requisitionId)).not.toContain(id);
    await expect(actOnTask({ requisitionId: id, actorId: DELEGATE, action: "approve" })).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("does not authorize a delegate outside the date window", async () => {
    const now = Date.now();
    await delegate(null, new Date(now - 10 * DAY), new Date(now - DAY)); // expired
    const id = await newReq();

    expect((await inboxFor(DELEGATE)).map((t) => t.requisitionId)).not.toContain(id);
    await expect(actOnTask({ requisitionId: id, actorId: DELEGATE, action: "approve" })).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("rejects a circular delegation", async () => {
    const now = Date.now();
    await delegate(null, new Date(now - DAY), new Date(now + DAY)); // SEF -> DELEGATE
    await expect(
      createDelegation({ delegatorId: DELEGATE, delegateId: SEF, capability: null, startsAt: new Date(now - DAY), endsAt: new Date(now + DAY) }),
    ).rejects.toBeInstanceOf(CircularDelegationError);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
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
} from "@/db/schema";
import { actOnTask, createRequisition, getWorkflowState } from "@/db/repo";
import { notifyForState } from "./notifications";

const run = describe.skipIf(!process.env.RUN_DB_TESTS);
const MAILPIT = "http://localhost:8025";

const OU = "ou_notif";
const REQUESTER = "u_req_n";
const SEF = "u_sef_n";
const DIRECTOR = "u_dir_n";

async function reset() {
  await db.delete(requisitionTransitions);
  await db.delete(approvalTasks);
  await db.delete(requisitions);
  await db.delete(delegations);
  await db.delete(userCapabilities);
  await db.delete(users);
  await db.delete(orgUnits);
  await db.delete(approvalSteps);
  await db.insert(workflows).values({ id: "n-wf", name: "Test" }).onConflictDoNothing();
  await db.insert(approvalSteps).values([
    { id: "n-st-1", workflowId: "n-wf", stepOrder: 1, taskType: "VERIFICARE_SEF_BIROU", requiredCapability: "sef_birou", approverStrategy: "org_relative", approverParam: "birou", label: "Șef birou" },
    { id: "n-st-2", workflowId: "n-wf", stepOrder: 2, taskType: "APROBAT_DIRECTOR", requiredCapability: "director", approverStrategy: "capability", label: "Director" },
  ]);
  await db.insert(orgUnits).values({ id: OU, name: "Birou", kind: "birou" });
  await db.insert(users).values([
    { id: REQUESTER, name: "Solicitant", email: "req-n@aviso.test", orgUnitId: OU },
    { id: SEF, name: "Sef", email: "sef-n@aviso.test", orgUnitId: OU },
    { id: DIRECTOR, name: "Dir", email: "dir-n@aviso.test", orgUnitId: OU },
  ]);
  await db.insert(userCapabilities).values([
    { userId: SEF, capability: "sef_birou" },
    { userId: DIRECTOR, capability: "director" },
  ]);
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
}

async function inbox(): Promise<Array<{ Subject: string; To: Array<{ Address: string }> }>> {
  const res = await fetch(`${MAILPIT}/api/v1/messages`);
  return (await res.json()).messages;
}

run("notifications per routing event", () => {
  beforeEach(reset);

  it("emails the right recipient on create, advance and final approval", async () => {
    const id = await createRequisition({
      requesterId: REQUESTER,
      orgUnitId: OU,
      workflowId: "n-wf",
      item: "Monitor",
      quantity: 2,
      justification: "x",
      costCenter: "CC",
    });

    // create -> first approver (sef)
    await notifyForState(id, await getWorkflowState(id));
    const mail = (await inbox())[0];
    expect(mail.Subject).toContain("de aprobat");
    expect(mail.To[0].Address).toBe("sef-n@aviso.test");

    // sef approves -> next approver (director)
    const afterSef = await actOnTask({ requisitionId: id, actorId: SEF, action: "approve" });
    await notifyForState(id, afterSef);
    expect((await inbox()).some((m) => m.To[0].Address === "dir-n@aviso.test")).toBe(true);

    // director approves -> requester notified of approval
    const afterDir = await actOnTask({ requisitionId: id, actorId: DIRECTOR, action: "approve" });
    await notifyForState(id, afterDir);
    const finalMail = (await inbox()).find((m) => m.To[0].Address === "req-n@aviso.test");
    expect(finalMail).toBeTruthy();
    expect(finalMail!.Subject).toContain("aprobat");
  });
});

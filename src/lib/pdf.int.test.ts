import { beforeEach, describe, expect, it } from "vitest";
import { writeFile } from "node:fs/promises";
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
} from "@/db/schema";
import { actOnTask, createRequisition } from "@/db/repo";
import { referatDocument } from "@/db/queries";
import { renderReferatDocument } from "./referat-document";
import { htmlToPdf } from "./pdf";

const run = describe.skipIf(!process.env.RUN_DB_TESTS);

const SERVICIU = "srv_pdf";
const BIROU = "br_pdf";
const REQUESTER = "u_req_p";
const SEF = "u_sef_p";
const DIRECTOR = "u_dir_p";

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
    { id: "p-st-1", stepOrder: 1, taskType: "SEF_BIROU", requiredCapability: "sef_birou", approverStrategy: "org_relative", approverParam: "birou", label: "Șef birou" },
    { id: "p-st-2", stepOrder: 2, taskType: "DIRECTOR", requiredCapability: "director", approverStrategy: "director_by_unit", label: "Director" },
  ]);
  await db.insert(orgUnits).values([
    { id: SERVICIU, name: "Tehnic", kind: "serviciu", directorType: "Director tehnic" },
    { id: BIROU, name: "Proiectare", kind: "birou", parentId: SERVICIU },
  ]);
  await db.insert(users).values([
    { id: REQUESTER, name: "Ana Pop", email: "ana@aviso.test", orgUnitId: BIROU },
    { id: SEF, name: "Bogdan Ilie", email: "bogdan@aviso.test", orgUnitId: BIROU },
    { id: DIRECTOR, name: "Carmen Vasile", email: "carmen@aviso.test", orgUnitId: BIROU },
  ]);
  await db.insert(userCapabilities).values([
    { userId: SEF, capability: "sef_birou" },
    { userId: DIRECTOR, capability: "director_tehnic" },
  ]);
}

run("finalized referat PDF", () => {
  beforeEach(reset);

  it("produces a valid PDF for a fully approved referat", async () => {
    const id = await createRequisition({
      requesterId: REQUESTER,
      orgUnitId: BIROU,
      item: "Stații de lucru (3 buc.)",
      quantity: 3,
      justification: "Înlocuirea calculatoarelor uzate din biroul de proiectare.",
      costCenter: "CC-TECH-01",
      estimatedValueMinor: 1850000,
    });
    await actOnTask({ requisitionId: id, actorId: SEF, action: "approve", comment: "De acord" });
    await actOnTask({ requisitionId: id, actorId: DIRECTOR, action: "approve" });

    const data = await referatDocument(id);
    expect(data?.status).toBe("approved");
    const html = renderReferatDocument(data!, new Date());
    expect(html).toContain("Stații de lucru");
    expect(html).toContain("Bogdan Ilie"); // signer appears in the chain

    const pdf = await htmlToPdf(html);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(3000);

    // Write a sample for manual inspection.
    await writeFile("/tmp/aviso-referat-sample.pdf", Buffer.from(pdf));
  }, 30000);
});

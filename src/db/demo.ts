import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { users, requisitions, approvalTasks, requisitionComments, workflows } from "./schema";
import { createRequisition, actOnTask } from "./repo";

/**
 * Demo data for stakeholder review. Idempotent: clears existing requisitions
 * (cascades to tasks/transitions/comments) and recreates a realistic spread of
 * referate in every state, driven through the real workflow engine so tasks,
 * transitions and statuses are all consistent.
 *
 * Run after `pnpm db:migrate` + `pnpm db:seed`:
 *   DATABASE_URL="…(direct Neon url)…" pnpm tsx src/db/demo.ts
 */

const ORG_UNIT = "br-proiectare"; // Proiectare (Tehnic)

async function userId(email: string): Promise<string> {
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!u) throw new Error(`Lipsește utilizatorul ${email} — rulează întâi pnpm db:seed`);
  return u.id;
}

async function waiting(reqId: string) {
  const [t] = await db
    .select({ approver: approvalTasks.effectiveApproverId, taskType: approvalTasks.taskType })
    .from(approvalTasks)
    .where(and(eq(approvalTasks.requisitionId, reqId), eq(approvalTasks.status, "waiting")))
    .limit(1);
  return t;
}

async function act(reqId: string, action: "approve" | "reject" | "send_back", comment?: string) {
  const t = await waiting(reqId);
  if (!t) return;
  await actOnTask({
    requisitionId: reqId,
    actorId: t.approver,
    action,
    comment,
    classification: t.taskType === "INCADRARE" ? "achizitii" : undefined,
  });
}

/** Approve until the waiting step is `taskType` (leaves it waiting there), or finish. */
async function approveUntil(reqId: string, stop: string | null) {
  for (let i = 0; i < 25; i++) {
    const t = await waiting(reqId);
    if (!t) return; // finalized
    if (stop && t.taskType === stop) return;
    await act(reqId, "approve");
  }
}

async function comment(reqId: string, email: string, body: string) {
  await db.insert(requisitionComments).values({
    id: randomUUID(),
    requisitionId: reqId,
    authorId: await userId(email),
    body,
  });
}

async function backdate(reqId: string, days: number) {
  await db
    .update(requisitions)
    .set({ createdAt: sql`now() - (${days} || ' days')::interval` })
    .where(eq(requisitions.id, reqId));
}

async function main() {
  const ana = await userId("angajat@aviso.local");
  const wfRows = await db.select({ id: workflows.id }).from(workflows);
  const wfIds = new Set(wfRows.map((w) => w.id));
  for (const id of ["wf-standard", "wf-achizitii-mici", "wf-servicii-it", "wf-reparatii-urgente"]) {
    if (!wfIds.has(id)) throw new Error(`Lipsește fluxul „${id}" — rulează întâi pnpm db:seed`);
  }

  // Fresh slate (row delete cascades to tasks/transitions/comments).
  await db.delete(requisitions);

  const mk = (
    workflowId: string,
    item: string,
    quantity: number,
    justification: string,
    costCenter: string,
    lei: number,
    needsIt = false,
    needsSsm = false,
  ) =>
    createRequisition({
      requesterId: ana,
      orgUnitId: ORG_UNIT,
      workflowId,
      item,
      quantity,
      justification,
      costCenter,
      estimatedValueMinor: Math.round(lei * 100),
      needsIt,
      needsSsm,
    });
  const std = (item: string, q: number, j: string, cc: string, lei: number, it = false, ssm = false) =>
    mk("wf-standard", item, q, j, cc, lei, it, ssm);

  // 1) FINALIZAT — laptopuri (avizat complet → apare în Achiziții + PDF + rapoarte)
  const r1 = await std(
    "Laptop Dell Latitude 5540",
    3,
    "Laptopurile actuale din biroul de proiectare nu mai fac față aplicațiilor CAD și se blochează frecvent, întârziind livrabilele.",
    "IT & comunicații",
    12000,
    true,
  );
  await approveUntil(r1, null);
  await backdate(r1, 6);
  await comment(r1, "it@aviso.local", "Confirmat compatibilitatea cu infrastructura existentă și licențele.");
  await comment(r1, "achizitii@aviso.local", "Există contract-cadru cu furnizorul; livrare estimată 5 zile.");

  // 2) FINALIZAT — monitoare (al doilea, pentru rapoarte)
  const r2 = await std(
    "Monitor Dell UltraSharp U2724DE 27\"",
    4,
    "Completare posturi de lucru nou create în biroul de proiectare.",
    "IT & comunicații",
    6400,
    true,
  );
  await approveUntil(r2, null);
  await backdate(r2, 3);

  // 3) ÎN AȘTEPTARE la Director economic
  const r3 = await std(
    "Imprimantă multifuncțională Xerox VersaLink C7120",
    1,
    "Imprimanta actuală a secretariatului este defectă, reparația nu mai este rentabilă.",
    "Administrativ",
    4250,
  );
  await approveUntil(r3, "DIRECTOR_ECONOMIC");
  await backdate(r3, 2);
  await comment(r3, "magazie@aviso.local", "Nu există stoc în magazie, se aprobă achiziția.");

  // 4) ÎN AȘTEPTARE la Verificare magazie (necesită aviz SSM)
  const r4 = await std(
    "Pompă submersibilă Grundfos SP 17-7",
    2,
    "Înlocuirea pompelor uzate de la stația de tratare pentru a evita întreruperile de alimentare.",
    "Stație de tratare",
    28000,
    false,
    true,
  );
  await approveUntil(r4, "MAGAZIE");
  await backdate(r4, 1);

  // 5) ÎN AȘTEPTARE la IT (necesită aviz IT)
  const r5 = await std(
    "Switch-uri rețea Cisco Catalyst 1300",
    4,
    "Extinderea rețelei la noul sediu al dispeceratului.",
    "IT & comunicații",
    9800,
    true,
  );
  await approveUntil(r5, "IT");

  // 6) ÎN AȘTEPTARE la Verificare șef birou (abia trimis)
  await std(
    "Reactivi laborator (set complet analize apă)",
    5,
    "Reaprovizionare reactivi pentru analizele lunare de calitate a apei potabile.",
    "Laborator calitate",
    3100,
  );

  // 7) RESPINS
  const r7 = await std(
    "Anvelope iarnă Dacia Duster (set 4)",
    4,
    "Pregătirea parcului auto pentru sezonul rece.",
    "Parc auto",
    3600,
  );
  await act(r7, "approve"); // șef birou aprobă
  await act(r7, "reject", "Buget indisponibil în acest trimestru; reluăm solicitarea în T3.");
  await backdate(r7, 4);

  // 8) TRIMIS ÎNAPOI (revenit la un pas anterior)
  const r8 = await std(
    "Scaune ergonomice birou (lot 6)",
    6,
    "Înlocuirea scaunelor deteriorate din biroul de proiectare.",
    "Administrativ",
    4800,
  );
  await act(r8, "approve"); // șef birou
  await act(r8, "approve"); // șef serviciu
  await act(r8, "send_back", "Vă rog atașați minim 2 oferte comparative înainte de înregistrare.");
  await backdate(r8, 1);

  // ---- Categoria „Achiziții mici" (Șef birou → Director economic → Achiziții) ----
  const a1 = await mk("wf-achizitii-mici", "Consumabile birou (hârtie, dosare, pixuri)", 1, "Reaprovizionare trimestrială a consumabilelor pentru birou.", "Administrativ", 1450);
  await approveUntil(a1, null);
  await backdate(a1, 5);

  const a2 = await mk("wf-achizitii-mici", "Tonere imprimantă HP (set 4)", 4, "Tonerele actuale s-au epuizat.", "Administrativ", 980);
  await approveUntil(a2, "DIRECTOR_ECONOMIC");
  await backdate(a2, 1);

  // ---- Categoria „Servicii IT" (Șef birou → IT → Director economic → Achiziții) ----
  const s1 = await mk("wf-servicii-it", "Licențe Microsoft 365 Business (10 utilizatori)", 10, "Licențiere pentru noile posturi din proiectare.", "IT & comunicații", 5400);
  await approveUntil(s1, null);
  await backdate(s1, 4);
  await comment(s1, "it@aviso.local", "Tipul de licență confirmat; se poate achiziționa.");

  const s2 = await mk("wf-servicii-it", "Abonament VPN corporativ (1 an)", 1, "Acces securizat de la distanță pentru echipa de teren.", "IT & comunicații", 3200);
  await approveUntil(s2, "IT");

  // ---- Categoria „Reparații urgente" (Șef serviciu → Director) ----
  const u1 = await mk("wf-reparatii-urgente", "Reparație pompă stație tratare", 1, "Pompă defectă; intervenție urgentă pentru a evita întreruperea alimentării.", "Stație de tratare", 7600);
  await approveUntil(u1, null);
  await backdate(u1, 2);

  const u2 = await mk("wf-reparatii-urgente", "Înlocuire motor electric stație pompare", 1, "Motor ars; necesită înlocuire urgentă.", "Distribuție apă", 14200);
  await approveUntil(u2, "DIRECTOR");

  // Counts
  const all = await db.select({ id: requisitions.id, status: requisitions.status }).from(requisitions);
  const by = all.reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
  console.log(`Seeded ${all.length} referate:`, by);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./index";
import { users, requisitions, approvalTasks, requisitionComments, workflows } from "./schema";
import { createRequisition, actOnTask } from "./repo";

/**
 * Demo data for the HYDROKOV direct-purchase flow. Idempotent: clears existing
 * requisitions and recreates a spread across all three branches (≥5000 directors,
 * <5000+SEAP terminal, <5000 external order) and both document types, driven
 * through the real engine. A couple have Hungarian content (bilingual demo).
 *
 * Run after `pnpm db:migrate` + `pnpm db:seed`:
 *   DATABASE_URL="…Neon url…" pnpm tsx src/db/demo.ts
 */

const ORG_UNIT = "br-proiectare";
const WF = "wf-hydrokov";

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

interface Valuation {
  valueLei: number;
  inSeapCatalog: boolean;
}

async function act(reqId: string, action: "approve" | "reject" | "send_back", comment: string | undefined, val?: Valuation) {
  const t = await waiting(reqId);
  if (!t) return;
  await actOnTask({
    requisitionId: reqId,
    actorId: t.approver,
    action,
    comment,
    valuation:
      t.taskType === "ACHIZITII_EVALUARE" && action === "approve" && val
        ? { valueMinor: Math.round(val.valueLei * 100), inSeapCatalog: val.inSeapCatalog }
        : undefined,
  });
}

/** Approve until the waiting step is `stop` (leaves it there), or until finished. */
async function approveUntil(reqId: string, stop: string | null, val: Valuation) {
  for (let i = 0; i < 25; i++) {
    const t = await waiting(reqId);
    if (!t) return; // terminal (approved / seap_initiated)
    if (stop && t.taskType === stop) return;
    await act(reqId, "approve", undefined, val);
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
  if (!wfRows.some((w) => w.id === WF)) throw new Error(`Lipsește fluxul „${WF}" — rulează întâi pnpm db:seed`);

  await db.delete(requisitions); // cascades to tasks/transitions/comments

  const mk = (
    item: string,
    quantity: number,
    justification: string,
    costCenter: string,
    estLei: number,
    opts: { inPaap?: boolean; nota?: string | null } = {},
  ) =>
    createRequisition({
      requesterId: ana,
      orgUnitId: ORG_UNIT,
      workflowId: WF,
      item,
      quantity,
      justification,
      costCenter,
      estimatedValueMinor: Math.round(estLei * 100),
      inPaap: opts.inPaap ?? false,
      docType: opts.inPaap ? "comanda_interna" : "referat",
      notaJustificativa: opts.nota ?? null,
    });

  // 1) ≥5000 — comandă internă (în PAAP) → directori → APROBAT
  const r1 = await mk("Server Dell PowerEdge R760", 1, "Înlocuirea serverului de virtualizare ajuns la capacitate maximă.", "IT & comunicații", 38000, { inPaap: true });
  await approveUntil(r1, null, { valueLei: 38000, inSeapCatalog: false });
  await backdate(r1, 6);
  await comment(r1, "achizitii@aviso.local", "Trei oferte solicitate; cea selectată respectă specificațiile.");
  await comment(r1, "direconomic@aviso.local", "Există acoperire bugetară la capitolul investiții.");

  // 2) <5000 + SEAP — referat (nu e în PAAP) → INIȚIAT ÎN SEAP (terminal, document generat)
  const r2 = await mk("Multifuncțională Brother MFC-L2750DW", 1, "Imprimanta secretariatului este defectă.", "Administrativ", 2100, {
    nota: "Produsul nu figurează în PAAP-ul aprobat pentru anul curent; se justifică achiziția directă prin SEAP.",
  });
  await approveUntil(r2, null, { valueLei: 2100, inSeapCatalog: true });
  await backdate(r2, 3);
  await comment(r2, "achizitii@aviso.local", "Produs disponibil în catalogul SEAP; se inițiază direct.");

  // 3) <5000 fără SEAP — comandă externă (coord achiziții + directori) → APROBAT
  const r3 = await mk("Piese schimb pompă dozare clor", 4, "Mentenanță programată la stația de clorinare.", "Stație de tratare", 3400, { inPaap: true });
  await approveUntil(r3, null, { valueLei: 3400, inSeapCatalog: false });
  await backdate(r3, 4);
  await comment(r3, "achizitii@aviso.local", "Ofertantul nu are cont SEAP; se emite comandă externă.");

  // 4) ÎN AȘTEPTARE la avizare superior (abia trimis) — referat
  await mk("Trusă scule electricianul de tură", 1, "Dotarea echipei de intervenție.", "Distribuție apă", 1850, {
    nota: "Articol neprevăzut în PAAP; necesar pentru intervenții neplanificate.",
  });

  // 5) ÎN AȘTEPTARE la Birou Achiziții — superior a avizat, urmează evaluarea
  const r5 = await mk("Laptop proiectare Dell Precision", 2, "Stații de lucru pentru noii ingineri proiectanți.", "IT & comunicații", 16000, { inPaap: true });
  await approveUntil(r5, "ACHIZITII_EVALUARE", { valueLei: 16000, inSeapCatalog: false });

  // 6) ÎN AȘTEPTARE la Director Economic (≥5000, deja evaluat)
  const r6 = await mk("Autoutilitară N1 pentru echipa de teren", 1, "Parcul auto nu acoperă intervențiile în mediul rural.", "Parc auto", 92000, { inPaap: true });
  await approveUntil(r6, "DIRECTOR_ECONOMIC", { valueLei: 92000, inSeapCatalog: false });
  await backdate(r6, 2);

  // 7) RESPINS la Birou Achiziții
  const r7 = await mk("Mobilier birou (set premium)", 3, "Reamenajare birou conducere.", "Administrativ", 8800, { inPaap: false, nota: "Nu este prevăzut în PAAP." });
  await act(r7, "approve", undefined); // superior avizează
  await act(r7, "reject", "Solicitarea nu se încadrează în prioritățile de achiziție din acest trimestru.");
  await backdate(r7, 5);

  // 8) TRIMIS ÎNAPOI la solicitant/superior
  const r8 = await mk("Echipamente protecție (EIP) lot mixt", 10, "Reînnoirea echipamentului individual de protecție.", "Stație de tratare", 4200, { inPaap: true });
  await act(r8, "approve", undefined); // superior
  await act(r8, "send_back", "Vă rog detaliați sortimentele și mărimile înainte de evaluare.");
  await backdate(r8, 1);

  // ---- Referate cu conținut în limba maghiară (demo bilingv) ----
  // 9) <5000 + SEAP, în maghiară → inițiat în SEAP
  const h1 = await mk("Irodai multifunkciós nyomtató Canon", 1, "A tervezőiroda nyomtatójának pótlása.", "Administrativ", 2600, {
    nota: "A termék nem szerepel a jóváhagyott PAAP-ban; közvetlen SEAP-beszerzés indokolt.",
  });
  await approveUntil(h1, null, { valueLei: 2600, inSeapCatalog: true });
  await backdate(h1, 2);
  await comment(h1, "achizitii@aviso.local", "A termék elérhető a SEAP katalógusban; közvetlenül kezdeményezzük.");

  // 10) ≥5000, în maghiară, în așteptare la Director Economic
  const h2 = await mk("Szivattyú-vezérlő automatika a vízműhöz", 1, "A meghibásodott vezérlőegység cseréje a vízkezelő állomáson.", "Stație de tratare", 27500, { inPaap: true });
  await approveUntil(h2, "DIRECTOR_ECONOMIC", { valueLei: 27500, inSeapCatalog: false });

  // A couple of approver accounts default to Hungarian (per-user language + emails).
  await db.update(users).set({ locale: "hu" }).where(inArray(users.email, ["achizitii@aviso.local", "coordachizitii@aviso.local"]));

  const all = await db.select({ id: requisitions.id, status: requisitions.status }).from(requisitions);
  const by = all.reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
  console.log(`Seeded ${all.length} referate:`, by);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

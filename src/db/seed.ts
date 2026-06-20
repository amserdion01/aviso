import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { approvalSteps, orgUnits, userCapabilities, users, workflows } from "./schema";
import { HYDROKOV_CHAIN, type ChainStepSeed } from "@/domain/chain";
import { auth } from "@/lib/auth";

/**
 * Idempotent dev seed for the real HYDROKOV direct-purchase flow:
 *  - the HYDROKOV approval template (approval_steps)
 *  - one serviciu/birou org unit (regional centers deferred)
 *  - users for each role + the hierarchical superior chain (users.superior_id)
 *
 * Run: pnpm db:seed   (requires docker compose postgres + db:migrate)
 */

const PASSWORD = "Parola123!";

export const HYDROKOV_WORKFLOW = {
  id: "wf-hydrokov",
  name: "Achiziție directă HYDROKOV",
  description: "Avizare superior ierarhic → Birou Achiziții (evaluare valoare + SEAP) → ramificare pe valoare/SEAP.",
};

/** The single seeded workflow (admin-configurable categories are a separate lot). */
export const WORKFLOWS: Array<{ id: string; name: string; description: string; steps: ChainStepSeed[] }> = [
  { ...HYDROKOV_WORKFLOW, steps: HYDROKOV_CHAIN },
];

const SERVICIU = { id: "srv-tehnic", name: "Tehnic", kind: "serviciu" as const, directorType: "Director tehnic" };
const BIROU = { id: "br-proiectare", name: "Proiectare", kind: "birou" as const, parentId: "srv-tehnic" };

/** Users + roles + the direct superior (by email) that drives the avizare step. */
const USERS: Array<{ name: string; email: string; caps: string[]; superior?: string }> = [
  { name: "Ana Angajat", email: "angajat@aviso.local", caps: ["angajat"], superior: "sefbirou@aviso.local" },
  { name: "Bogdan Șef Birou", email: "sefbirou@aviso.local", caps: ["angajat", "sef_ierarhic"], superior: "sefserviciu@aviso.local" },
  { name: "Cristina Șef Serviciu", email: "sefserviciu@aviso.local", caps: ["sef_ierarhic"], superior: "dirgeneral@aviso.local" },
  { name: "Birou Achiziții", email: "achizitii@aviso.local", caps: ["birou_achizitii"], superior: "coordachizitii@aviso.local" },
  { name: "Coordonator Achiziții", email: "coordachizitii@aviso.local", caps: ["coord_achizitii"], superior: "dirgeneral@aviso.local" },
  { name: "Director Economic", email: "direconomic@aviso.local", caps: ["director_economic"], superior: "dirgeneral@aviso.local" },
  { name: "Director General", email: "dirgeneral@aviso.local", caps: ["director_general", "admin"] },
];

async function ensureUser(name: string, email: string): Promise<string> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return existing[0].id;
  const res = await auth.api.signUpEmail({ body: { name, email, password: PASSWORD } });
  return res.user.id;
}

async function seedTemplate() {
  await db.delete(approvalSteps);
  for (const wf of WORKFLOWS) {
    await db.insert(workflows).values({ id: wf.id, name: wf.name, description: wf.description }).onConflictDoNothing();
    await db.insert(approvalSteps).values(
      wf.steps.map((s) => ({
        id: `${wf.id}-step-${s.order}`,
        workflowId: wf.id,
        stepOrder: s.order,
        taskType: s.taskType,
        requiredCapability: s.requiredCapability,
        approverStrategy: s.approverStrategy,
        approverParam: s.approverParam ?? null,
        appliesWhen: s.appliesWhen ?? null,
        onSendBack: s.onSendBack ?? "previous",
        blocking: s.blocking ?? true,
        setsProcurementType: s.setsProcurementType ?? false,
        setsValuation: s.setsValuation ?? false,
        label: s.label,
      })),
    );
    console.log(`  ✓ workflow „${wf.name}" (${wf.steps.length} pași)`);
  }
}

async function main() {
  await seedTemplate();

  await db.insert(orgUnits).values(SERVICIU).onConflictDoNothing();
  await db.insert(orgUnits).values(BIROU).onConflictDoNothing();

  // Pass 1: create users + capabilities; remember email → id.
  const idByEmail = new Map<string, string>();
  for (const u of USERS) {
    const id = await ensureUser(u.name, u.email);
    idByEmail.set(u.email, id);
    await db.update(users).set({ orgUnitId: BIROU.id }).where(eq(users.id, id));
    await db
      .insert(userCapabilities)
      .values(u.caps.map((capability) => ({ userId: id, capability })))
      .onConflictDoNothing();
    console.log(`  ✓ ${u.email}  [${u.caps.join(", ")}]`);
  }

  // Pass 2: wire the hierarchical superior (drives the dynamic avizare step).
  for (const u of USERS) {
    const superiorId = u.superior ? idByEmail.get(u.superior) ?? null : null;
    await db.update(users).set({ superiorId }).where(eq(users.id, idByEmail.get(u.email)!));
  }

  console.log(`\nSeeded ${USERS.length} users in "${BIROU.name}" / "${SERVICIU.name}". Password: ${PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

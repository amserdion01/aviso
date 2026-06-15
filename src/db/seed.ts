import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { approvalSteps, orgUnits, userCapabilities, users, workflows } from "./schema";
import { REAL_CHAIN, type ChainStepSeed } from "@/domain/chain";
import { auth } from "@/lib/auth";

/**
 * Idempotent dev seed:
 *  - the real approval-chain template (approval_steps)
 *  - one serviciu/birou org unit
 *  - one user per capability in the chain (created via Better Auth so login works)
 *
 * Run: pnpm db:seed   (requires docker compose postgres + db:migrate)
 */

const PASSWORD = "Parola123!";

export const STANDARD_WORKFLOW = {
  id: "wf-standard",
  name: "Standard",
  description: "Fluxul complet de avizare a referatelor de necesitate.",
};

/** All seeded workflow categories, each with its own ordered chain. */
export const WORKFLOWS: Array<{ id: string; name: string; description: string; steps: ChainStepSeed[] }> = [
  { ...STANDARD_WORKFLOW, steps: REAL_CHAIN },
  {
    id: "wf-achizitii-mici",
    name: "Achiziții mici",
    description: "Flux scurt pentru achiziții de valoare mică.",
    steps: [
      { order: 1, taskType: "SEF_BIROU", requiredCapability: "sef_birou", approverStrategy: "org_relative", approverParam: "birou", label: "Verificare șef birou/sector" },
      { order: 2, taskType: "DIRECTOR_ECONOMIC", requiredCapability: "director_economic", approverStrategy: "capability", label: "Aprobat director economic" },
      { order: 3, taskType: "ACHIZITII", requiredCapability: "achizitii", approverStrategy: "capability", label: "Achiziții" },
    ],
  },
  {
    id: "wf-servicii-it",
    name: "Servicii IT",
    description: "Achiziții și servicii IT, cu aviz obligatoriu de la IT.",
    steps: [
      { order: 1, taskType: "SEF_BIROU", requiredCapability: "sef_birou", approverStrategy: "org_relative", approverParam: "birou", label: "Verificare șef birou/sector" },
      { order: 2, taskType: "IT", requiredCapability: "it", approverStrategy: "capability", label: "Aviz IT" },
      { order: 3, taskType: "DIRECTOR_ECONOMIC", requiredCapability: "director_economic", approverStrategy: "capability", label: "Aprobat director economic" },
      { order: 4, taskType: "ACHIZITII", requiredCapability: "achizitii", approverStrategy: "capability", label: "Achiziții" },
    ],
  },
  {
    id: "wf-reparatii-urgente",
    name: "Reparații urgente",
    description: "Traseu rapid pentru reparații urgente, doar șef serviciu + director.",
    steps: [
      { order: 1, taskType: "SEF_SERVICIU", requiredCapability: "sef_serviciu", approverStrategy: "org_relative", approverParam: "serviciu", label: "Verificare șef serviciu/secție" },
      { order: 2, taskType: "DIRECTOR", requiredCapability: "director", approverStrategy: "director_by_unit", label: "Aprobat director" },
    ],
  },
];

const SERVICIU = { id: "srv-tehnic", name: "Tehnic", kind: "serviciu" as const, directorType: "Director tehnic" };
const BIROU = { id: "br-proiectare", name: "Proiectare", kind: "birou" as const, parentId: "srv-tehnic" };

const USERS = [
  { name: "Ana Angajat", email: "angajat@aviso.local", caps: ["angajat"] },
  { name: "Bogdan Șef Birou", email: "sefbirou@aviso.local", caps: ["angajat", "sef_birou"] },
  { name: "Cristina Șef Serviciu", email: "sefserviciu@aviso.local", caps: ["sef_serviciu"] },
  { name: "Secretariat", email: "secretariat@aviso.local", caps: ["secretariat"] },
  { name: "Responsabil IT", email: "it@aviso.local", caps: ["it"] },
  { name: "Responsabil SSM", email: "ssm@aviso.local", caps: ["ssm"] },
  { name: "Resurse Umane", email: "ru@aviso.local", caps: ["ru"] },
  { name: "Gestionar Magazie", email: "magazie@aviso.local", caps: ["magazie"] },
  { name: "Director Economic", email: "direconomic@aviso.local", caps: ["director_economic"] },
  { name: "Achiziții", email: "achizitii@aviso.local", caps: ["achizitii"] },
  { name: "Aprovizionare", email: "aprovizionare@aviso.local", caps: ["aprovizionare"] },
  { name: "Servicii", email: "servicii@aviso.local", caps: ["servicii"] },
  { name: "Director Tehnic", email: "dirtehnic@aviso.local", caps: ["director_tehnic"] },
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

  for (const u of USERS) {
    const id = await ensureUser(u.name, u.email);
    await db.update(users).set({ orgUnitId: BIROU.id }).where(eq(users.id, id));
    await db
      .insert(userCapabilities)
      .values(u.caps.map((capability) => ({ userId: id, capability })))
      .onConflictDoNothing();
    console.log(`  ✓ ${u.email}  [${u.caps.join(", ")}]`);
  }

  console.log(`\nSeeded ${USERS.length} users in "${BIROU.name}" / "${SERVICIU.name}". Password: ${PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

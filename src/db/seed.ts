import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { orgUnits, userCapabilities, users } from "./schema";
import { auth } from "@/lib/auth";

/**
 * Idempotent dev seed: one org unit + one test user per slice capability,
 * created through Better Auth so the passwords actually work for login.
 *
 * Run: pnpm db:seed     (requires docker compose postgres + db:migrate)
 */

const PASSWORD = "Parola123!";
const ORG_UNIT = { id: "ou-demo", name: "Birou Demo", kind: "birou" as const };

const TEST_USERS = [
  { name: "Ana Angajat", email: "angajat@aviso.local", capabilities: ["angajat"] },
  { name: "Bogdan Șef", email: "sef@aviso.local", capabilities: ["angajat", "sef_birou"] },
  { name: "Carmen Director", email: "director@aviso.local", capabilities: ["director"] },
];

async function ensureUser(name: string, email: string): Promise<string> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return existing[0].id;

  const res = await auth.api.signUpEmail({ body: { name, email, password: PASSWORD } });
  return res.user.id;
}

async function main() {
  await db.insert(orgUnits).values(ORG_UNIT).onConflictDoNothing();

  for (const u of TEST_USERS) {
    const id = await ensureUser(u.name, u.email);
    await db.update(users).set({ orgUnitId: ORG_UNIT.id }).where(eq(users.id, id));
    if (u.capabilities.length > 0) {
      await db
        .insert(userCapabilities)
        .values(u.capabilities.map((capability) => ({ userId: id, capability })))
        .onConflictDoNothing();
    }
    console.log(`  ✓ ${u.email}  [${u.capabilities.join(", ")}]`);
  }

  console.log(`\nSeeded ${TEST_USERS.length} users in "${ORG_UNIT.name}". Password for all: ${PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

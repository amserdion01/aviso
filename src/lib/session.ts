import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "@/db";
import { userCapabilities, users } from "@/db/schema";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  orgUnitId: string | null;
  capabilities: string[];
}

/** The signed-in app user with org unit + capabilities, or null. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, orgUnitId: users.orgUnitId, active: users.active })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  // Deactivated accounts are treated as signed-out (offboarding / compromised account).
  if (!row || !row.active) return null;

  const caps = await db
    .select({ capability: userCapabilities.capability })
    .from(userCapabilities)
    .where(eq(userCapabilities.userId, row.id));

  return { ...row, capabilities: caps.map((c) => c.capability) };
}

/** Like getCurrentUser but redirects to /login when not authenticated. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Activity status of the session's user — distinguishes a deactivated account
 * from no session at all (getCurrentUser collapses both to null).
 */
export async function sessionActivityStatus(): Promise<"active" | "inactive" | "none"> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return "none";
  const [row] = await db.select({ active: users.active }).from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!row) return "none";
  return row.active ? "active" : "inactive";
}

/** Whether a user holds the `admin` capability (system administration). */
export function isAdmin(user: AppUser): boolean {
  return user.capabilities.includes("admin");
}

/** Require an authenticated admin; redirect non-admins to the home screen. */
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/");
  return user;
}

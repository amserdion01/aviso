import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { users, sessions, accounts, verifications } from "@/db/schema";

// Origins allowed past Better Auth's CSRF/origin check. Includes the configured
// URL plus Vercel's auto-injected production and per-deployment hostnames, so
// sign-in works on Vercel even if BETTER_AUTH_URL isn't perfectly set.
const trustedOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
].filter((v): v is string => Boolean(v));

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Internal tool: no email-verification round-trip required to sign in.
    requireEmailVerification: false,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  ...(trustedOrigins.length ? { trustedOrigins } : {}),
});

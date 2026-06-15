import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth.handler);

export const GET = handlers.GET;

/**
 * Account creation is admin-only — it goes through the admin user-management
 * screen, which calls the Better Auth server API directly (not this HTTP
 * route). Reject public sign-up requests so the endpoint can't be used to
 * self-register, bypassing the admin gate.
 */
export async function POST(request: Request) {
  const { pathname } = new URL(request.url);
  if (pathname.includes("/sign-up")) {
    return Response.json({ error: "Înregistrarea publică este dezactivată." }, { status: 403 });
  }
  return handlers.POST(request);
}

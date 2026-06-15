"use client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
// No `signUp` here on purpose — account creation is admin-only (server-side).
export const { signIn, signOut, useSession } = authClient;

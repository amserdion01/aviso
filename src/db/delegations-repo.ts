import { randomUUID } from "node:crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "./index";
import { delegations } from "./schema";
import { wouldCreateCycle } from "@/domain/delegation";

type Exec = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateDelegationInput {
  delegatorId: string;
  delegateId: string;
  capability?: string | null;
  startsAt: Date;
  endsAt: Date;
}

export class CircularDelegationError extends Error {
  constructor() {
    super("This delegation would create a circular chain");
    this.name = "CircularDelegationError";
  }
}

/** Create a delegation, rejecting circular chains. */
export async function createDelegation(input: CreateDelegationInput): Promise<string> {
  return db.transaction(async (tx) => {
    const edges = await tx
      .select({ delegatorId: delegations.delegatorId, delegateId: delegations.delegateId })
      .from(delegations)
      .where(eq(delegations.active, true));

    if (wouldCreateCycle(edges, input.delegatorId, input.delegateId)) {
      throw new CircularDelegationError();
    }

    const id = randomUUID();
    await tx.insert(delegations).values({
      id,
      delegatorId: input.delegatorId,
      delegateId: input.delegateId,
      capability: input.capability ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      active: true,
    });
    return id;
  });
}

/** Delegations that currently route work TO `delegateId` (active + in-window). */
export async function activeDelegationsForDelegate(exec: Exec, delegateId: string, now: Date) {
  return exec
    .select({ delegatorId: delegations.delegatorId, capability: delegations.capability })
    .from(delegations)
    .where(
      and(
        eq(delegations.delegateId, delegateId),
        eq(delegations.active, true),
        lte(delegations.startsAt, now),
        gte(delegations.endsAt, now),
      ),
    );
}

/** Is `delegateId` an active delegate of `delegatorId` for `capability` at `now`? */
export async function isActiveDelegate(
  exec: Exec,
  delegatorId: string,
  delegateId: string,
  capability: string,
  now: Date,
): Promise<boolean> {
  const rows = await activeDelegationsForDelegate(exec, delegateId, now);
  return rows.some((r) => r.delegatorId === delegatorId && (r.capability === null || r.capability === capability));
}

/**
 * Pure delegation (substitute) logic — date-window and capability scoping, plus
 * a guard against circular delegation chains. No DB dependency; the repository
 * supplies rows and persists results.
 */

export interface DelegationWindow {
  active: boolean;
  startsAt: Date;
  endsAt: Date;
  /** null = covers all of the delegator's capabilities. */
  capability: string | null;
}

export interface DelegationEdge {
  delegatorId: string;
  delegateId: string;
}

/** Active = flagged active and `now` within [startsAt, endsAt]. */
export function isActiveAt(d: DelegationWindow, now: Date): boolean {
  return d.active && d.startsAt.getTime() <= now.getTime() && now.getTime() <= d.endsAt.getTime();
}

/** A delegation covers a task's required capability when unscoped or matching. */
export function coversCapability(d: Pick<DelegationWindow, "capability">, capability: string): boolean {
  return d.capability === null || d.capability === capability;
}

/**
 * Would adding `delegatorId -> delegateId` create a cycle, given existing edges?
 * Self-delegation counts as a cycle. Walks forward from `delegateId`; if it can
 * reach `delegatorId`, the new edge closes a loop.
 */
export function wouldCreateCycle(
  edges: DelegationEdge[],
  delegatorId: string,
  delegateId: string,
): boolean {
  if (delegatorId === delegateId) return true;
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    const list = adjacency.get(e.delegatorId) ?? [];
    list.push(e.delegateId);
    adjacency.set(e.delegatorId, list);
  }
  const seen = new Set<string>();
  const stack = [delegateId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === delegatorId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of adjacency.get(current) ?? []) stack.push(next);
  }
  return false;
}

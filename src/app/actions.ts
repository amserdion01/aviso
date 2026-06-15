"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { eq, desc } from "drizzle-orm";
import {
  createReferatSchema,
  actionSchema,
  delegationSchema,
  createUserSchema,
  updateUserSchema,
  commentSchema,
  stepSchema,
  buildAppliesWhen,
  leiToBani,
} from "@/lib/validation";
import { requireUser, isAdmin } from "@/lib/session";
import { db } from "@/db";
import { users, userCapabilities, requisitionComments, sessions, approvalSteps } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isInvolvedInRequisition } from "@/db/queries";
import { actOnTask, createRequisition, getWorkflowState, ApproverResolutionError } from "@/db/repo";
import { notifyForState } from "@/lib/notifications";
import { createDelegation, CircularDelegationError } from "@/db/delegations-repo";
import {
  AuthorizationError,
  WorkflowFinishedError,
  SendBackError,
  ClassificationRequiredError,
} from "@/domain/workflow";

export interface ActionState {
  error?: string;
  ok?: boolean;
}

export async function createReferatAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!user.orgUnitId) {
    return { error: "Contul tău nu este asociat unui birou. Contactează administratorul." };
  }

  const parsed = createReferatSchema.safeParse({
    item: formData.get("item"),
    quantity: formData.get("quantity"),
    justification: formData.get("justification"),
    costCenter: formData.get("costCenter"),
    estimatedValueLei: formData.get("estimatedValueLei") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Date invalide" };
  }

  let requisitionId: string;
  try {
    requisitionId = await createRequisition({
      requesterId: user.id,
      orgUnitId: user.orgUnitId,
      item: parsed.data.item,
      quantity: parsed.data.quantity,
      justification: parsed.data.justification,
      costCenter: parsed.data.costCenter,
      estimatedValueMinor: leiToBani(parsed.data.estimatedValueLei),
      needsIt: formData.get("needsIt") === "on",
      needsSsm: formData.get("needsSsm") === "on",
    });
  } catch (err) {
    if (err instanceof ApproverResolutionError) {
      return { error: "Nu există un aprobator configurat pentru fluxul tău. Contactează administratorul." };
    }
    throw err;
  }

  // Notify the first approver after the response is sent.
  after(async () => {
    const state = await getWorkflowState(requisitionId);
    await notifyForState(requisitionId, state);
  });

  redirect(`/referate/${requisitionId}?flash=create`);
}

export async function actReferatAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = actionSchema.safeParse({
    requisitionId: formData.get("requisitionId"),
    action: formData.get("action"),
    comment: formData.get("comment") ?? undefined,
    classification: formData.get("classification") ?? undefined,
  });
  if (!parsed.success) {
    throw new Error("Acțiune invalidă");
  }

  try {
    const next = await actOnTask({
      requisitionId: parsed.data.requisitionId,
      actorId: user.id,
      action: parsed.data.action,
      comment: parsed.data.comment,
      classification: parsed.data.classification,
    });
    after(() => notifyForState(parsed.data.requisitionId, next));
  } catch (err) {
    if (err instanceof ClassificationRequiredError) {
      throw new Error("Selectează tipul de achiziție (încadrarea) înainte de a aproba.");
    }
    if (
      err instanceof AuthorizationError ||
      err instanceof WorkflowFinishedError ||
      err instanceof SendBackError
    ) {
      // Authorization / state errors are not retryable from the UI; surface generically.
      throw new Error("Această acțiune nu este permisă pentru acest task.");
    }
    throw err;
  }

  revalidatePath(`/referate/${parsed.data.requisitionId}`);
  revalidatePath("/inbox");
  redirect(`/referate/${parsed.data.requisitionId}?flash=${parsed.data.action}`);
}

export async function createDelegationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = delegationSchema.safeParse({
    delegateId: formData.get("delegateId"),
    capability: formData.get("capability") ?? "",
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Date invalide" };
  }

  try {
    await createDelegation({
      delegatorId: user.id,
      delegateId: parsed.data.delegateId,
      capability: parsed.data.capability ? parsed.data.capability : null,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
    });
  } catch (err) {
    if (err instanceof CircularDelegationError) {
      return { error: "Delegarea ar crea un lanț circular (sau te alegi pe tine)." };
    }
    throw err;
  }

  revalidatePath("/delegari");
  revalidatePath("/admin");
  return {};
}

/** Admin-only: create a user (via Better Auth), set org unit + capabilities. */
export async function createUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser();
  if (!isAdmin(me)) return { error: "Doar administratorii pot crea utilizatori." };

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    orgUnitId: formData.get("orgUnitId") ?? undefined,
    capabilities: formData.getAll("capabilities"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide" };

  let userId: string;
  try {
    const res = await auth.api.signUpEmail({
      body: { name: parsed.data.name, email: parsed.data.email, password: parsed.data.password },
    });
    userId = res.user.id;
  } catch {
    return { error: "Nu am putut crea contul (email deja folosit?)." };
  }

  await db.update(users).set({ orgUnitId: parsed.data.orgUnitId }).where(eq(users.id, userId));
  if (parsed.data.capabilities.length) {
    await db
      .insert(userCapabilities)
      .values(parsed.data.capabilities.map((capability) => ({ userId, capability })))
      .onConflictDoNothing();
  }

  revalidatePath("/admin");
  return { ok: true };
}

/** Admin-only: update a user's name, org unit, and capabilities. */
export async function updateUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser();
  if (!isAdmin(me)) return { error: "Doar administratorii pot modifica utilizatorii." };

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    orgUnitId: formData.get("orgUnitId") ?? undefined,
    capabilities: formData.getAll("capabilities"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide" };

  await db.update(users).set({ name: parsed.data.name, orgUnitId: parsed.data.orgUnitId }).where(eq(users.id, parsed.data.userId));
  // Replace the capability set.
  await db.delete(userCapabilities).where(eq(userCapabilities.userId, parsed.data.userId));
  if (parsed.data.capabilities.length) {
    await db
      .insert(userCapabilities)
      .values(parsed.data.capabilities.map((capability) => ({ userId: parsed.data.userId, capability })))
      .onConflictDoNothing();
  }

  revalidatePath("/admin");
  return { ok: true };
}

/** Add a discussion comment to a referat. Any authenticated user may comment. */
export async function addCommentAction(formData: FormData): Promise<void> {
  const me = await requireUser();
  const parsed = commentSchema.safeParse({
    requisitionId: formData.get("requisitionId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return; // empty/invalid: no-op (the textarea is required client-side)

  // Only people involved in the referat may comment on it.
  if (!(await isInvolvedInRequisition(me.id, parsed.data.requisitionId))) return;

  await db.insert(requisitionComments).values({
    id: crypto.randomUUID(),
    requisitionId: parsed.data.requisitionId,
    authorId: me.id,
    body: parsed.data.body,
  });

  revalidatePath(`/referate/${parsed.data.requisitionId}`);
}

/** Parse + authorize a workflow-step form; returns the validated values or an error. */
function parseStep(formData: FormData) {
  return stepSchema.safeParse({
    stepId: formData.get("stepId") ?? undefined,
    label: formData.get("label"),
    taskType: formData.get("taskType"),
    requiredCapability: formData.get("requiredCapability"),
    approverStrategy: formData.get("approverStrategy"),
    approverParam: formData.get("approverParam") ?? undefined,
    conditionKind: formData.get("conditionKind"),
    conditionProcurement: formData.get("conditionProcurement") ?? undefined,
    conditionValueLei: formData.get("conditionValueLei") ?? undefined,
  });
}

/** Admin-only: append a new step to the approval-chain template. */
export async function addStepAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser();
  if (!isAdmin(me)) return { error: "Doar administratorii pot edita fluxul." };
  const parsed = parseStep(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide" };

  const [last] = await db.select({ o: approvalSteps.stepOrder }).from(approvalSteps).orderBy(desc(approvalSteps.stepOrder)).limit(1);
  await db.insert(approvalSteps).values({
    id: crypto.randomUUID(),
    stepOrder: (last?.o ?? 0) + 1,
    taskType: parsed.data.taskType,
    requiredCapability: parsed.data.requiredCapability,
    approverStrategy: parsed.data.approverStrategy,
    approverParam: parsed.data.approverParam,
    appliesWhen: buildAppliesWhen(parsed.data),
    blocking: formData.get("blocking") === "on",
    setsProcurementType: formData.get("setsProcurementType") === "on",
    label: parsed.data.label,
  });
  revalidatePath("/admin");
  return { ok: true };
}

/** Admin-only: update an existing step's definition (not its order). */
export async function updateStepAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser();
  if (!isAdmin(me)) return { error: "Doar administratorii pot edita fluxul." };
  const parsed = parseStep(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Date invalide" };
  if (!parsed.data.stepId) return { error: "Pas inexistent." };

  await db
    .update(approvalSteps)
    .set({
      taskType: parsed.data.taskType,
      requiredCapability: parsed.data.requiredCapability,
      approverStrategy: parsed.data.approverStrategy,
      approverParam: parsed.data.approverParam,
      appliesWhen: buildAppliesWhen(parsed.data),
      blocking: formData.get("blocking") === "on",
      setsProcurementType: formData.get("setsProcurementType") === "on",
      label: parsed.data.label,
    })
    .where(eq(approvalSteps.id, parsed.data.stepId));
  revalidatePath("/admin");
  return { ok: true };
}

/** Admin-only: delete a step from the template. Affects only future referate. */
export async function deleteStepAction(stepId: string): Promise<void> {
  const me = await requireUser();
  if (!isAdmin(me)) throw new Error("Doar administratorii pot edita fluxul.");
  await db.delete(approvalSteps).where(eq(approvalSteps.id, stepId));
  revalidatePath("/admin");
}

/** Admin-only: swap a step with its neighbour to reorder the chain. */
export async function moveStepAction(stepId: string, direction: "up" | "down"): Promise<void> {
  const me = await requireUser();
  if (!isAdmin(me)) throw new Error("Doar administratorii pot edita fluxul.");

  const steps = await db.select({ id: approvalSteps.id, order: approvalSteps.stepOrder }).from(approvalSteps).orderBy(approvalSteps.stepOrder);
  const i = steps.findIndex((s) => s.id === stepId);
  if (i === -1) return;
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= steps.length) return;

  const a = steps[i];
  const b = steps[j];
  // Swap orders via a temporary value to avoid the unique-order constraint.
  await db.transaction(async (tx) => {
    await tx.update(approvalSteps).set({ stepOrder: -1 }).where(eq(approvalSteps.id, a.id));
    await tx.update(approvalSteps).set({ stepOrder: a.order }).where(eq(approvalSteps.id, b.id));
    await tx.update(approvalSteps).set({ stepOrder: b.order }).where(eq(approvalSteps.id, a.id));
  });
  revalidatePath("/admin");
}

/** Mark the current user's notifications feed as read (records the seen time). */
export async function markNotificationsReadAction(): Promise<void> {
  const me = await requireUser();
  await db.update(users).set({ notificationsSeenAt: new Date() }).where(eq(users.id, me.id));
}

/** Admin-only: activate / deactivate a user account. */
export async function setUserActiveAction(userId: string, active: boolean): Promise<void> {
  const me = await requireUser();
  if (!isAdmin(me)) {
    throw new Error("Doar administratorii pot modifica utilizatorii.");
  }
  await db.update(users).set({ active }).where(eq(users.id, userId));
  // Deactivation takes effect immediately: drop the user's sessions so they
  // can't keep acting on an existing session until it expires.
  if (!active) await db.delete(sessions).where(eq(sessions.userId, userId));
  revalidatePath("/admin");
}

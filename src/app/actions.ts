"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { createReferatSchema, actionSchema, delegationSchema, leiToBani } from "@/lib/validation";
import { requireUser, isAdmin } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema";
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
  revalidatePath("/admin");
}

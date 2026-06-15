"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createReferatSchema, actionSchema, leiToBani } from "@/lib/validation";
import { requireUser } from "@/lib/session";
import { actOnTask, createRequisition, ApproverResolutionError } from "@/db/repo";
import { AuthorizationError, WorkflowFinishedError, SendBackError } from "@/domain/workflow";

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
    });
  } catch (err) {
    if (err instanceof ApproverResolutionError) {
      return { error: "Nu există un aprobator configurat pentru fluxul tău. Contactează administratorul." };
    }
    throw err;
  }

  redirect(`/referate/${requisitionId}`);
}

export async function actReferatAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = actionSchema.safeParse({
    requisitionId: formData.get("requisitionId"),
    action: formData.get("action"),
    comment: formData.get("comment") ?? undefined,
  });
  if (!parsed.success) {
    throw new Error("Acțiune invalidă");
  }

  try {
    await actOnTask({
      requisitionId: parsed.data.requisitionId,
      actorId: user.id,
      action: parsed.data.action,
      comment: parsed.data.comment,
    });
  } catch (err) {
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
  redirect(`/referate/${parsed.data.requisitionId}`);
}

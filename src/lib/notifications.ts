import "server-only";
import { render } from "@react-email/render";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { requisitions, users } from "@/db/schema";
import { sendMail } from "./mail";
import { NotificationEmail } from "@/emails/notification";
import { TASK_TYPE_LABELS } from "./labels";
import { activeTask, type WorkflowState } from "@/domain/workflow";

const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

async function userById(id: string) {
  const [row] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

/**
 * Send the appropriate notification for the workflow's current state:
 *  - a step is waiting -> notify that approver ("you have a referat to approve")
 *  - finished (approved/rejected) -> notify the requester
 * Used after both creation and every action. Never throws.
 */
export async function notifyForState(requisitionId: string, state: WorkflowState): Promise<void> {
  try {
    const [req] = await db
      .select({ item: requisitions.item })
      .from(requisitions)
      .where(eq(requisitions.id, requisitionId))
      .limit(1);
    if (!req) return;
    const url = `${APP_URL}/referate/${requisitionId}`;
    const active = activeTask(state);

    if (active) {
      const approver = await userById(active.effectiveApproverId);
      const requester = await userById(state.requesterId);
      if (!approver) return;
      const html = await render(
        NotificationEmail({
          heading: "Ai un referat de aprobat",
          intro: `${requester?.name ?? "Un angajat"} a trimis un referat care așteaptă acțiunea ta (${TASK_TYPE_LABELS[active.taskType] ?? active.taskType}).`,
          itemLabel: "Referat",
          itemValue: req.item,
          ctaLabel: "Deschide referatul",
          ctaUrl: url,
        }),
      );
      await sendMail({ to: approver.email, subject: `Aviso: referat de aprobat — ${req.item}`, html });
      return;
    }

    // finished -> notify requester
    const requester = await userById(state.requesterId);
    if (!requester) return;
    const approved = state.status === "approved";
    const html = await render(
      NotificationEmail({
        heading: approved ? "Referat aprobat" : "Referat respins",
        intro: approved
          ? "Referatul tău a fost aprobat pe întreg fluxul."
          : "Referatul tău a fost respins. Vezi istoricul pentru detalii.",
        itemLabel: "Referat",
        itemValue: req.item,
        ctaLabel: "Vezi referatul",
        ctaUrl: url,
      }),
    );
    await sendMail({
      to: requester.email,
      subject: `Aviso: referat ${approved ? "aprobat" : "respins"} — ${req.item}`,
      html,
    });
  } catch (err) {
    console.error("[notifications] failed", err);
  }
}

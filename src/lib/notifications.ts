import "server-only";
import { render } from "@react-email/render";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { requisitions, users } from "@/db/schema";
import { sendMail } from "./mail";
import { NotificationEmail } from "@/emails/notification";
import { taskTypeLabel } from "./labels";
import { loadMessages } from "@/i18n/messages";
import { coerceLocale } from "@/i18n/locale";
import { activeTask, type WorkflowState } from "@/domain/workflow";
import type { Locale } from "@/i18n/locale";

const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

interface EmailBlock {
  heading: string;
  intro: string;
  cta: string;
  subject: string;
}
interface EmailDict {
  itemLabel: string;
  someoneFallback: string;
  footer: string;
  approval: EmailBlock;
  approved: EmailBlock;
  rejected: EmailBlock;
}
const emailDict = (locale: Locale): EmailDict => loadMessages(locale).email as unknown as EmailDict;

async function userById(id: string) {
  const [row] = await db
    .select({ name: users.name, email: users.email, locale: users.locale })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row ?? null;
}

const fill = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);

/**
 * Send the appropriate notification for the workflow's current state:
 *  - a step is waiting -> notify that approver ("you have a referat to approve")
 *  - finished (approved/rejected) -> notify the requester
 * Each email renders in the RECIPIENT's preferred language (users.locale).
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
      const locale = coerceLocale(approver.locale);
      const e = emailDict(locale);
      const html = await render(
        NotificationEmail({
          heading: e.approval.heading,
          intro: fill(e.approval.intro, {
            requester: requester?.name ?? e.someoneFallback,
            task: taskTypeLabel(active.taskType, locale),
          }),
          itemLabel: e.itemLabel,
          itemValue: req.item,
          ctaLabel: e.approval.cta,
          ctaUrl: url,
          footer: e.footer,
          locale,
        }),
      );
      await sendMail({ to: approver.email, subject: fill(e.approval.subject, { item: req.item }), html });
      return;
    }

    // finished -> notify requester
    const requester = await userById(state.requesterId);
    if (!requester) return;
    const locale = coerceLocale(requester.locale);
    const approved = state.status === "approved";
    const em = emailDict(locale);
    const block = approved ? em.approved : em.rejected;
    const html = await render(
      NotificationEmail({
        heading: block.heading,
        intro: block.intro,
        itemLabel: em.itemLabel,
        itemValue: req.item,
        ctaLabel: block.cta,
        ctaUrl: url,
        footer: em.footer,
        locale,
      }),
    );
    await sendMail({
      to: requester.email,
      subject: fill(block.subject, { item: req.item }),
      html,
    });
  } catch (err) {
    console.error("[notifications] failed", err);
  }
}

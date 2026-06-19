import "server-only";
import nodemailer from "nodemailer";

/**
 * SMTP transport. Locally this points at Mailpit (host localhost:1025, no auth);
 * in production set SMTP_HOST/PORT/USER/PASS to the real relay — no code change.
 */
const host = process.env.SMTP_HOST ?? "localhost";
const port = Number(process.env.SMTP_PORT ?? 1025);
const user = process.env.SMTP_USER || undefined;
const pass = process.env.SMTP_PASS || undefined;

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: user ? { user, pass } : undefined,
});

const FROM = process.env.SMTP_FROM ?? "HydroKov <no-reply@aviso.local>";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Send an email with a few retries and exponential backoff. Never throws — a
 * failed notification must not break the workflow action that triggered it.
 */
export async function sendMail(message: MailMessage, attempts = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await transporter.sendMail({ from: FROM, ...message });
      return true;
    } catch (err) {
      if (attempt === attempts) {
        console.error(`[mail] failed after ${attempts} attempts: ${message.subject}`, err);
        return false;
      }
      await sleep(250 * 2 ** (attempt - 1));
    }
  }
  return false;
}

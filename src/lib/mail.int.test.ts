import { beforeEach, describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import { sendMail } from "./mail";
import { NotificationEmail } from "@/emails/notification";

/**
 * Verifies the render + SMTP transport against a running Mailpit
 * (docker compose up mailpit). Run with: RUN_DB_TESTS=1 pnpm test:int
 */
const run = describe.skipIf(!process.env.RUN_DB_TESTS);
const MAILPIT = "http://localhost:8025";

run("mail -> Mailpit", () => {
  beforeEach(async () => {
    await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
  });

  it("renders the template and delivers it to Mailpit", async () => {
    const html = await render(
      NotificationEmail({
        heading: "Ai un referat de aprobat",
        intro: "Test de notificare.",
        itemLabel: "Referat",
        itemValue: "Laptop birou",
        ctaLabel: "Deschide",
        ctaUrl: "http://localhost:3000/referate/test",
      }),
    );
    expect(html).toContain("Laptop birou");

    const ok = await sendMail({ to: "aprobator@aviso.local", subject: "Aviso: referat de aprobat — Laptop birou", html });
    expect(ok).toBe(true);

    const res = await fetch(`${MAILPIT}/api/v1/messages`);
    const data = (await res.json()) as { messages: Array<{ Subject: string; To: Array<{ Address: string }> }> };
    const found = data.messages.find((m) => m.Subject.includes("Laptop birou"));
    expect(found).toBeTruthy();
    expect(found!.To[0].Address).toBe("aprobator@aviso.local");
  });
});

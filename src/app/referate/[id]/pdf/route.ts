import { NextResponse } from "next/server";
import { requireUser, isAdmin } from "@/lib/session";
import { referatDocument, isInvolvedInRequisition } from "@/db/queries";
import { renderReferatDocument } from "@/lib/referat-document";
import { htmlToPdf } from "@/lib/pdf";
import { readLocaleCookie } from "@/i18n/locale.server";

// PDF rendering (Chromium cold start + render) can take a while on serverless.
export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await ctx.params;

  // Same read-gate as the detail page: only involved users (or admins).
  if (!isAdmin(user) && !(await isInvolvedInRequisition(user.id, id))) {
    return new NextResponse("Referat inexistent", { status: 404 });
  }

  const data = await referatDocument(id);
  if (!data) return new NextResponse("Referat inexistent", { status: 404 });
  // The official document is produced only at a terminal state: fully approved,
  // or initiated in SEAP (the <5000 + SEAP branch).
  if (data.status !== "approved" && data.status !== "seap_initiated") {
    return new NextResponse("Referatul nu este finalizat încă.", { status: 409 });
  }

  const locale = await readLocaleCookie();
  const html = renderReferatDocument(data, new Date(), locale);

  // On serverless (Vercel): serve the print-ready document as an HTML page that
  // opens the browser's print dialog (→ Save as PDF). No headless Chromium on
  // the server, so nothing to bundle/trace — reliable everywhere.
  if (process.env.VERCEL) {
    const printable = html.replace(
      "</body>",
      "<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300))</script></body>",
    );
    return new NextResponse(printable, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Local / self-hosted VPS: generate a real downloadable PDF via Puppeteer.
  const pdf = await htmlToPdf(html);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="referat-${id.slice(0, 8)}.pdf"`,
    },
  });
}

import { NextResponse } from "next/server";
import { requireUser, isAdmin } from "@/lib/session";
import { referatDocument, isInvolvedInRequisition } from "@/db/queries";
import { renderReferatDocument } from "@/lib/referat-document";
import { htmlToPdf } from "@/lib/pdf";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await ctx.params;

  // Same read-gate as the detail page: only involved users (or admins).
  if (!isAdmin(user) && !(await isInvolvedInRequisition(user.id, id))) {
    return new NextResponse("Referat inexistent", { status: 404 });
  }

  const data = await referatDocument(id);
  if (!data) return new NextResponse("Referat inexistent", { status: 404 });
  // The finalized PDF is produced only after the chain is fully approved.
  if (data.status !== "approved") {
    return new NextResponse("Referatul nu este aprobat încă.", { status: 409 });
  }

  const pdf = await htmlToPdf(renderReferatDocument(data, new Date()));
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="referat-${id.slice(0, 8)}.pdf"`,
    },
  });
}

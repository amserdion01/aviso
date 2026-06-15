import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { referatDocument } from "@/db/queries";
import { renderReferatDocument } from "@/lib/referat-document";
import { htmlToPdf } from "@/lib/pdf";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await ctx.params;

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

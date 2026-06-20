import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { requisitionDetail } from "@/db/queries";
import { EditReferatForm } from "@/components/edit-referat-form";
import { PageHead } from "@/components/ui/primitives";

export default async function EditReferatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const t = await getTranslations();
  const { id } = await params;
  const detail = await requisitionDetail(id);
  if (!detail) notFound();

  const { requisition: r } = detail;
  if (user.id !== r.requesterId || r.status !== "returned") {
    redirect(`/referate/${id}`);
  }

  return (
    <div className="avi-screen avi-screen--narrow">
      <PageHead title={t("referatNew.editTitle")} sub={t("referatNew.editSub")} />
      <EditReferatForm
        requisition={{
          id: r.id,
          workflowId: r.workflowId ?? "",
          item: r.item,
          quantity: r.quantity,
          justification: r.justification,
          costCenter: r.costCenter,
          estimatedValueMinor: r.estimatedValueMinor,
          inPaap: r.inPaap,
          notaJustificativa: r.notaJustificativa,
        }}
      />
    </div>
  );
}

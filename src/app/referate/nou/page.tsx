import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { CreateReferatForm } from "@/components/create-referat-form";
import { PageHead } from "@/components/ui/primitives";
import { activeWorkflows } from "@/db/queries";

export default async function NewReferatPage() {
  await requireUser();
  const t = await getTranslations();
  const workflows = await activeWorkflows();
  return (
    <div className="avi-screen avi-screen--narrow">
      <PageHead title={t("referatNew.title")} sub={t("referatNew.sub")} />
      <CreateReferatForm workflows={workflows} />
    </div>
  );
}

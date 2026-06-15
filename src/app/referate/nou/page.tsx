import { requireUser } from "@/lib/session";
import { CreateReferatForm } from "@/components/create-referat-form";
import { PageHead } from "@/components/ui/primitives";
import { activeWorkflows } from "@/db/queries";

export default async function NewReferatPage() {
  await requireUser();
  const workflows = await activeWorkflows();
  return (
    <div className="avi-screen avi-screen--narrow">
      <PageHead title="Referat nou de necesitate" sub="Completează detaliile cererii. După trimitere intră pe traseul de avizare." />
      <CreateReferatForm workflows={workflows} />
    </div>
  );
}

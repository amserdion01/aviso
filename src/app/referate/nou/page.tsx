import { requireUser } from "@/lib/session";
import { CreateReferatForm } from "@/components/create-referat-form";
import { PageHead } from "@/components/ui/primitives";

export default async function NewReferatPage() {
  await requireUser();
  return (
    <div className="avi-screen avi-screen--narrow">
      <PageHead title="Referat nou de necesitate" sub="Completează detaliile cererii. După trimitere intră pe traseul de avizare." />
      <CreateReferatForm />
    </div>
  );
}

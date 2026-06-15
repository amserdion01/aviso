import { requireUser } from "@/lib/session";
import { CreateReferatForm } from "@/components/create-referat-form";

export default async function NewReferatPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-xl font-semibold">Referat de necesitate nou</h1>
      <CreateReferatForm />
    </div>
  );
}

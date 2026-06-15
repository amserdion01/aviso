import { requireUser } from "@/lib/session";
import { myDelegations, selectableUsers } from "@/db/queries";
import { DelegationForm } from "@/components/delegation-form";

export default async function DelegariPage() {
  const user = await requireUser();
  const [delegationsList, users] = await Promise.all([myDelegations(user.id), selectableUsers(user.id)]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-xl font-semibold">Delegări</h1>
        <p className="text-sm text-gray-500">
          Desemnează un înlocuitor care îți preia taskurile pe o perioadă (concediu etc.).
        </p>
      </div>

      <DelegationForm users={users} capabilities={user.capabilities} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Delegările mele</h2>
        {delegationsList.length === 0 ? (
          <p className="text-sm text-gray-500">Nu ai nicio delegare.</p>
        ) : (
          <ul className="divide-y rounded border bg-white">
            {delegationsList.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  → <span className="font-medium">{d.delegateName}</span>{" "}
                  <span className="text-gray-500">({d.capability ?? "toate capabilitățile"})</span>
                </span>
                <span className="text-gray-500">
                  {d.startsAt.toLocaleDateString("ro-RO")} – {d.endsAt.toLocaleDateString("ro-RO")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/session";
import { myRequisitions, inboxFor } from "@/db/queries";
import { STATUS_LABELS } from "@/lib/labels";

export default async function HomePage() {
  const user = await requireUser();
  const [mine, inbox] = await Promise.all([myRequisitions(user.id), inboxFor(user.id)]);

  return (
    <div className="space-y-8">
      <section className="flex items-center gap-4">
        <Link href="/referate/nou" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
          Referat nou
        </Link>
        <Link href="/inbox" className="text-sm hover:underline">
          Inbox ({inbox.length})
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Referatele mele</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-gray-500">Nu ai creat încă niciun referat.</p>
        ) : (
          <ul className="divide-y rounded border bg-white">
            {mine.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3">
                <Link href={`/referate/${r.id}`} className="hover:underline">
                  {r.item} <span className="text-gray-500">×{r.quantity}</span>
                </Link>
                <span className="text-sm text-gray-500">{STATUS_LABELS[r.status] ?? r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

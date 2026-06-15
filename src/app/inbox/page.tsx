import Link from "next/link";
import { requireUser } from "@/lib/session";
import { inboxFor } from "@/db/queries";
import { TASK_TYPE_LABELS } from "@/lib/labels";

export default async function InboxPage() {
  const user = await requireUser();
  const tasks = await inboxFor(user.id);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Inbox — de aprobat</h1>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500">Nu ai niciun task de aprobat.</p>
      ) : (
        <ul className="divide-y rounded border bg-white">
          {tasks.map((t) => (
            <li key={t.taskId} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link href={`/referate/${t.requisitionId}`} className="font-medium hover:underline">
                  {t.item} <span className="text-gray-500">×{t.quantity}</span>
                </Link>
                <p className="text-sm text-gray-500">
                  {TASK_TYPE_LABELS[t.taskType] ?? t.taskType} · solicitant: {t.requesterName}
                  {t.onBehalfOf && <span className="ml-1 text-amber-700">· în numele {t.onBehalfOf}</span>}
                </p>
              </div>
              <Link href={`/referate/${t.requisitionId}`} className="text-sm text-blue-600 hover:underline">
                Deschide →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

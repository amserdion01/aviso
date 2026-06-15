import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { requisitionDetail } from "@/db/queries";
import { actReferatAction } from "@/app/actions";
import {
  STATUS_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  ACTION_LABELS,
  formatLei,
} from "@/lib/labels";

export default async function ReferatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const detail = await requisitionDetail(id);
  if (!detail) notFound();

  const { requisition: r, tasks, history, activeTask } = detail;
  const isMyTask = activeTask?.effectiveApproverId === user.id;
  const hasPrevious = tasks.some((t) => activeTask && t.stepOrder < activeTask.stepOrder && t.status === "approved");

  return (
    <div className="space-y-8">
      <section className="rounded border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{r.item}</h1>
          <span className="rounded bg-gray-100 px-2 py-1 text-sm">{STATUS_LABELS[r.status] ?? r.status}</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div><dt className="text-gray-500">Cantitate</dt><dd>{r.quantity}</dd></div>
          <div><dt className="text-gray-500">Valoare estimată</dt><dd>{formatLei(r.estimatedValueMinor)}</dd></div>
          <div><dt className="text-gray-500">Centru de cost</dt><dd>{r.costCenter}</dd></div>
          <div className="col-span-2"><dt className="text-gray-500">Justificare</dt><dd>{r.justification}</dd></div>
        </dl>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Pași de aprobare</h2>
        <ol className="divide-y rounded border bg-white">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>{TASK_TYPE_LABELS[t.taskType] ?? t.taskType}</span>
              <span className={t.status === "waiting" ? "font-medium text-blue-600" : "text-gray-500"}>
                {TASK_STATUS_LABELS[t.status] ?? t.status}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {isMyTask && (
        <section className="rounded border border-blue-200 bg-blue-50 p-5">
          <h2 className="mb-3 text-lg font-semibold">Acțiunea ta</h2>
          <form action={actReferatAction} className="space-y-3">
            <input type="hidden" name="requisitionId" value={r.id} />
            <textarea
              name="comment"
              rows={2}
              placeholder="Comentariu (opțional; obligatoriu la respingere / trimitere înapoi)"
              className="w-full rounded border px-3 py-2 text-sm"
            />
            <div className="flex gap-3">
              <button name="action" value="approve" className="rounded bg-green-700 px-4 py-2 text-sm text-white">
                Aprobă
              </button>
              <button name="action" value="reject" className="rounded bg-red-700 px-4 py-2 text-sm text-white">
                Respinge
              </button>
              {hasPrevious && (
                <button name="action" value="send_back" className="rounded bg-amber-600 px-4 py-2 text-sm text-white">
                  Trimite înapoi
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Istoric</h2>
        <ul className="space-y-2">
          {history.map((h) => (
            <li key={h.seq} className="rounded border bg-white px-4 py-2 text-sm">
              <span className="font-medium">{ACTION_LABELS[h.action] ?? h.action}</span>{" "}
              — {h.actorName}{" "}
              <span className="text-gray-400">{h.createdAt.toLocaleString("ro-RO")}</span>
              {h.comment && <p className="text-gray-600">„{h.comment}”</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

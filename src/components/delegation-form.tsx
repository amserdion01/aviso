"use client";
import { useActionState } from "react";
import { createDelegationAction, type ActionState } from "@/app/actions";

const initial: ActionState = {};

interface Props {
  users: Array<{ id: string; name: string; email: string }>;
  capabilities: string[];
}

export function DelegationForm({ users, capabilities }: Props) {
  const [state, formAction, pending] = useActionState(createDelegationAction, initial);

  return (
    <form action={formAction} className="space-y-4 rounded border bg-white p-5">
      <div>
        <label className="mb-1 block text-sm font-medium">Înlocuitor</label>
        <select name="delegateId" required defaultValue="" className="w-full rounded border px-3 py-2 text-sm">
          <option value="" disabled>
            Alege un utilizator…
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Pentru capabilitatea</label>
        <select name="capability" defaultValue="" className="w-full rounded border px-3 py-2 text-sm">
          <option value="">Toate capabilitățile mele</option>
          {capabilities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">De la</label>
          <input name="startsAt" type="date" required className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Până la</label>
          <input name="endsAt" type="date" required className="w-full rounded border px-3 py-2 text-sm" />
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50">
        {pending ? "Se salvează…" : "Adaugă delegare"}
      </button>
    </form>
  );
}

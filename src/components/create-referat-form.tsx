"use client";
import { useActionState } from "react";
import { createReferatAction, type ActionState } from "@/app/actions";

const initial: ActionState = {};

export function CreateReferatForm() {
  const [state, formAction, pending] = useActionState(createReferatAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Articol</label>
        <input name="item" required className="w-full rounded border px-3 py-2" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Cantitate</label>
          <input name="quantity" type="number" min={1} required className="w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Valoare estimată (lei)</label>
          <input name="estimatedValueLei" type="number" min={0} step="0.01" className="w-full rounded border px-3 py-2" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Centru de cost</label>
        <input name="costCenter" required className="w-full rounded border px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Justificare</label>
        <textarea name="justification" required rows={4} className="w-full rounded border px-3 py-2" />
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Avize necesare</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="needsIt" /> Necesită aviz IT
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="needsSsm" /> Necesită aviz SSM
        </label>
      </fieldset>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Se trimite…" : "Trimite referatul"}
      </button>
    </form>
  );
}

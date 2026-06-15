"use client";
import { useActionState } from "react";
import { createDelegationAction, type ActionState } from "@/app/actions";
import { FormField, Input, Select, Switch, Button } from "@/components/ui/primitives";
import { CAPABILITY_LABELS } from "@/lib/labels";
import { Icon } from "@/components/ui/icon";

const initial: ActionState = {};

interface Props {
  users: Array<{ id: string; name: string; email: string }>;
  capabilities: string[];
  submitLabel?: string;
}

export function DelegationForm({ users, capabilities, submitLabel = "Adaugă delegare" }: Props) {
  const [state, formAction, pending] = useActionState(createDelegationAction, initial);

  return (
    <form action={formAction} className="avi-dialog-form">
      <FormField label="Înlocuitor" required>
        <Select
          name="delegateId"
          required
          defaultValue=""
          placeholder="Alege un utilizator…"
          options={users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))}
        />
      </FormField>

      <FormField label="Pentru capabilitatea" hint="Lasă gol pentru toate capabilitățile tale.">
        <Select
          name="capability"
          defaultValue=""
          options={[{ value: "", label: "Toate capabilitățile mele" }, ...capabilities.map((c) => ({ value: c, label: CAPABILITY_LABELS[c] ?? c }))]}
        />
      </FormField>

      <div className="avi-two-col">
        <FormField label="De la" required>
          <Input name="startsAt" type="date" required />
        </FormField>
        <FormField label="Până la" required>
          <Input name="endsAt" type="date" required />
        </FormField>
      </div>

      <Switch name="active" label="Activează imediat" defaultChecked />

      {state.error && (
        <p className="avi-formfield__error">
          <Icon name="alert-circle" /> {state.error}
        </p>
      )}

      <div>
        <Button type="submit" variant="primary" iconLeft={<Icon name="plus" />} disabled={pending}>
          {pending ? "Se salvează…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

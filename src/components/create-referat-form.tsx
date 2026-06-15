"use client";
import { useActionState } from "react";
import { createReferatAction, type ActionState } from "@/app/actions";
import { Card, FormField, Input, Textarea, Select, Checkbox, Button } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";

const initial: ActionState = {};

const COST_CENTERS = [
  "Mentenanță rețea",
  "Stație de tratare",
  "Distribuție apă",
  "IT & comunicații",
  "Laborator calitate",
  "Parc auto",
  "Administrativ",
];

export function CreateReferatForm({ workflows }: { workflows: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createReferatAction, initial);
  const singleWorkflow = workflows.length === 1;

  return (
    <form action={formAction}>
      <Card padding="lg">
        <div className="avi-form-grid">
          <div className="avi-col-2">
            <FormField label="Categorie / tip referat" htmlFor="r-workflow" required hint="Determină traseul de avizare.">
              <Select
                id="r-workflow"
                name="workflowId"
                required
                defaultValue={singleWorkflow ? workflows[0].id : ""}
                placeholder={singleWorkflow ? undefined : "Alege categoria"}
                options={workflows.map((w) => ({ value: w.id, label: w.name }))}
              />
            </FormField>
          </div>

          <div className="avi-col-2">
            <FormField label="Articol" htmlFor="r-articol" required hint="Denumirea exactă a produsului sau serviciului.">
              <Input id="r-articol" name="item" required prefix={<Icon name="package" />} placeholder="ex. Laptop Dell Latitude 5540" />
            </FormField>
          </div>

          <FormField label="Cantitate" htmlFor="r-cant" required>
            <Input id="r-cant" name="quantity" type="number" min={1} defaultValue={1} required suffix="buc." />
          </FormField>

          <FormField label="Valoare estimată" htmlFor="r-val" optional>
            <Input id="r-val" name="estimatedValueLei" type="number" min={0} step="0.01" suffix="RON" placeholder="0,00" />
          </FormField>

          <div className="avi-col-2">
            <FormField label="Centru de cost" htmlFor="r-centru" required>
              <Select id="r-centru" name="costCenter" required defaultValue="" placeholder="Alege centrul de cost" options={COST_CENTERS} />
            </FormField>
          </div>

          <div className="avi-col-2">
            <FormField label="Justificare" htmlFor="r-just" required hint="Explică necesitatea achiziției — va fi vizibilă aprobatorilor.">
              <Textarea
                id="r-just"
                name="justification"
                rows={4}
                required
                placeholder="ex. Laptopurile actuale nu mai pornesc și blochează activitatea biroului IT…"
              />
            </FormField>
          </div>

          <div className="avi-col-2">
            <FormField label="Avize necesare">
              <div style={{ display: "flex", gap: "var(--space-8)", flexWrap: "wrap" }}>
                <Checkbox name="needsIt" label="Necesită aviz IT" />
                <Checkbox name="needsSsm" label="Necesită aviz SSM" />
              </div>
            </FormField>
          </div>
        </div>

        <div className="avi-form-note">
          <Icon name="info" />
          <span>
            După trimitere, referatul intră pe traseul de avizare pe roluri (șef birou → șef serviciu → … → director),
            iar fiecare aprobator poate aproba, respinge sau trimite înapoi.
          </span>
        </div>

        {state.error && (
          <div className="avi-form-note" style={{ background: "var(--status-rejected-bg)", borderColor: "var(--status-rejected-border)", color: "var(--status-rejected-text)" }}>
            <Icon name="alert-circle" />
            <span>{state.error}</span>
          </div>
        )}

        <div className="avi-form-actions">
          <ResetLink />
          <div style={{ flex: 1 }} />
          <Button type="submit" variant="primary" iconLeft={<Icon name="send" />} disabled={pending}>
            {pending ? "Se trimite…" : "Trimite referatul"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

function ResetLink() {
  return (
    <Button type="reset" variant="ghost">
      Renunță
    </Button>
  );
}

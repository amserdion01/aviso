"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(createReferatAction, initial);
  const singleWorkflow = workflows.length === 1;

  return (
    <form action={formAction}>
      <Card padding="lg">
        <div className="avi-form-grid">
          <div className="avi-col-2">
            <FormField label={t("referatNew.fields.workflow.label")} htmlFor="r-workflow" required hint={t("referatNew.fields.workflow.hint")}>
              <Select
                id="r-workflow"
                name="workflowId"
                required
                defaultValue={singleWorkflow ? workflows[0].id : ""}
                placeholder={singleWorkflow ? undefined : t("referatNew.fields.workflow.placeholder")}
                options={workflows.map((w) => ({ value: w.id, label: w.name }))}
              />
            </FormField>
          </div>

          <div className="avi-col-2">
            <FormField label={t("referatNew.fields.item.label")} htmlFor="r-articol" required hint={t("referatNew.fields.item.hint")}>
              <Input id="r-articol" name="item" required prefix={<Icon name="package" />} placeholder={t("referatNew.fields.item.placeholder")} />
            </FormField>
          </div>

          <FormField label={t("referatNew.fields.quantity.label")} htmlFor="r-cant" required>
            <Input id="r-cant" name="quantity" type="number" min={1} defaultValue={1} required suffix={t("common.pieces")} />
          </FormField>

          <FormField label={t("referatNew.fields.estimatedValue.label")} htmlFor="r-val" optional>
            <Input id="r-val" name="estimatedValueLei" type="number" min={0} step="0.01" suffix="RON" placeholder={t("referatNew.fields.estimatedValue.placeholder")} />
          </FormField>

          <div className="avi-col-2">
            <FormField label={t("referatNew.fields.costCenter.label")} htmlFor="r-centru" required>
              <Select id="r-centru" name="costCenter" required defaultValue="" placeholder={t("referatNew.fields.costCenter.placeholder")} options={COST_CENTERS} />
            </FormField>
          </div>

          <div className="avi-col-2">
            <FormField label={t("referatNew.fields.justification.label")} htmlFor="r-just" required hint={t("referatNew.fields.justification.hint")}>
              <Textarea
                id="r-just"
                name="justification"
                rows={4}
                required
                placeholder={t("referatNew.fields.justification.placeholder")}
              />
            </FormField>
          </div>

          <div className="avi-col-2">
            <FormField label={t("referatNew.fields.approvals.label")}>
              <div style={{ display: "flex", gap: "var(--space-8)", flexWrap: "wrap" }}>
                <Checkbox name="needsIt" label={t("referatNew.fields.approvals.needsIt")} />
                <Checkbox name="needsSsm" label={t("referatNew.fields.approvals.needsSsm")} />
              </div>
            </FormField>
          </div>
        </div>

        <div className="avi-form-note">
          <Icon name="info" />
          <span>{t("referatNew.flowNote")}</span>
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
            {pending ? t("common.sending") : t("referatNew.submit")}
          </Button>
        </div>
      </Card>
    </form>
  );
}

function ResetLink() {
  const t = useTranslations();
  return (
    <Button type="reset" variant="ghost">
      {t("common.cancel")}
    </Button>
  );
}

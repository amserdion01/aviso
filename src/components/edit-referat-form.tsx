"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { resubmitReferatAction, type ActionState } from "@/app/actions";
import { Card, FormField, Input, Textarea, Select, Switch, Button } from "@/components/ui/primitives";
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

type EditReferat = {
  id: string;
  workflowId: string;
  item: string;
  quantity: number;
  justification: string;
  costCenter: string;
  estimatedValueMinor: number | null;
  inPaap: boolean;
  notaJustificativa: string | null;
};

export function EditReferatForm({ requisition }: { requisition: EditReferat }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(resubmitReferatAction, initial);
  const [inPaap, setInPaap] = useState(requisition.inPaap);
  const estimatedValueLei =
    requisition.estimatedValueMinor != null ? requisition.estimatedValueMinor / 100 : "";

  return (
    <form action={formAction}>
      <input type="hidden" name="requisitionId" value={requisition.id} />
      <input type="hidden" name="workflowId" value={requisition.workflowId} />
      <Card padding="lg">
        <div className="avi-form-grid">
          <div className="avi-col-2">
            <FormField label={t("referatNew.fields.item.label")} htmlFor="r-articol" required hint={t("referatNew.fields.item.hint")}>
              <Input id="r-articol" name="item" required defaultValue={requisition.item} prefix={<Icon name="package" />} placeholder={t("referatNew.fields.item.placeholder")} />
            </FormField>
          </div>

          <FormField label={t("referatNew.fields.quantity.label")} htmlFor="r-cant" required>
            <Input id="r-cant" name="quantity" type="number" min={1} defaultValue={requisition.quantity} required suffix={t("common.pieces")} />
          </FormField>

          <FormField label={t("referatNew.fields.estimatedValue.label")} htmlFor="r-val" optional optionalLabel={t("common.optional")} hint={t("referatNew.fields.estimatedValue.hint")}>
            <Input id="r-val" name="estimatedValueLei" type="number" min={0} step="0.01" defaultValue={estimatedValueLei} suffix="RON" placeholder={t("referatNew.fields.estimatedValue.placeholder")} />
          </FormField>

          <div className="avi-col-2">
            <FormField label={t("referatNew.fields.costCenter.label")} htmlFor="r-centru" required>
              <Select id="r-centru" name="costCenter" required defaultValue={requisition.costCenter} placeholder={t("referatNew.fields.costCenter.placeholder")} options={COST_CENTERS} />
            </FormField>
          </div>

          <div className="avi-col-2">
            <FormField label={t("referatNew.fields.justification.label")} htmlFor="r-just" required hint={t("referatNew.fields.justification.hint")}>
              <Textarea
                id="r-just"
                name="justification"
                rows={4}
                required
                defaultValue={requisition.justification}
                placeholder={t("referatNew.fields.justification.placeholder")}
              />
            </FormField>
          </div>

          <div className="avi-col-2">
            <FormField label={t("referatNew.paap.label")} hint={t("referatNew.paap.hint")}>
              <Switch
                name="inPaap"
                checked={inPaap}
                onChange={(e) => setInPaap(e.currentTarget.checked)}
                label={t("referatNew.paap.label")}
              />
            </FormField>
          </div>

          {!inPaap && (
            <div className="avi-col-2">
              <FormField label={t("referatNew.nota.label")} htmlFor="r-nota" required hint={t("referatNew.nota.hint")}>
                <Textarea
                  id="r-nota"
                  name="notaJustificativa"
                  rows={3}
                  required
                  defaultValue={requisition.notaJustificativa ?? ""}
                  placeholder={t("referatNew.nota.placeholder")}
                />
              </FormField>
            </div>
          )}
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
          <Link href={`/referate/${requisition.id}`} className="avi-btn avi-btn--ghost">
            {t("common.cancel")}
          </Link>
          <div style={{ flex: 1 }} />
          <Button type="submit" variant="primary" iconLeft={<Icon name="send" />} disabled={pending}>
            {pending ? t("common.sending") : t("referatNew.resubmit")}
          </Button>
        </div>
      </Card>
    </form>
  );
}

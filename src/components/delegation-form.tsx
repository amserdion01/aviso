"use client";
import { useActionState } from "react";
import { createDelegationAction, type ActionState } from "@/app/actions";
import { FormField, Input, Select, Switch, Button } from "@/components/ui/primitives";
import { capabilityLabel } from "@/lib/labels";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/i18n/locale";
import { Icon } from "@/components/ui/icon";

const initial: ActionState = {};

interface Props {
  users: Array<{ id: string; name: string; email: string }>;
  capabilities: string[];
  submitLabel?: string;
}

export function DelegationForm({ users, capabilities, submitLabel }: Props) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [state, formAction, pending] = useActionState(createDelegationAction, initial);
  const label = submitLabel ?? t("delegationForm.submitLabel");

  return (
    <form action={formAction} className="avi-dialog-form">
      <FormField label={t("delegationForm.inlocuitor")} required>
        <Select
          name="delegateId"
          required
          defaultValue=""
          placeholder={t("delegationForm.inlocuitorPlaceholder")}
          options={users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))}
        />
      </FormField>

      <FormField label={t("delegationForm.capability")} hint={t("delegationForm.capabilityHint")}>
        <Select
          name="capability"
          defaultValue=""
          options={[{ value: "", label: t("delegationForm.allCapabilities") }, ...capabilities.map((c) => ({ value: c, label: capabilityLabel(c, locale) }))]}
        />
      </FormField>

      <div className="avi-two-col">
        <FormField label={t("delegationForm.from")} required>
          <Input name="startsAt" type="date" required />
        </FormField>
        <FormField label={t("delegationForm.to")} required>
          <Input name="endsAt" type="date" required />
        </FormField>
      </div>

      <Switch name="active" label={t("delegationForm.activateNow")} defaultChecked />

      {state.error && (
        <p className="avi-formfield__error">
          <Icon name="alert-circle" /> {state.error}
        </p>
      )}

      <div>
        <Button type="submit" variant="primary" iconLeft={<Icon name="plus" />} disabled={pending}>
          {pending ? t("common.saving") : label}
        </Button>
      </div>
    </form>
  );
}

"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserAction, updateUserAction, type ActionState } from "@/app/actions";
import {
  Table,
  Avatar,
  Badge,
  Button,
  IconButton,
  FormField,
  Input,
  Select,
  Checkbox,
  type Column,
} from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { UserActiveToggle } from "@/components/user-active-toggle";
import { ASSIGNABLE_CAPABILITIES, capabilityLabel } from "@/lib/labels";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/i18n/locale";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
  orgUnitId: string | null;
  deptName: string | null;
  capabilities: string[];
}
export interface OrgUnitOption {
  id: string;
  name: string;
  kind: string;
}

type DialogState = { mode: "create" } | { mode: "edit"; user: AdminUser } | null;

const initial: ActionState = {};

export function UsersAdmin({ users, orgUnits }: { users: AdminUser[]; orgUnits: OrgUnitOption[] }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [dialog, setDialog] = useState<DialogState>(null);

  const columns: Column<AdminUser>[] = [
    {
      key: "name",
      header: t("usersAdmin.columns.user"),
      render: (u) => (
        <div className="avi-cell-user">
          <Avatar name={u.name} size="sm" />
          <div>
            <div className="avi-cell-user__nm">{u.name}</div>
            <div className="avi-cell-user__id">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "roles",
      header: t("usersAdmin.columns.roles"),
      render: (u) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
          {u.capabilities.length ? (
            u.capabilities.map((c) => (
              <Badge key={c} variant={c === "admin" || c.startsWith("director") ? "accent" : "default"}>
                {capabilityLabel(c, locale)}
              </Badge>
            ))
          ) : (
            <span className="avi-cell-muted">{t("common.none")}</span>
          )}
        </div>
      ),
    },
    { key: "dept", header: t("usersAdmin.columns.dept"), render: (u) => <span className="avi-cell-muted">{u.deptName ?? t("common.none")}</span> },
    { key: "active", header: t("usersAdmin.columns.active"), align: "center", render: (u) => <UserActiveToggle userId={u.id} active={u.active} /> },
    {
      key: "act",
      header: "",
      align: "right",
      render: (u) => (
        <div className="avi-rowactions">
          <IconButton aria-label={t("usersAdmin.editAria", { name: u.name })} onClick={() => setDialog({ mode: "edit", user: u })}>
            <Icon name="pencil" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="primary" iconLeft={<Icon name="user-plus" />} onClick={() => setDialog({ mode: "create" })}>
          {t("usersAdmin.addUser")}
        </Button>
      </div>
      <Table columns={columns} data={users} rowKey={(u) => u.id} />

      {dialog && (
        <UserFormDialog
          key={dialog.mode === "edit" ? dialog.user.id : "create"}
          state={dialog}
          orgUnits={orgUnits}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function UserFormDialog({
  state,
  orgUnits,
  onClose,
}: {
  state: Exclude<DialogState, null>;
  orgUnits: OrgUnitOption[];
  onClose: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const isEdit = state.mode === "edit";
  const user = isEdit ? state.user : null;
  const [result, formAction, pending] = useActionState(isEdit ? updateUserAction : createUserAction, initial);

  useEffect(() => {
    if (result.ok) {
      onClose();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.ok]);

  return (
    <Dialog
      open
      size="lg"
      onClose={onClose}
      title={isEdit ? t("usersAdmin.dialog.editTitle") : t("usersAdmin.dialog.createTitle")}
      subtitle={isEdit ? t("usersAdmin.dialog.editSubtitle") : t("usersAdmin.dialog.createSubtitle")}
    >
      <form action={formAction} className="avi-dialog-form">
        {isEdit && <input type="hidden" name="userId" value={user!.id} />}

        <FormField label={t("usersAdmin.dialog.name")} htmlFor="u-name" required>
          <Input id="u-name" name="name" required defaultValue={user?.name ?? ""} placeholder={t("usersAdmin.dialog.namePlaceholder")} />
        </FormField>

        {!isEdit && (
          <div className="avi-two-col">
            <FormField label={t("usersAdmin.dialog.email")} htmlFor="u-email" required>
              <Input id="u-email" name="email" type="email" required placeholder={t("usersAdmin.dialog.emailPlaceholder")} />
            </FormField>
            <FormField label={t("usersAdmin.dialog.password")} htmlFor="u-pass" required hint={t("usersAdmin.dialog.passwordHint")}>
              <Input id="u-pass" name="password" type="password" required minLength={8} />
            </FormField>
          </div>
        )}

        <FormField label={t("usersAdmin.dialog.dept")} htmlFor="u-dept">
          <Select
            id="u-dept"
            name="orgUnitId"
            defaultValue={user?.orgUnitId ?? ""}
            options={[{ value: "", label: t("usersAdmin.dialog.noDept") }, ...orgUnits.map((o) => ({ value: o.id, label: `${o.name} (${o.kind})` }))]}
          />
        </FormField>

        <FormField label={t("usersAdmin.dialog.roles")}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4) var(--space-6)" }}>
            {ASSIGNABLE_CAPABILITIES.map((cap) => (
              <Checkbox
                key={cap}
                name="capabilities"
                value={cap}
                defaultChecked={user?.capabilities.includes(cap) ?? false}
                label={capabilityLabel(cap, locale)}
              />
            ))}
          </div>
        </FormField>

        {result.error && (
          <p className="avi-formfield__error">
            <Icon name="alert-circle" /> {result.error}
          </p>
        )}

        <div className="avi-actionpanel__row">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <div style={{ flex: 1 }} />
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? t("common.saving") : isEdit ? t("common.saveChanges") : t("usersAdmin.dialog.createSubmit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

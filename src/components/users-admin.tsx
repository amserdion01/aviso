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
import { ASSIGNABLE_CAPABILITIES, CAPABILITY_LABELS } from "@/lib/labels";

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
  const [dialog, setDialog] = useState<DialogState>(null);

  const columns: Column<AdminUser>[] = [
    {
      key: "name",
      header: "Utilizator",
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
      header: "Roluri în traseu",
      render: (u) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
          {u.capabilities.length ? (
            u.capabilities.map((c) => (
              <Badge key={c} variant={c === "admin" || c.startsWith("director") ? "accent" : "default"}>
                {CAPABILITY_LABELS[c] ?? c}
              </Badge>
            ))
          ) : (
            <span className="avi-cell-muted">—</span>
          )}
        </div>
      ),
    },
    { key: "dept", header: "Departament", render: (u) => <span className="avi-cell-muted">{u.deptName ?? "—"}</span> },
    { key: "active", header: "Activ", align: "center", render: (u) => <UserActiveToggle userId={u.id} active={u.active} /> },
    {
      key: "act",
      header: "",
      align: "right",
      render: (u) => (
        <div className="avi-rowactions">
          <IconButton aria-label={`Editează ${u.name}`} onClick={() => setDialog({ mode: "edit", user: u })}>
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
          Adaugă utilizator
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
      title={isEdit ? "Editează utilizatorul" : "Adaugă utilizator"}
      subtitle={isEdit ? "Actualizează rolurile și departamentul." : "Creează un cont și atribuie rolurile din traseu."}
    >
      <form action={formAction} className="avi-dialog-form">
        {isEdit && <input type="hidden" name="userId" value={user!.id} />}

        <FormField label="Nume" htmlFor="u-name" required>
          <Input id="u-name" name="name" required defaultValue={user?.name ?? ""} placeholder="ex. Ion Popescu" />
        </FormField>

        {!isEdit && (
          <div className="avi-two-col">
            <FormField label="Email" htmlFor="u-email" required>
              <Input id="u-email" name="email" type="email" required placeholder="nume@apacovasna.ro" />
            </FormField>
            <FormField label="Parolă" htmlFor="u-pass" required hint="Minim 8 caractere.">
              <Input id="u-pass" name="password" type="password" required minLength={8} />
            </FormField>
          </div>
        )}

        <FormField label="Departament" htmlFor="u-dept">
          <Select
            id="u-dept"
            name="orgUnitId"
            defaultValue={user?.orgUnitId ?? ""}
            options={[{ value: "", label: "Fără departament" }, ...orgUnits.map((o) => ({ value: o.id, label: `${o.name} (${o.kind})` }))]}
          />
        </FormField>

        <FormField label="Roluri în traseu">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4) var(--space-6)" }}>
            {ASSIGNABLE_CAPABILITIES.map((cap) => (
              <Checkbox
                key={cap}
                name="capabilities"
                value={cap}
                defaultChecked={user?.capabilities.includes(cap) ?? false}
                label={CAPABILITY_LABELS[cap] ?? cap}
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
            Anulează
          </Button>
          <div style={{ flex: 1 }} />
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Se salvează…" : isEdit ? "Salvează modificările" : "Creează utilizatorul"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createWorkflowAction,
  updateWorkflowAction,
  setWorkflowActiveAction,
  addStepAction,
  updateStepAction,
  deleteStepAction,
  moveStepAction,
  type ActionState,
} from "@/app/actions";
import {
  Table,
  Badge,
  Button,
  IconButton,
  FormField,
  Input,
  Textarea,
  Select,
  Switch,
  Card,
  EmptyState,
  StatusBadge,
  type Column,
} from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { CAPABILITY_LABELS, APPROVER_STRATEGY_LABELS, PROCUREMENT_TYPE_LABELS, describeCondition } from "@/lib/labels";

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
}

export interface WorkflowStep {
  id: string;
  workflowId: string | null;
  stepOrder: number;
  taskType: string;
  requiredCapability: string;
  approverStrategy: string;
  approverParam: string | null;
  appliesWhen: unknown;
  onSendBack: string;
  blocking: boolean;
  setsProcurementType: boolean;
  label: string;
}

const initial: ActionState = {};

type WorkflowDialogState = { mode: "create" } | { mode: "edit"; workflow: Workflow } | null;
type StepDialogState =
  | { mode: "create"; workflowId: string }
  | { mode: "edit"; step: WorkflowStep }
  | null;

type ConditionKind = "none" | "needsIt" | "needsSsm" | "procurementType" | "value";
function decodeCondition(cond: unknown): { kind: ConditionKind; procurement: string; valueLei: string } {
  const c = (cond ?? null) as Record<string, unknown> | null;
  if (!c || "all" in c) return { kind: "none", procurement: "", valueLei: "" };
  if (c.field === "needsIt") return { kind: "needsIt", procurement: "", valueLei: "" };
  if (c.field === "needsSsm") return { kind: "needsSsm", procurement: "", valueLei: "" };
  if (c.field === "procurementType") return { kind: "procurementType", procurement: String(c.eq), valueLei: "" };
  if (c.field === "estimatedValueMinor") return { kind: "value", procurement: "", valueLei: String((Number(c.gt) || 0) / 100) };
  return { kind: "none", procurement: "", valueLei: "" };
}

const CAP_OPTIONS = Object.entries(CAPABILITY_LABELS)
  .filter(([k]) => k !== "admin")
  .map(([value, label]) => ({ value, label }));
const STRATEGY_OPTIONS = Object.entries(APPROVER_STRATEGY_LABELS).map(([value, label]) => ({ value, label }));

export function WorkflowAdmin({
  workflows,
  stepsByWorkflow,
}: {
  workflows: Workflow[];
  stepsByWorkflow: Record<string, WorkflowStep[]>;
}) {
  const [workflowDialog, setWorkflowDialog] = useState<WorkflowDialogState>(null);
  const [stepDialog, setStepDialog] = useState<StepDialogState>(null);
  const [expanded, setExpanded] = useState<string | null>(workflows[0]?.id ?? null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <Card padding="sm" className="avi-card--flat">
        <div className="avi-form-note" style={{ margin: 0 }}>
          <Icon name="info" />
          <span>
            Modificările fluxului afectează doar <b>referatele viitoare</b>. Referatele aflate deja pe traseu își
            păstrează pașii.
          </span>
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="primary" iconLeft={<Icon name="plus" />} onClick={() => setWorkflowDialog({ mode: "create" })}>
          Adaugă categorie
        </Button>
      </div>

      {workflows.length === 0 ? (
        <Card padding="sm">
          <EmptyState
            icon="route"
            title="Nicio categorie de avizare"
            description="Creează prima categorie pentru a defini un traseu de avizare."
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {workflows.map((w) => (
            <WorkflowCard
              key={w.id}
              workflow={w}
              steps={stepsByWorkflow[w.id] ?? []}
              open={expanded === w.id}
              onToggle={() => setExpanded((cur) => (cur === w.id ? null : w.id))}
              onEdit={() => setWorkflowDialog({ mode: "edit", workflow: w })}
              onAddStep={() => setStepDialog({ mode: "create", workflowId: w.id })}
              onEditStep={(step) => setStepDialog({ mode: "edit", step })}
            />
          ))}
        </div>
      )}

      {workflowDialog && (
        <WorkflowDialog
          key={workflowDialog.mode === "edit" ? workflowDialog.workflow.id : "create"}
          state={workflowDialog}
          onClose={() => setWorkflowDialog(null)}
        />
      )}

      {stepDialog && (
        <StepDialog
          key={stepDialog.mode === "edit" ? stepDialog.step.id : `create-${stepDialog.workflowId}`}
          state={stepDialog}
          onClose={() => setStepDialog(null)}
        />
      )}
    </div>
  );
}

/* ---------------- Workflow (category) active toggle ---------------- */
function WorkflowActiveToggle({ workflowId, active }: { workflowId: string; active: boolean }) {
  const [checked, setChecked] = useState(active);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Switch
      checked={checked}
      disabled={pending}
      aria-label={checked ? "Dezactivează categoria" : "Activează categoria"}
      onChange={(e) => {
        const next = e.target.checked;
        setChecked(next);
        startTransition(async () => {
          try {
            await setWorkflowActiveAction(workflowId, next);
            router.refresh();
          } catch {
            setChecked(!next);
          }
        });
      }}
    />
  );
}

/* ---------------- Per-category card with its step table ---------------- */
function WorkflowCard({
  workflow,
  steps,
  open,
  onToggle,
  onEdit,
  onAddStep,
  onEditStep,
}: {
  workflow: Workflow;
  steps: WorkflowStep[];
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onAddStep: () => void;
  onEditStep: (step: WorkflowStep) => void;
}) {
  const [, startTransition] = useTransition();
  const router = useRouter();

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      await moveStepAction(id, direction);
      router.refresh();
    });
  }
  function remove(step: WorkflowStep) {
    if (!confirm(`Ștergi pasul „${step.label}”? Afectează doar referatele viitoare.`)) return;
    startTransition(async () => {
      await deleteStepAction(step.id);
      router.refresh();
    });
  }

  const columns: Column<WorkflowStep>[] = [
    { key: "order", header: "#", render: (s) => <span className="avi-cell-mono avi-cell-strong">{s.stepOrder}</span> },
    {
      key: "label",
      header: "Pas",
      render: (s) => (
        <div>
          <div className="avi-cell-strong">{s.label}</div>
          <div className="avi-cell-user__id">{s.taskType}</div>
        </div>
      ),
    },
    {
      key: "cap",
      header: "Capabilitate",
      render: (s) => <Badge variant="outline">{CAPABILITY_LABELS[s.requiredCapability] ?? s.requiredCapability}</Badge>,
    },
    {
      key: "strat",
      header: "Strategie",
      render: (s) => <span className="avi-cell-muted">{APPROVER_STRATEGY_LABELS[s.approverStrategy] ?? s.approverStrategy}</span>,
    },
    { key: "cond", header: "Condiție", render: (s) => <span className="avi-cell-muted">{describeCondition(s.appliesWhen)}</span> },
    {
      key: "flags",
      header: "Tip",
      render: (s) => (
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {!s.blocking && <Badge>Consultativ</Badge>}
          {s.setsProcurementType && <Badge variant="accent">Încadrare</Badge>}
        </div>
      ),
    },
    {
      key: "act",
      header: "",
      align: "right",
      render: (s) => (
        <div className="avi-rowactions">
          <IconButton aria-label="Mută în sus" onClick={() => move(s.id, "up")} disabled={s.stepOrder === steps[0]?.stepOrder}>
            <Icon name="arrow-left" style={{ transform: "rotate(90deg)" }} />
          </IconButton>
          <IconButton
            aria-label="Mută în jos"
            onClick={() => move(s.id, "down")}
            disabled={s.stepOrder === steps[steps.length - 1]?.stepOrder}
          >
            <Icon name="arrow-left" style={{ transform: "rotate(-90deg)" }} />
          </IconButton>
          <IconButton aria-label="Editează" onClick={() => onEditStep(s)}>
            <Icon name="pencil" />
          </IconButton>
          <IconButton aria-label="Șterge" onClick={() => remove(s)}>
            <Icon name="trash-2" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <Card padding="md">
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <IconButton
          aria-label={open ? "Restrânge categoria" : "Extinde categoria"}
          aria-expanded={open}
          onClick={onToggle}
        >
          <Icon name="chevron-down" style={{ transform: open ? "none" : "rotate(-90deg)" }} />
        </IconButton>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <span className="avi-cell-strong">{workflow.name}</span>
            <StatusBadge
              status={workflow.active ? "approved" : "neutral"}
              label={workflow.active ? "Activă" : "Inactivă"}
              size="sm"
            />
            <Badge variant="outline">{steps.length} pași</Badge>
          </div>
          {workflow.description && (
            <div className="avi-cell-muted" style={{ marginTop: "var(--space-2)" }}>
              {workflow.description}
            </div>
          )}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <WorkflowActiveToggle workflowId={workflow.id} active={workflow.active} />
          <IconButton aria-label={`Editează categoria ${workflow.name}`} onClick={onEdit}>
            <Icon name="pencil" />
          </IconButton>
        </div>
      </div>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: "var(--space-5)" }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button size="sm" variant="secondary" iconLeft={<Icon name="plus" />} onClick={onAddStep}>
              Adaugă pas
            </Button>
          </div>
          {steps.length === 0 ? (
            <EmptyState
              icon="route"
              title="Niciun pas definit"
              description="Adaugă primul pas din traseul acestei categorii."
            />
          ) : (
            <Table columns={columns} data={steps} rowKey={(s) => s.id} />
          )}
        </div>
      )}
    </Card>
  );
}

/* ---------------- Workflow create / edit dialog ---------------- */
function WorkflowDialog({
  state,
  onClose,
}: {
  state: Exclude<WorkflowDialogState, null>;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = state.mode === "edit";
  const workflow = isEdit ? state.workflow : null;
  const [result, formAction, pending] = useActionState(isEdit ? updateWorkflowAction : createWorkflowAction, initial);

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
      size="md"
      onClose={onClose}
      title={isEdit ? "Editează categoria" : "Adaugă categorie"}
      subtitle="O categorie definește un traseu de avizare separat."
    >
      <form action={formAction} className="avi-dialog-form">
        {isEdit && <input type="hidden" name="workflowId" value={workflow!.id} />}

        <FormField label="Nume" htmlFor="w-name" required>
          <Input id="w-name" name="name" required defaultValue={workflow?.name ?? ""} placeholder="ex. Achiziții materiale" />
        </FormField>

        <FormField label="Descriere" htmlFor="w-desc" optional hint="Scurtă explicație despre când se folosește această categorie.">
          <Textarea id="w-desc" name="description" rows={3} defaultValue={workflow?.description ?? ""} />
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
            {pending ? "Se salvează…" : isEdit ? "Salvează categoria" : "Creează categoria"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------- Step create / edit dialog ---------------- */
function StepDialog({ state, onClose }: { state: Exclude<StepDialogState, null>; onClose: () => void }) {
  const router = useRouter();
  const isEdit = state.mode === "edit";
  const step = isEdit ? state.step : null;
  const workflowId = isEdit ? state.step.workflowId ?? "" : state.workflowId;
  const [result, formAction, pending] = useActionState(isEdit ? updateStepAction : addStepAction, initial);
  const decoded = decodeCondition(step?.appliesWhen);
  const [kind, setKind] = useState<ConditionKind>(decoded.kind);

  useEffect(() => {
    if (result.ok) {
      onClose();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.ok]);

  return (
    <Dialog open size="lg" onClose={onClose} title={isEdit ? "Editează pasul" : "Adaugă pas"} subtitle="Definește un pas din traseul de avizare.">
      <form action={formAction} className="avi-dialog-form">
        <input type="hidden" name="workflowId" value={workflowId} />
        {isEdit && <input type="hidden" name="stepId" value={step!.id} />}

        <div className="avi-two-col">
          <FormField label="Etichetă" htmlFor="s-label" required>
            <Input id="s-label" name="label" required defaultValue={step?.label ?? ""} placeholder="ex. Aprobat director economic" />
          </FormField>
          <FormField label="Tip pas (cod)" htmlFor="s-type" required hint="Identificator scurt, ex. DIRECTOR_ECONOMIC.">
            <Input id="s-type" name="taskType" required defaultValue={step?.taskType ?? ""} placeholder="DIRECTOR_ECONOMIC" />
          </FormField>
        </div>

        <div className="avi-two-col">
          <FormField label="Capabilitate necesară" htmlFor="s-cap" required>
            <Select id="s-cap" name="requiredCapability" required defaultValue={step?.requiredCapability ?? ""} placeholder="Alege capabilitatea" options={CAP_OPTIONS} />
          </FormField>
          <FormField label="Strategie aprobator" htmlFor="s-strat" required>
            <Select id="s-strat" name="approverStrategy" required defaultValue={step?.approverStrategy ?? "capability"} options={STRATEGY_OPTIONS} />
          </FormField>
        </div>

        <FormField label="Parametru strategie" htmlFor="s-param" hint="Doar pentru „Relativ la unitate” (birou / serviciu). Lasă gol altfel.">
          <Input id="s-param" name="approverParam" defaultValue={step?.approverParam ?? ""} placeholder="birou / serviciu" />
        </FormField>

        <div className="avi-two-col">
          <FormField label="Condiție de aplicare" htmlFor="s-cond">
            <Select
              id="s-cond"
              name="conditionKind"
              value={kind}
              onChange={(e) => setKind(e.target.value as ConditionKind)}
              options={[
                { value: "none", label: "Întotdeauna" },
                { value: "needsIt", label: "Dacă necesită aviz IT" },
                { value: "needsSsm", label: "Dacă necesită aviz SSM" },
                { value: "procurementType", label: "După tipul de achiziție" },
                { value: "value", label: "Peste o valoare (lei)" },
              ]}
            />
          </FormField>
          {kind === "procurementType" && (
            <FormField label="Tip achiziție" htmlFor="s-proc">
              <Select
                id="s-proc"
                name="conditionProcurement"
                defaultValue={decoded.procurement}
                placeholder="Alege tipul"
                options={Object.entries(PROCUREMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </FormField>
          )}
          {kind === "value" && (
            <FormField label="Prag valoare (lei)" htmlFor="s-val">
              <Input id="s-val" name="conditionValueLei" type="number" min={0} step="0.01" defaultValue={decoded.valueLei} suffix="RON" />
            </FormField>
          )}
        </div>

        <div style={{ display: "flex", gap: "var(--space-8)", flexWrap: "wrap" }}>
          <Switch name="blocking" label="Pas blocant (obligatoriu)" defaultChecked={step ? step.blocking : true} />
          <Switch name="setsProcurementType" label="Setează tipul de achiziție (încadrare)" defaultChecked={step?.setsProcurementType ?? false} />
        </div>

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
            {pending ? "Se salvează…" : isEdit ? "Salvează pasul" : "Adaugă pasul"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

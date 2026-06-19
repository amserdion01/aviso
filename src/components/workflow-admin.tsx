"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/i18n/locale";
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
import {
  ASSIGNABLE_CAPABILITIES,
  capabilityLabel,
  approverStrategyLabel,
  procurementLabel,
  describeCondition,
} from "@/lib/labels";

const STRATEGY_CODES = ["capability", "org_relative", "director_by_unit"] as const;
const PROCUREMENT_CODES = ["achizitii", "aprovizionare", "servicii"] as const;

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

export function WorkflowAdmin({
  workflows,
  stepsByWorkflow,
}: {
  workflows: Workflow[];
  stepsByWorkflow: Record<string, WorkflowStep[]>;
}) {
  const t = useTranslations();
  const [workflowDialog, setWorkflowDialog] = useState<WorkflowDialogState>(null);
  const [stepDialog, setStepDialog] = useState<StepDialogState>(null);
  const [expanded, setExpanded] = useState<string | null>(workflows[0]?.id ?? null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <Card padding="sm" className="avi-card--flat">
        <div className="avi-form-note" style={{ margin: 0 }}>
          <Icon name="info" />
          <span>{t.rich("workflowAdmin.futureOnlyNote", { b: (chunks) => <b>{chunks}</b> })}</span>
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="primary" iconLeft={<Icon name="plus" />} onClick={() => setWorkflowDialog({ mode: "create" })}>
          {t("workflowAdmin.addCategory")}
        </Button>
      </div>

      {workflows.length === 0 ? (
        <Card padding="sm">
          <EmptyState
            icon="route"
            title={t("workflowAdmin.empty.title")}
            description={t("workflowAdmin.empty.description")}
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
  const t = useTranslations();
  const [checked, setChecked] = useState(active);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Switch
      checked={checked}
      disabled={pending}
      aria-label={checked ? t("workflowAdmin.toggle.deactivate") : t("workflowAdmin.toggle.activate")}
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
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [, startTransition] = useTransition();
  const router = useRouter();

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      await moveStepAction(id, direction);
      router.refresh();
    });
  }
  function remove(step: WorkflowStep) {
    if (!confirm(t("workflowAdmin.confirmDeleteStep", { label: step.label }))) return;
    startTransition(async () => {
      await deleteStepAction(step.id);
      router.refresh();
    });
  }

  const columns: Column<WorkflowStep>[] = [
    { key: "order", header: "#", render: (s) => <span className="avi-cell-mono avi-cell-strong">{s.stepOrder}</span> },
    {
      key: "label",
      header: t("workflowAdmin.table.step"),
      render: (s) => (
        <div>
          <div className="avi-cell-strong">{s.label}</div>
          <div className="avi-cell-user__id">{s.taskType}</div>
        </div>
      ),
    },
    {
      key: "cap",
      header: t("workflowAdmin.table.capability"),
      render: (s) => <Badge variant="outline">{capabilityLabel(s.requiredCapability, locale)}</Badge>,
    },
    {
      key: "strat",
      header: t("workflowAdmin.table.strategy"),
      render: (s) => <span className="avi-cell-muted">{approverStrategyLabel(s.approverStrategy, locale)}</span>,
    },
    { key: "cond", header: t("workflowAdmin.table.condition"), render: (s) => <span className="avi-cell-muted">{describeCondition(s.appliesWhen, locale)}</span> },
    {
      key: "flags",
      header: t("workflowAdmin.table.type"),
      render: (s) => (
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {!s.blocking && <Badge>{t("workflowAdmin.table.advisory")}</Badge>}
          {s.setsProcurementType && <Badge variant="accent">{t("workflowAdmin.table.classification")}</Badge>}
        </div>
      ),
    },
    {
      key: "act",
      header: "",
      align: "right",
      render: (s) => (
        <div className="avi-rowactions">
          <IconButton aria-label={t("workflowAdmin.table.moveUp")} onClick={() => move(s.id, "up")} disabled={s.stepOrder === steps[0]?.stepOrder}>
            <Icon name="arrow-left" style={{ transform: "rotate(90deg)" }} />
          </IconButton>
          <IconButton
            aria-label={t("workflowAdmin.table.moveDown")}
            onClick={() => move(s.id, "down")}
            disabled={s.stepOrder === steps[steps.length - 1]?.stepOrder}
          >
            <Icon name="arrow-left" style={{ transform: "rotate(-90deg)" }} />
          </IconButton>
          <IconButton aria-label={t("workflowAdmin.table.edit")} onClick={() => onEditStep(s)}>
            <Icon name="pencil" />
          </IconButton>
          <IconButton aria-label={t("workflowAdmin.table.delete")} onClick={() => remove(s)}>
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
          aria-label={open ? t("workflowAdmin.card.collapse") : t("workflowAdmin.card.expand")}
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
              label={workflow.active ? t("common.activeF") : t("common.inactiveF")}
              size="sm"
            />
            <Badge variant="outline">{t("workflowAdmin.card.stepCount", { count: steps.length })}</Badge>
          </div>
          {workflow.description && (
            <div className="avi-cell-muted" style={{ marginTop: "var(--space-2)" }}>
              {workflow.description}
            </div>
          )}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <WorkflowActiveToggle workflowId={workflow.id} active={workflow.active} />
          <IconButton aria-label={t("workflowAdmin.card.editCategory", { name: workflow.name })} onClick={onEdit}>
            <Icon name="pencil" />
          </IconButton>
        </div>
      </div>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: "var(--space-5)" }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button size="sm" variant="secondary" iconLeft={<Icon name="plus" />} onClick={onAddStep}>
              {t("workflowAdmin.card.addStep")}
            </Button>
          </div>
          {steps.length === 0 ? (
            <EmptyState
              icon="route"
              title={t("workflowAdmin.card.noSteps.title")}
              description={t("workflowAdmin.card.noSteps.description")}
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
  const t = useTranslations();
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
      title={isEdit ? t("workflowAdmin.workflowDialog.editTitle") : t("workflowAdmin.workflowDialog.createTitle")}
      subtitle={t("workflowAdmin.workflowDialog.subtitle")}
    >
      <form action={formAction} className="avi-dialog-form">
        {isEdit && <input type="hidden" name="workflowId" value={workflow!.id} />}

        <FormField label={t("workflowAdmin.workflowDialog.nameLabel")} htmlFor="w-name" required>
          <Input id="w-name" name="name" required defaultValue={workflow?.name ?? ""} placeholder={t("workflowAdmin.workflowDialog.namePlaceholder")} />
        </FormField>

        <FormField label={t("workflowAdmin.workflowDialog.descriptionLabel")} htmlFor="w-desc" optional hint={t("workflowAdmin.workflowDialog.descriptionHint")}>
          <Textarea id="w-desc" name="description" rows={3} defaultValue={workflow?.description ?? ""} />
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
            {pending ? t("common.saving") : isEdit ? t("workflowAdmin.workflowDialog.saveEdit") : t("workflowAdmin.workflowDialog.saveCreate")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------- Step create / edit dialog ---------------- */
function StepDialog({ state, onClose }: { state: Exclude<StepDialogState, null>; onClose: () => void }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const isEdit = state.mode === "edit";
  const step = isEdit ? state.step : null;
  const workflowId = isEdit ? state.step.workflowId ?? "" : state.workflowId;
  const [result, formAction, pending] = useActionState(isEdit ? updateStepAction : addStepAction, initial);
  const decoded = decodeCondition(step?.appliesWhen);
  const [kind, setKind] = useState<ConditionKind>(decoded.kind);

  const capOptions = ASSIGNABLE_CAPABILITIES.filter((c) => c !== "admin").map((value) => ({
    value,
    label: capabilityLabel(value, locale),
  }));
  const strategyOptions = STRATEGY_CODES.map((value) => ({ value, label: approverStrategyLabel(value, locale) }));
  const procurementOptions = PROCUREMENT_CODES.map((value) => ({ value, label: procurementLabel(value, locale) }));

  useEffect(() => {
    if (result.ok) {
      onClose();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.ok]);

  return (
    <Dialog open size="lg" onClose={onClose} title={isEdit ? t("workflowAdmin.stepDialog.editTitle") : t("workflowAdmin.stepDialog.createTitle")} subtitle={t("workflowAdmin.stepDialog.subtitle")}>
      <form action={formAction} className="avi-dialog-form">
        <input type="hidden" name="workflowId" value={workflowId} />
        {isEdit && <input type="hidden" name="stepId" value={step!.id} />}

        <div className="avi-two-col">
          <FormField label={t("workflowAdmin.stepDialog.labelLabel")} htmlFor="s-label" required>
            <Input id="s-label" name="label" required defaultValue={step?.label ?? ""} placeholder={t("workflowAdmin.stepDialog.labelPlaceholder")} />
          </FormField>
          <FormField label={t("workflowAdmin.stepDialog.taskTypeLabel")} htmlFor="s-type" required hint={t("workflowAdmin.stepDialog.taskTypeHint")}>
            <Input id="s-type" name="taskType" required defaultValue={step?.taskType ?? ""} placeholder="DIRECTOR_ECONOMIC" />
          </FormField>
        </div>

        <div className="avi-two-col">
          <FormField label={t("workflowAdmin.stepDialog.capabilityLabel")} htmlFor="s-cap" required>
            <Select id="s-cap" name="requiredCapability" required defaultValue={step?.requiredCapability ?? ""} placeholder={t("workflowAdmin.stepDialog.capabilityPlaceholder")} options={capOptions} />
          </FormField>
          <FormField label={t("workflowAdmin.stepDialog.strategyLabel")} htmlFor="s-strat" required>
            <Select id="s-strat" name="approverStrategy" required defaultValue={step?.approverStrategy ?? "capability"} options={strategyOptions} />
          </FormField>
        </div>

        <FormField label={t("workflowAdmin.stepDialog.paramLabel")} htmlFor="s-param" hint={t("workflowAdmin.stepDialog.paramHint")}>
          <Input id="s-param" name="approverParam" defaultValue={step?.approverParam ?? ""} placeholder={t("workflowAdmin.stepDialog.paramPlaceholder")} />
        </FormField>

        <div className="avi-two-col">
          <FormField label={t("workflowAdmin.stepDialog.conditionLabel")} htmlFor="s-cond">
            <Select
              id="s-cond"
              name="conditionKind"
              value={kind}
              onChange={(e) => setKind(e.target.value as ConditionKind)}
              options={[
                { value: "none", label: t("workflowAdmin.stepDialog.conditionAlways") },
                { value: "needsIt", label: t("workflowAdmin.stepDialog.conditionNeedsIt") },
                { value: "needsSsm", label: t("workflowAdmin.stepDialog.conditionNeedsSsm") },
                { value: "procurementType", label: t("workflowAdmin.stepDialog.conditionProcurement") },
                { value: "value", label: t("workflowAdmin.stepDialog.conditionValue") },
              ]}
            />
          </FormField>
          {kind === "procurementType" && (
            <FormField label={t("workflowAdmin.stepDialog.procurementLabel")} htmlFor="s-proc">
              <Select
                id="s-proc"
                name="conditionProcurement"
                defaultValue={decoded.procurement}
                placeholder={t("workflowAdmin.stepDialog.procurementPlaceholder")}
                options={procurementOptions}
              />
            </FormField>
          )}
          {kind === "value" && (
            <FormField label={t("workflowAdmin.stepDialog.valueLabel")} htmlFor="s-val">
              <Input id="s-val" name="conditionValueLei" type="number" min={0} step="0.01" defaultValue={decoded.valueLei} suffix="RON" />
            </FormField>
          )}
        </div>

        <div style={{ display: "flex", gap: "var(--space-8)", flexWrap: "wrap" }}>
          <Switch name="blocking" label={t("workflowAdmin.stepDialog.blocking")} defaultChecked={step ? step.blocking : true} />
          <Switch name="setsProcurementType" label={t("workflowAdmin.stepDialog.setsProcurement")} defaultChecked={step?.setsProcurementType ?? false} />
        </div>

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
            {pending ? t("common.saving") : isEdit ? t("workflowAdmin.stepDialog.saveEdit") : t("workflowAdmin.stepDialog.saveCreate")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

import { z } from "zod";
import { ASSIGNABLE_CAPABILITIES } from "@/lib/labels";

/**
 * Server-boundary validation for creating a referat. Money is entered in lei
 * and converted to integer bani (minor units) — never stored as a float.
 *
 * Zod messages are message KEYS (validation.*) translated at the server-action
 * boundary, so errors surface in the user's language.
 */
export const createReferatSchema = z
  .object({
    workflowId: z.string().min(1, "validation.workflowRequired"),
    item: z.string().trim().min(2, "validation.itemRequired"),
    quantity: z.coerce.number().int("validation.quantityInt").positive("validation.quantityPositive"),
    justification: z.string().trim().min(3, "validation.justificationRequired"),
    costCenter: z.string().trim().min(1, "validation.costCenterRequired"),
    estimatedValueLei: z
      .union([z.coerce.number().nonnegative(), z.literal("").transform(() => undefined)])
      .optional(),
    // in PAAP → comandă internă; not in PAAP → referat de necesitate (+ notă justificativă)
    inPaap: z.boolean().default(false),
    notaJustificativa: z.string().trim().optional(),
  })
  // A referat (not in PAAP) requires a justification note.
  .refine((d) => d.inPaap || (d.notaJustificativa?.length ?? 0) >= 3, {
    path: ["notaJustificativa"],
    message: "validation.notaRequired",
  });

export type CreateReferatInput = z.infer<typeof createReferatSchema>;

export const actionSchema = z.object({
  requisitionId: z.string().min(1),
  action: z.enum(["approve", "reject", "send_back"]),
  comment: z.string().trim().max(2000).optional(),
  classification: z.enum(["achizitii", "aprovizionare", "servicii"]).optional(),
  // Birou Achiziții evaluation step: calculated value (lei) + SEAP-catalog answer.
  valuationLei: z
    .union([z.coerce.number().nonnegative(), z.literal("").transform(() => undefined)])
    .optional(),
  inSeapCatalog: z.enum(["da", "nu"]).optional(),
  // send_back only: chosen target step order (any earlier step).
  sendBackTo: z
    .union([z.coerce.number().int(), z.literal("").transform(() => undefined)])
    .optional(),
});

export const delegationSchema = z
  .object({
    delegateId: z.string().min(1, "validation.delegateRequired"),
    capability: z.string().trim().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((d) => d.endsAt.getTime() > d.startsAt.getTime(), {
    message: "validation.dateRangeOrder",
  });

// Only canonical, assignable capabilities may be persisted (anything else is rejected).
const capabilitiesField = z
  .array(z.enum(ASSIGNABLE_CAPABILITIES))
  .or(z.enum(ASSIGNABLE_CAPABILITIES).transform((s) => [s]))
  .or(z.undefined().transform(() => [] as Array<(typeof ASSIGNABLE_CAPABILITIES)[number]>));

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "validation.nameRequired"),
  email: z.string().trim().toLowerCase().pipe(z.email("validation.emailInvalid")),
  password: z.string().min(8, "validation.passwordMin"),
  orgUnitId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  capabilities: capabilitiesField,
});

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2, "validation.nameRequired"),
  orgUnitId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  capabilities: capabilitiesField,
});

export const workflowSchema = z.object({
  workflowId: z.string().trim().optional(),
  name: z.string().trim().min(2, "validation.categoryNameRequired").max(80),
  description: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? v : null)),
});

export const stepSchema = z.object({
  workflowId: z.string().min(1),
  stepId: z.string().trim().optional(),
  label: z.string().trim().min(2, "validation.stepLabelRequired").max(120),
  taskType: z.string().trim().min(2, "validation.stepTypeRequired").max(60),
  requiredCapability: z.string().trim().min(1, "validation.capabilityRequired").max(60),
  approverStrategy: z.enum(["org_relative", "capability", "director_by_unit"]),
  approverParam: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  conditionKind: z.enum(["none", "needsIt", "needsSsm", "procurementType", "value"]),
  conditionProcurement: z.enum(["achizitii", "aprovizionare", "servicii"]).optional(),
  conditionValueLei: z
    .union([z.coerce.number().nonnegative(), z.literal("").transform(() => undefined)])
    .optional(),
});

/** Build the engine `applies_when` predicate from the form's condition fields. */
export function buildAppliesWhen(input: {
  conditionKind: string;
  conditionProcurement?: string;
  conditionValueLei?: number;
}): unknown {
  switch (input.conditionKind) {
    case "needsIt":
      return { field: "needsIt", eq: true };
    case "needsSsm":
      return { field: "needsSsm", eq: true };
    case "procurementType":
      return input.conditionProcurement ? { field: "procurementType", eq: input.conditionProcurement } : null;
    case "value":
      return input.conditionValueLei != null ? { field: "estimatedValueMinor", gt: Math.round(input.conditionValueLei * 100) } : null;
    default:
      return null;
  }
}

export const commentSchema = z.object({
  requisitionId: z.string().min(1),
  body: z.string().trim().min(1, "validation.commentEmpty").max(2000, "validation.commentTooLong"),
});

/** Convert a lei amount to integer bani, or null. */
export function leiToBani(lei: number | undefined): number | null {
  if (lei === undefined) return null;
  return Math.round(lei * 100);
}

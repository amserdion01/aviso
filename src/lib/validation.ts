import { z } from "zod";

/**
 * Server-boundary validation for creating a referat. Money is entered in lei
 * and converted to integer bani (minor units) — never stored as a float.
 */
export const createReferatSchema = z.object({
  item: z.string().trim().min(2, "Denumirea articolului este obligatorie"),
  quantity: z.coerce.number().int("Cantitatea trebuie să fie un număr întreg").positive("Cantitatea trebuie să fie pozitivă"),
  justification: z.string().trim().min(3, "Justificarea este obligatorie"),
  costCenter: z.string().trim().min(1, "Centrul de cost este obligatoriu"),
  estimatedValueLei: z
    .union([z.coerce.number().nonnegative(), z.literal("").transform(() => undefined)])
    .optional(),
});

export type CreateReferatInput = z.infer<typeof createReferatSchema>;

export const actionSchema = z.object({
  requisitionId: z.string().min(1),
  action: z.enum(["approve", "reject", "send_back"]),
  comment: z.string().trim().max(2000).optional(),
  classification: z.enum(["achizitii", "aprovizionare", "servicii"]).optional(),
});

export const delegationSchema = z
  .object({
    delegateId: z.string().min(1, "Alege un înlocuitor"),
    capability: z.string().trim().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((d) => d.endsAt.getTime() > d.startsAt.getTime(), {
    message: "Data de sfârșit trebuie să fie după cea de început",
  });

const capabilitiesField = z
  .array(z.string().trim().min(1))
  .or(z.string().trim().min(1).transform((s) => [s]))
  .or(z.undefined().transform(() => [] as string[]))
  .pipe(z.array(z.string()));

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Numele este obligatoriu"),
  email: z.string().trim().toLowerCase().pipe(z.email("Email invalid")),
  password: z.string().min(8, "Parola trebuie să aibă cel puțin 8 caractere"),
  orgUnitId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  capabilities: capabilitiesField,
});

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2, "Numele este obligatoriu"),
  orgUnitId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  capabilities: capabilitiesField,
});

/** Convert a lei amount to integer bani, or null. */
export function leiToBani(lei: number | undefined): number | null {
  if (lei === undefined) return null;
  return Math.round(lei * 100);
}

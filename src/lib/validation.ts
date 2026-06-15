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

/** Convert a lei amount to integer bani, or null. */
export function leiToBani(lei: number | undefined): number | null {
  if (lei === undefined) return null;
  return Math.round(lei * 100);
}

import type { StepDef } from "./workflow";

/**
 * Phase 1 slice chain: create -> verificare șef birou -> aprobat director.
 *
 * In Phase 2 this fixed list is replaced by the data-driven `approval_steps`
 * template (with per-step `applies_when` predicates) seeded from the real
 * Covasna flow. Keeping it here lets the repository and UI be built and tested
 * end-to-end before the full chain is confirmed.
 */
export const SLICE_STEPS: StepDef[] = [
  {
    order: 1,
    taskType: "VERIFICARE_SEF_BIROU",
    requiredCapability: "sef_birou",
    label: "Verificare șef birou",
  },
  {
    order: 2,
    taskType: "APROBAT_DIRECTOR",
    requiredCapability: "director",
    label: "Aprobat director",
  },
];

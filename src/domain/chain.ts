import type { ApproverStrategy, Condition, StepDef } from "./workflow";

/**
 * Phase 1 slice chain: create -> verificare șef birou -> aprobat director.
 * Used by the slice tests; the live app loads the template from the
 * `approval_steps` table (seeded with REAL_CHAIN below).
 */
export const SLICE_STEPS: StepDef[] = [
  { order: 1, taskType: "VERIFICARE_SEF_BIROU", requiredCapability: "sef_birou", approverStrategy: "org_relative", label: "Verificare șef birou" },
  { order: 2, taskType: "APROBAT_DIRECTOR", requiredCapability: "director", approverStrategy: "capability", label: "Aprobat director" },
];

/** Seed shape for one approval_steps row. */
export interface ChainStepSeed {
  order: number;
  taskType: string;
  requiredCapability: string;
  approverStrategy: ApproverStrategy;
  approverParam?: string | null;
  appliesWhen?: Condition;
  onSendBack?: string;
  blocking?: boolean;
  setsProcurementType?: boolean;
  setsValuation?: boolean;
  label: string;
}

/** Configurable value threshold for the director branch (5000 lei, in bani). */
export const HYDROKOV_THRESHOLD_MINOR = 500000;

/** Re-usable "needs director signatures" predicate: value ≥ 5000 OR external order. */
const NEEDS_DIRECTORS: Condition = {
  any: [
    { field: "estimatedValueMinor", gte: HYDROKOV_THRESHOLD_MINOR },
    { all: [{ field: "estimatedValueMinor", lt: HYDROKOV_THRESHOLD_MINOR }, { field: "inSeapCatalog", eq: false }] },
  ],
};

/** External order: value < 5000 AND NOT in SEAP catalog. */
const EXTERNAL_ORDER: Condition = {
  all: [{ field: "estimatedValueMinor", lt: HYDROKOV_THRESHOLD_MINOR }, { field: "inSeapCatalog", eq: false }],
};

/**
 * The real HYDROKOV direct-purchase chain (sursa: CLAUDE.md procedura reală):
 *   angajat → superior ierarhic direct → Birou Achiziții (evaluează valoarea + SEAP) →
 *   ramificare:
 *     valoare ≥ 5000              → Director Economic → Director General
 *     valoare < 5000 & în SEAP    → "inițiat în SEAP" (terminal, fără directori)
 *     valoare < 5000 & fără SEAP  → Coordonator Achiziții → Director Economic → Director General
 * The two document types (comandă internă / referat) share this chain; the type is
 * a requisition field, not a separate template.
 */
export const HYDROKOV_CHAIN: ChainStepSeed[] = [
  { order: 1, taskType: "AVIZARE_SUPERIOR", requiredCapability: "sef_ierarhic", approverStrategy: "superior", label: "Avizare superior ierarhic" },
  { order: 2, taskType: "ACHIZITII_EVALUARE", requiredCapability: "birou_achizitii", approverStrategy: "capability", setsValuation: true, label: "Birou Achiziții — evaluare ofertă" },
  { order: 3, taskType: "COORD_ACHIZITII", requiredCapability: "coord_achizitii", approverStrategy: "capability", appliesWhen: EXTERNAL_ORDER, label: "Semnătură coordonator achiziții (comandă externă)" },
  { order: 4, taskType: "DIRECTOR_ECONOMIC", requiredCapability: "director_economic", approverStrategy: "capability", appliesWhen: NEEDS_DIRECTORS, label: "Semnătură director economic" },
  { order: 5, taskType: "DIRECTOR_GENERAL", requiredCapability: "director_general", approverStrategy: "capability", appliesWhen: NEEDS_DIRECTORS, label: "Semnătură director general" },
];

/**
 * The real Covasna chain (confirmed from diagramaFlux.pdf + the org file).
 * Value-threshold steps (e.g. + director general) are NOT seeded here — an
 * admin adds them as conditional rows: applies_when = value > X AND
 * procurement_type = Y. See docs/PLAN.md.
 */
export const REAL_CHAIN: ChainStepSeed[] = [
  { order: 1, taskType: "SEF_BIROU", requiredCapability: "sef_birou", approverStrategy: "org_relative", approverParam: "birou", label: "Verificare șef birou/sector" },
  { order: 2, taskType: "SEF_SERVICIU", requiredCapability: "sef_serviciu", approverStrategy: "org_relative", approverParam: "serviciu", label: "Verificare șef serviciu/secție" },
  { order: 3, taskType: "INREGISTRARE", requiredCapability: "secretariat", approverStrategy: "capability", label: "Înregistrare" },
  { order: 4, taskType: "IT", requiredCapability: "it", approverStrategy: "capability", appliesWhen: { field: "needsIt", eq: true }, label: "IT" },
  { order: 5, taskType: "SSM", requiredCapability: "ssm", approverStrategy: "capability", appliesWhen: { field: "needsSsm", eq: true }, label: "SSM" },
  { order: 6, taskType: "RU", requiredCapability: "ru", approverStrategy: "capability", label: "RU" },
  { order: 7, taskType: "MAGAZIE", requiredCapability: "magazie", approverStrategy: "capability", label: "Verificare magazie" },
  { order: 8, taskType: "DIRECTOR_ECONOMIC", requiredCapability: "director_economic", approverStrategy: "capability", label: "Aprobat director economic" },
  { order: 9, taskType: "INCADRARE", requiredCapability: "achizitii", approverStrategy: "capability", setsProcurementType: true, label: "Achiziții — încadrare" },
  { order: 10, taskType: "ACHIZITII", requiredCapability: "achizitii", approverStrategy: "capability", appliesWhen: { field: "procurementType", eq: "achizitii" }, label: "Achiziții" },
  { order: 11, taskType: "APROVIZIONARE", requiredCapability: "aprovizionare", approverStrategy: "capability", appliesWhen: { field: "procurementType", eq: "aprovizionare" }, label: "Aprovizionare" },
  { order: 12, taskType: "SERVICII", requiredCapability: "servicii", approverStrategy: "capability", appliesWhen: { field: "procurementType", eq: "servicii" }, label: "Servicii" },
  { order: 13, taskType: "DIRECTOR", requiredCapability: "director", approverStrategy: "director_by_unit", label: "Aprobat director" },
];

/** Map an org unit's director_type to the capability that signs for it. */
export const DIRECTOR_TYPE_CAPABILITY: Record<string, string> = {
  "Director general": "director_general",
  "Director tehnic": "director_tehnic",
  "Director economic": "director_economic",
  "Director adjunct": "director_adjunct",
  "Dep comercial-administrativ": "director_comercial",
};

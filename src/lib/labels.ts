/** Romanian display labels for the slice's enums. */

export const STATUS_LABELS: Record<string, string> = {
  in_progress: "În curs",
  approved: "Aprobat",
  rejected: "Respins",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "În așteptare",
  waiting: "De aprobat",
  approved: "Aprobat",
  rejected: "Respins",
  sent_back: "Trimis înapoi",
  skipped: "Omis",
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  // slice
  VERIFICARE_SEF_BIROU: "Verificare șef birou",
  APROBAT_DIRECTOR: "Aprobat director",
  // real chain
  SEF_BIROU: "Verificare șef birou/sector",
  SEF_SERVICIU: "Verificare șef serviciu/secție",
  INREGISTRARE: "Înregistrare",
  IT: "IT",
  SSM: "SSM",
  RU: "RU",
  MAGAZIE: "Verificare magazie",
  DIRECTOR_ECONOMIC: "Aprobat director economic",
  INCADRARE: "Achiziții — încadrare",
  ACHIZITII: "Achiziții",
  APROVIZIONARE: "Aprovizionare",
  SERVICII: "Servicii",
  DIRECTOR: "Aprobat director",
};

export const PROCUREMENT_TYPE_LABELS: Record<string, string> = {
  achizitii: "Achiziții",
  aprovizionare: "Aprovizionare",
  servicii: "Servicii",
};

export const ACTION_LABELS: Record<string, string> = {
  create: "Creare",
  approve: "Aprobare",
  reject: "Respingere",
  send_back: "Trimis înapoi",
};

/** Friendly per-capability labels, plus a helper to pick a user's primary role. */
export const CAPABILITY_LABELS: Record<string, string> = {
  angajat: "Angajat",
  sef_birou: "Șef birou",
  sef_serviciu: "Șef serviciu",
  secretariat: "Secretariat",
  inregistrare: "Secretariat",
  it: "IT",
  ssm: "SSM",
  ru: "Resurse umane",
  magazie: "Magazie",
  director_economic: "Director economic",
  incadrare: "Achiziții — încadrare",
  achizitii: "Achiziții",
  aprovizionare: "Aprovizionare",
  servicii: "Servicii",
  director: "Director",
  director_tehnic: "Director tehnic",
  director_general: "Director general",
  admin: "Administrator",
};

const ROLE_PRIORITY = [
  "director_general",
  "director",
  "director_tehnic",
  "director_economic",
  "achizitii",
  "incadrare",
  "magazie",
  "ru",
  "it",
  "ssm",
  "secretariat",
  "inregistrare",
  "sef_serviciu",
  "sef_birou",
  "angajat",
];

/** The most senior capability a user holds, as a display label. */
export function primaryRole(capabilities: string[]): string {
  for (const cap of ROLE_PRIORITY) {
    if (capabilities.includes(cap)) return CAPABILITY_LABELS[cap] ?? cap;
  }
  return capabilities.length ? (CAPABILITY_LABELS[capabilities[0]] ?? capabilities[0]) : "Utilizator";
}

/** Maps a requisition's stored status to a design-system status badge. */
export function requisitionStatusBadge(status: string): {
  tone: "pending" | "approved" | "rejected" | "sentback" | "finalized" | "neutral";
  label: string;
} {
  switch (status) {
    case "approved":
      return { tone: "finalized", label: "Finalizat" };
    case "rejected":
      return { tone: "rejected", label: "Respins" };
    default:
      return { tone: "pending", label: "În curs" };
  }
}

export function formatLei(minor: number | null): string {
  if (minor === null) return "—";
  return `${(minor / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} lei`;
}

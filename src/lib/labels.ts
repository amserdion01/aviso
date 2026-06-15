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
  VERIFICARE_SEF_BIROU: "Verificare șef birou",
  APROBAT_DIRECTOR: "Aprobat director",
};

export const ACTION_LABELS: Record<string, string> = {
  create: "Creare",
  approve: "Aprobare",
  reject: "Respingere",
  send_back: "Trimis înapoi",
};

export function formatLei(minor: number | null): string {
  if (minor === null) return "—";
  return `${(minor / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} lei`;
}

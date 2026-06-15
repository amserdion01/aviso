import type { ReferatDocumentData } from "@/db/queries";
import { TASK_TYPE_LABELS, PROCUREMENT_TYPE_LABELS, formatLei } from "./labels";
import { formatDate, formatDateTime } from "./format";

const COMPANY_NAME = process.env.COMPANY_NAME ?? "Compania de Apă";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

const dateFmt = (d: Date | null) => (d ? formatDate(d) : "—");
const dateTimeFmt = (d: Date) => formatDateTime(d);

/** Renders the finalized referat as a self-contained, print-ready HTML document. */
export function renderReferatDocument(data: ReferatDocumentData, generatedAt: Date): string {
  const signed = data.steps.filter((s) => s.status === "approved");
  const orgLine = [data.serviciuName, data.birouName].filter(Boolean).join(" / ") || "—";

  const rows = signed
    .map(
      (s, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${esc(TASK_TYPE_LABELS[s.taskType] ?? s.taskType)}</td>
        <td>${esc(s.actedByName ?? "—")}</td>
        <td class="center">${dateFmt(s.actedAt)}</td>
        <td class="center ok">✓ Aprobat</td>
      </tr>`,
    )
    .join("");

  const avize = [data.needsIt ? "IT" : null, data.needsSsm ? "SSM" : null].filter(Boolean).join(", ") || "Niciunul";
  const procurement = data.procurementType ? PROCUREMENT_TYPE_LABELS[data.procurementType] ?? data.procurementType : "—";

  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #1f2937; font-size: 12px; line-height: 1.5; margin: 0; }
  .doc { padding: 4px 0; }
  .topbar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 10px; }
  .company { font-size: 15px; font-weight: 700; letter-spacing: .3px; }
  .company small { display:block; font-weight: 400; font-size: 10px; color:#6b7280; letter-spacing: 0; }
  .meta { text-align: right; font-size: 11px; color: #374151; }
  .meta b { color:#111827; }
  .title-wrap { text-align: center; margin: 22px 0 6px; position: relative; }
  h1 { font-size: 19px; letter-spacing: 1px; margin: 0; }
  .subtitle { color:#6b7280; font-size: 11px; }
  .stamp { position: absolute; right: 8px; top: -6px; border: 2px solid #15803d; color:#15803d;
           padding: 4px 12px; border-radius: 6px; font-weight: 800; letter-spacing: 2px; transform: rotate(-6deg); font-size: 14px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .6px; color:#374151;
       border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin: 22px 0 10px; }
  table { width: 100%; border-collapse: collapse; }
  .kv td { padding: 5px 0; vertical-align: top; }
  .kv td.k { width: 32%; color:#6b7280; }
  .kv td.v { font-weight: 600; }
  .just { background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; padding:10px 12px; white-space: pre-wrap; }
  .chain { margin-top: 6px; }
  .chain th { text-align: left; background:#111827; color:#fff; padding: 7px 8px; font-size: 11px; }
  .chain td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; }
  .chain td.num, .chain th.num { width: 30px; text-align:center; }
  .center { text-align: center; }
  .ok { color:#15803d; font-weight: 700; }
  .footer { margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 8px; color:#9ca3af; font-size: 10px; display:flex; justify-content:space-between; }
</style>
</head>
<body>
  <div class="doc">
    <div class="topbar">
      <div class="company">${esc(COMPANY_NAME)}<small>Flux intern de aprobare — referate de necesitate</small></div>
      <div class="meta">
        <div><b>Nr. referat:</b> ${esc(shortId(data.id))}</div>
        <div><b>Data:</b> ${dateFmt(data.createdAt)}</div>
      </div>
    </div>

    <div class="title-wrap">
      <h1>REFERAT DE NECESITATE</h1>
      <div class="subtitle">Document aprobat electronic</div>
      <div class="stamp">APROBAT</div>
    </div>

    <h2>Solicitant</h2>
    <table class="kv">
      <tr><td class="k">Nume</td><td class="v">${esc(data.requesterName)}</td></tr>
      <tr><td class="k">Serviciu / Birou</td><td class="v">${esc(orgLine)}</td></tr>
      <tr><td class="k">Centru de cost</td><td class="v">${esc(data.costCenter)}</td></tr>
    </table>

    <h2>Obiectul referatului</h2>
    <table class="kv">
      <tr><td class="k">Articol / serviciu</td><td class="v">${esc(data.item)}</td></tr>
      <tr><td class="k">Cantitate</td><td class="v">${esc(data.quantity)}</td></tr>
      <tr><td class="k">Valoare estimată</td><td class="v">${esc(formatLei(data.estimatedValueMinor))}</td></tr>
      <tr><td class="k">Tip achiziție</td><td class="v">${esc(procurement)}</td></tr>
      <tr><td class="k">Avize necesare</td><td class="v">${esc(avize)}</td></tr>
    </table>
    <div style="margin-top:8px">
      <div class="k" style="color:#6b7280;margin-bottom:4px">Justificare</div>
      <div class="just">${esc(data.justification)}</div>
    </div>

    <h2>Flux de aprobare</h2>
    <table class="chain">
      <thead>
        <tr><th class="num">#</th><th>Etapă</th><th>Aprobator</th><th class="center">Data</th><th class="center">Stare</th></tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="5" class="center">—</td></tr>`}</tbody>
    </table>

    <div class="footer">
      <span>Document generat electronic la ${dateTimeFmt(generatedAt)}. Nu necesită semnătură olografă.</span>
      <span>${esc(shortId(data.id))}</span>
    </div>
  </div>
</body>
</html>`;
}

// Render a Markdown file to a styled A4 PDF (local only; uses the bundled Puppeteer
// Chromium). Usage: pnpm tsx scripts/md-to-pdf.mjs <input.md> <output.pdf> [Title]
import { readFileSync } from "node:fs";
import { marked } from "marked";
import puppeteer from "puppeteer";

const [, , input, output, title] = process.argv;
if (!input || !output) {
  console.error("Usage: md-to-pdf <input.md> <output.pdf> [Title]");
  process.exit(1);
}

const body = marked.parse(readFileSync(input, "utf8"));

const html = `<!doctype html>
<html lang="ro"><head><meta charset="utf-8"><title>${title ?? ""}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937;
         font-size: 12.5px; line-height: 1.55; margin: 0; }
  h1 { font-size: 23px; margin: 0 0 6px; color: #0f172a; }
  h2 { font-size: 17px; margin: 26px 0 8px; padding-bottom: 5px; border-bottom: 2px solid #155A8E; color: #155A8E; }
  h3 { font-size: 14px; margin: 18px 0 6px; color: #0f172a; }
  p { margin: 8px 0; }
  a { color: #155A8E; text-decoration: none; }
  ul, ol { margin: 8px 0; padding-left: 22px; }
  li { margin: 3px 0; }
  strong { color: #0f172a; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
  blockquote { margin: 12px 0; padding: 10px 14px; background: #f1f6fb; border-left: 4px solid #155A8E;
               border-radius: 4px; color: #334155; }
  blockquote p { margin: 4px 0; }
  code { font-family: "SFMono-Regular", "Consolas", monospace; font-size: 11px;
         background: #f3f4f6; padding: 1px 5px; border-radius: 4px; }
  pre { background: #0f172a; color: #e2e8f0; padding: 14px 16px; border-radius: 8px; overflow: hidden;
        font-size: 10.5px; line-height: 1.4; white-space: pre; }
  pre code { background: none; color: inherit; padding: 0; font-size: 10.5px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11.5px; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #155A8E; color: #fff; font-weight: 600; }
  tr:nth-child(even) td { background: #f8fafc; }
  h2, h3 { page-break-after: avoid; }
  table, pre, blockquote { page-break-inside: avoid; }
</style></head>
<body>${body}</body></html>`;

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({
    path: output,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "15mm", right: "15mm" },
  });
  console.log(`✓ ${output}`);
} finally {
  await browser.close();
}
process.exit(0);

import "server-only";
import puppeteer from "puppeteer";

/**
 * Render an HTML string to an A4 PDF. Uses the Puppeteer-bundled Chromium, which
 * runs on the self-hosted VPS as well as locally. (For a serverless target,
 * swap to puppeteer-core + @sparticuz/chromium — same call site.)
 */
export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
    });
  } finally {
    await browser.close();
  }
}

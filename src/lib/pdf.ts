import "server-only";
import type { Browser } from "puppeteer-core";

/**
 * Render an HTML string to an A4 PDF.
 *
 * Two launch paths, same call site:
 *  - Serverless (Vercel / AWS Lambda): puppeteer-core + @sparticuz/chromium,
 *    which ships a Chromium build sized for the function environment.
 *  - Local / self-hosted VPS: the full `puppeteer` package's bundled Chromium
 *    (a devDependency), for zero-config local development.
 */
export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const browser = await launchBrowser();
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

const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION;

async function launchBrowser(): Promise<Browser> {
  if (isServerless) {
    // chromium-min ships no binary; it downloads Chromium from a URL at runtime
    // (cached in /tmp), so nothing has to be bundled/traced by Turbopack/Vercel.
    const chromium = (await import("@sparticuz/chromium-min")).default;
    const puppeteer = await import("puppeteer-core");
    const packUrl =
      process.env.CHROMIUM_PACK_URL ??
      "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar";
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(packUrl),
      headless: true,
    });
  }
  // Local / VPS: full puppeteer with its bundled Chromium.
  const puppeteer = (await import("puppeteer")).default;
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  }) as unknown as Browser;
}

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Keep the headless-browser deps out of the bundle (used only by the
  // local/VPS PDF path; on Vercel the PDF route serves a print-ready page).
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium-min"],
};

export default withNextIntl(nextConfig);

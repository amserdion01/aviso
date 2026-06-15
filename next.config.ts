import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the headless-browser deps out of the bundle so Chromium resolves at runtime.
  serverExternalPackages: ["puppeteer", "puppeteer-core"],
};

export default nextConfig;

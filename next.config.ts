import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the headless-browser deps out of the bundle so Chromium resolves at runtime.
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium"],
  // Externalizing keeps Next from rewriting the package, but Vercel's file
  // tracing still must COPY @sparticuz/chromium's compressed binary (bin/*.br)
  // into the PDF route's function bundle — otherwise executablePath() can't
  // find it at runtime. Force-include it.
  outputFileTracingIncludes: {
    "/referate/[id]/pdf": [
      "./node_modules/.pnpm/@sparticuz+chromium@149.0.0/node_modules/@sparticuz/chromium/bin/**",
    ],
  },
};

export default nextConfig;

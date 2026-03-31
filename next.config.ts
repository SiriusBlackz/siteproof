import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "puppeteer", "puppeteer-core", "@sparticuz/chromium"],
};

export default nextConfig;

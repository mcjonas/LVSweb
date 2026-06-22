import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js/Turbopack NOT to bundle these packages — use them as
  // native Node.js externals instead. This prevents Turbopack from
  // wrapping @neondatabase/serverless in its own module system, which
  // breaks the package's internal fetch calls in the server runtime.
  serverExternalPackages: [
    '@neondatabase/serverless',
    'drizzle-orm',
  ],
};

export default nextConfig;

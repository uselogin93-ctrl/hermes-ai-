import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@careerpulse/shared-types"],
  serverExternalPackages: ["@electric-sql/pglite"],
  // Bundle the SQL migration files and prompt templates so the runtime
  // migrator and prompt loader work on serverless deploys (Vercel), where the
  // repository checkout is not present.
  outputFileTracingIncludes: {
    "/api/**": ["./drizzle/**/*", "./src/lib/agents/prompts/**/*"],
  },
  eslint: {
    dirs: ["src", "e2e"],
  },
};

export default nextConfig;

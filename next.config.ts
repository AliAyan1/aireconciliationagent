import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prefer webpack over Turbopack (less disk churn; avoids Turbopack panics on low disk space).
  // `npm run dev` passes --webpack via package.json scripts.
};

export default nextConfig;

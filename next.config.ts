import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's file tracer doesn't know to bundle Prisma's native query-engine
  // binary from a custom generator output path, so every serverless
  // function that touches the DB 500s on Vercel unless we say so explicitly.
  outputFileTracingIncludes: {
    "/**/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;

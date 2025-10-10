import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    // Explicitly pass environment variables to avoid parsing issues
    AUTH_USERNAME: process.env.AUTH_USERNAME,
    AUTH_PASSWORD_HASH: process.env.AUTH_PASSWORD_HASH,
    JWT_SECRET: process.env.JWT_SECRET,
  },
  // Enable instrumentation for job progress listener
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;

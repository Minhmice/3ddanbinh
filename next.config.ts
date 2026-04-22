import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Static HTML export for nginx/Coolify — outputs `out/`. */
  // NOTE: Route Handlers (e.g. /api/*) don't work with static export.
  // Keep export for production builds, but allow API routes in dev (needed for debugging).
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  allowedDevOrigins: ["192.168.1.248"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

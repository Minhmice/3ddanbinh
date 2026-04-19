import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Static HTML export for nginx/Coolify — outputs `out/`. */
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

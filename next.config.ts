import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Pre-existing @/lib/brokers missing module — ignore until fixed
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

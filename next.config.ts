import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: false,
  },
};

export default nextConfig;

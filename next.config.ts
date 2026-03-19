import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopackUseSystemTlsCerts: true,
    serverActions: {
      bodySizeLimit: "20mb",
      allowedOrigins: ["localhost:3000", "127.0.0.1:3000", "localhost:3001", "127.0.0.1:3001", "*.app.github.dev"],
    },
  },
};

export default nextConfig;

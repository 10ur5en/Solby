import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@aptos-connect/wallet-adapter-plugin": path.resolve(__dirname, "src/shims/aptosConnectPlugin.ts"),
    };
    return config;
  },
};

export default nextConfig;

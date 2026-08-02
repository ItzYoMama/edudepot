import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // Binabypass ang ESLint check tuwing nagbu-build sa Vercel
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
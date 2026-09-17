import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "bcryptjs", "@prisma/adapter-libsql"],
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 300,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    cpus: 1,
    workerThreads: false,
    memoryBasedWorkersCount: true
  }
};

export default nextConfig;

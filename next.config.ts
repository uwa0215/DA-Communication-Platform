import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "@prisma/adapter-libsql"],
  images: {
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

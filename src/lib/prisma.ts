import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL!,
    max: 10, // Limit connections to prevent exhaustion
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Timeout after 5s instead of hanging indefinitely
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

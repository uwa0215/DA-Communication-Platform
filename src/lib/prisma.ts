import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const isProduction = process.env.NODE_ENV === 'production';
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL || "postgresql://dummy:dummy@dummy/dummy",
    max: isProduction ? 50 : 10,
    idleTimeoutMillis: isProduction ? 60000 : 30000,
    connectionTimeoutMillis: isProduction ? 10000 : 5000,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

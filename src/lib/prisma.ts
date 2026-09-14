import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getSslConfig() {
  const url = process.env.DATABASE_URL || '';
  if (url.includes('sslmode=disable') || url.includes('localhost') || url.includes('127.0.0.1') || url.includes('railway.internal') || (url.includes('railway') && !url.includes('sslmode=require'))) {
    return undefined;
  }
  if (url.includes('sslmode=require') || url.includes('neon.tech') || url.includes('supabase') || url.includes('render.com')) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

function createPrismaClient() {
  const isProduction = process.env.NODE_ENV === 'production';
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL || "postgresql://dummy:dummy@dummy/dummy",
    max: isProduction ? 50 : 10,
    idleTimeoutMillis: isProduction ? 60000 : 30000,
    connectionTimeoutMillis: isProduction ? 10000 : 5000,
    ssl: getSslConfig(),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;


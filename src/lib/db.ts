import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://dummy:dummy@dummy/dummy",
  // Production: more connections, longer timeouts for reliability
  // Development: fewer connections, shorter timeouts for faster feedback
  max: isProduction ? 20 : 10,
  idleTimeoutMillis: isProduction ? 60000 : 30000,
  connectionTimeoutMillis: isProduction ? 10000 : 5000,
  // Neon serverless requires SSL in production
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

// Graceful shutdown: drain pool on process exit
process.on('SIGTERM', () => {
  pool.end().catch(console.error);
});
process.on('SIGINT', () => {
  pool.end().catch(console.error);
});

export const db = drizzle(pool, { schema });

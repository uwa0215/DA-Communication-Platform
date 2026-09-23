import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const isProduction = process.env.NODE_ENV === 'production';

const connectionString = process.env.DATABASE_URL || "postgresql://dummy:dummy@dummy/dummy";
const isCloud = connectionString.includes('supabase.com') || connectionString.includes('neon.tech') || connectionString.includes('sslmode');

const pool = new Pool({
  connectionString,
  max: isProduction ? 50 : 10,
  idleTimeoutMillis: isProduction ? 60000 : 30000,
  connectionTimeoutMillis: isProduction ? 10000 : 5000,
  ssl: (isProduction || isCloud) ? { rejectUnauthorized: false } : undefined,
});

// Graceful shutdown: drain pool on process exit
process.on('SIGTERM', () => {
  pool.end().catch(console.error);
});
process.on('SIGINT', () => {
  pool.end().catch(console.error);
});

export const db = drizzle(pool, { schema });

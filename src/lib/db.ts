import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const isProduction = process.env.NODE_ENV === 'production';

function getSslConfig() {
  const url = process.env.DATABASE_URL || '';
  if (url.includes('sslmode=disable') || url.includes('localhost') || url.includes('127.0.0.1') || url.includes('railway.internal')) {
    return undefined;
  }
  if (url.includes('sslmode=require') || url.includes('neon.tech') || url.includes('supabase') || url.includes('render.com')) {
    return { rejectUnauthorized: false };
  }
  return isProduction ? { rejectUnauthorized: false } : undefined;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://dummy:dummy@dummy/dummy",
  max: isProduction ? 50 : 10,
  idleTimeoutMillis: isProduction ? 60000 : 30000,
  connectionTimeoutMillis: isProduction ? 10000 : 5000,
  ssl: getSslConfig(),
});

// Graceful shutdown: drain pool on process exit
process.on('SIGTERM', () => {
  pool.end().catch(console.error);
});
process.on('SIGINT', () => {
  pool.end().catch(console.error);
});

export const db = drizzle(pool, { schema });


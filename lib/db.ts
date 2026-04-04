import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

let pool: Pool | null = null;
let schemaInitPromise: Promise<void> | null = null;

const schemaFilePath = path.join(process.cwd(), 'db', 'schema.sql');

export const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  return pool;
};

export async function ensureDbSchema() {
  if (!process.env.DATABASE_URL) return;

  const db = getDb();

  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      const sql = fs.readFileSync(schemaFilePath, 'utf-8');
      await db.query(sql);
    })().catch((error) => {
      schemaInitPromise = null;
      throw error;
    });
  }

  await schemaInitPromise;
}

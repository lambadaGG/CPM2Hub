import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL ?? '';

export const isDbConfigured = () => Boolean(connectionString);

let _db: ReturnType<typeof makeDb> | null = null;
let _client: ReturnType<typeof postgres> | null = null;
let unavailable: string | null = connectionString ? null : 'DATABASE_URL is not set';

function makeDb() {
  const client = postgres(connectionString, { prepare: false, ssl: 'require' });
  _client = client;
  return drizzle(client, { schema });
}

function getDb() {
  if (unavailable) throw new Error(unavailable);
  if (!_db) _db = makeDb();
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof makeDb>, {
  get(_target, prop, _receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === 'function' ? value.bind(real) : value;
  },
}) as unknown as ReturnType<typeof makeDb>;

export { schema };
export { getDb };

/** Close the underlying postgres.js connection pool (used on graceful shutdown). */
export async function closeDb(): Promise<void> {
  if (_client) {
    const client = _client;
    _client = null;
    await client.end();
  }
}

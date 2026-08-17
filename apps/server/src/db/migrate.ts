import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = postgres(url, { prepare: false, max: 1, ssl: 'require' });
const db = drizzle(client);

try {
  // Official Drizzle migrator: reads drizzle/meta/_journal.json and applies
  // each pending *.sql file inside a transaction, recording them in the
  // __drizzle_migrations journal.
  await migrate(db, { migrationsFolder: resolve(__dirname, '../../drizzle') });
  console.log('[migrate] ✓ all migrations applied');

  const tables = await client`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `;
  console.log('[migrate] tables:', tables.map((t) => t.tablename).join(', '));
} catch (err) {
  console.error('[migrate] failed:', err);
  process.exitCode = 1;
} finally {
  await client.end();
}

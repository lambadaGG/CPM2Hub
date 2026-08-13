import 'dotenv/config';
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const drizzleDir = resolve(__dirname, '../../drizzle');
const migrations = readdirSync(drizzleDir)
  .filter((f) => /^\d+_.*\.sql$/.test(f))
  .sort();

const client = postgres(url, { prepare: false, max: 1, ssl: 'require' });

try {
  for (const file of migrations) {
    const ddl = readFileSync(resolve(drizzleDir, file), 'utf8');
    console.log(`[migrate] applying ${file} ...`);
    await client.unsafe(ddl);
  }
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

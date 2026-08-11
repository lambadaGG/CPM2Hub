import 'dotenv/config';
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sqlPath = resolve(__dirname, '../../drizzle/0000_init.sql');
const ddl = readFileSync(sqlPath, 'utf8');

const client = postgres(url, { prepare: false, max: 1 });

try {
  console.log('[migrate] applying 0000_init.sql ...');
  await client.unsafe(ddl);
  console.log('[migrate] ✓ DDL applied');

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

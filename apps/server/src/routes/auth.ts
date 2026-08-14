import { eq } from 'drizzle-orm';
import type { Context, Next } from 'hono';
import { db } from '../db/index';
import { users } from '../db/schema';
import { verifyInitData } from '../lib/initData';

export interface AuthedUser {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string;
}

const ANON_ID = 1;

const USER_CACHE_TTL = 60_000;
const userCache = new Map<number, { row: typeof users.$inferSelect; ts: number }>();

async function findOrCreateUser(telegramId: number, firstName: string, username?: string | null, language?: string | null) {
  const cached = userCache.get(telegramId);
  if (cached && Date.now() - cached.ts < USER_CACHE_TTL) return cached.row;

  let row: typeof users.$inferSelect | undefined;
  const [existing] = await db.select().from(users).where(eq(users.telegramId, telegramId));
  if (existing) {
    row = existing;
  } else {
    const [created] = await db
      .insert(users)
      .values({ telegramId, firstName, username: username ?? null, language: language ?? null, createdAt: Date.now() })
      .onConflictDoNothing()
      .returning();
    if (created) {
      row = created;
    } else {
      const [again] = await db.select().from(users).where(eq(users.telegramId, telegramId));
      row = again;
    }
  }

  if (row) userCache.set(telegramId, { row, ts: Date.now() });
  return row;
}

export async function auth(c: Context, next: Next) {
  const token = process.env.BOT_TOKEN ?? '';
  const raw = c.req.header('X-Init-Data');

  let telegramId: number;
  let firstName = 'User';
  let username: string | null = null;
  let language: string | null = null;

  if (raw) {
    const verified = verifyInitData(raw, token);
    if (!verified) return c.json({ error: 'invalid_init_data' }, 401);
    telegramId = verified.userId;
    firstName = verified.user?.first_name ?? 'User';
    username = verified.user?.username ?? null;
    language = verified.user?.language_code ?? null;
  } else if (process.env.ALLOW_ANON === '1') {
    telegramId = ANON_ID;
    firstName = 'DEV';
    username = 'dev_user';
  } else {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const user = await findOrCreateUser(telegramId, firstName, username, language);
  if (!user) return c.json({ error: 'user_lookup_failed' }, 500);
  c.set('user', {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
  } satisfies AuthedUser);

  await next();
}

export function getUser(c: Context): AuthedUser {
  return c.get('user');
}

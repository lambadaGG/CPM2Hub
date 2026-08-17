import { eq, sql } from 'drizzle-orm';
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { LRUCache } from 'lru-cache';
import { db } from '../db/index';
import { users } from '../db/schema';
import { verifyInitData } from '../lib/initData';
import { generateReferralCode, REFERRAL_REWARD_STARS } from '../lib/gamification';

export interface AuthedUser {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string;
}

export type AppEnv = { Variables: { user: AuthedUser } };

const ANON_ID = 1;

const userCache = new LRUCache<number, typeof users.$inferSelect>({
  max: 10_000,
  ttl: 10 * 60 * 1000,
});

async function findOrCreateUser(
  telegramId: number,
  firstName: string,
  username?: string | null,
  language?: string | null,
  startParam?: string,
) {
  const cached = userCache.get(telegramId);
  if (cached) return cached;

  let row: typeof users.$inferSelect | undefined;
  const [existing] = await db.select().from(users).where(eq(users.telegramId, telegramId));
  if (existing) {
    row = existing;
  } else {
    const referralCode = generateReferralCode(telegramId);
    const [created] = await db
      .insert(users)
      .values({
        telegramId,
        firstName,
        username: username ?? null,
        language: language ?? null,
        referralCode,
        createdAt: Date.now(),
      })
      .onConflictDoNothing()
      .returning();
    if (created) {
      row = created;
      await applyReferral(created.id, startParam);
    } else {
      const [again] = await db.select().from(users).where(eq(users.telegramId, telegramId));
      row = again;
    }
  }

  if (row) userCache.set(telegramId, row);
  return row;
}

/** Link a new user to a referrer via start_param (ref_<CODE>) and pay the referrer once. */
async function applyReferral(newUserId: number, startParam?: string): Promise<void> {
  if (!startParam?.startsWith('ref_')) return;
  const code = startParam.slice(4);
  if (!/^[A-Za-z0-9]{4,20}$/.test(code)) return;
  const [referrer] = await db.select().from(users).where(eq(users.referralCode, code));
  if (!referrer || referrer.id === newUserId) return;

  await db.transaction(async (tx) => {
    await tx.update(users).set({ referredBy: referrer.id }).where(eq(users.id, newUserId));
    await tx
      .update(users)
      .set({ creditsStars: sql`${users.creditsStars} + ${REFERRAL_REWARD_STARS}` })
      .where(eq(users.id, referrer.id));
  });
}

export const auth = createMiddleware<AppEnv>(async (c, next) => {
  const token = process.env.BOT_TOKEN ?? '';
  const raw = c.req.header('X-Init-Data');

  let telegramId: number;
  let firstName = 'User';
  let username: string | null = null;
  let language: string | null = null;
  let startParam: string | undefined;

  if (raw) {
    const verified = verifyInitData(raw, token);
    if (!verified) return c.json({ error: 'invalid_init_data' }, 401);
    telegramId = verified.userId;
    firstName = verified.user?.first_name ?? 'User';
    username = verified.user?.username ?? null;
    language = verified.user?.language_code ?? null;
    startParam = verified.startParam;
  } else if (process.env.ALLOW_ANON === '1') {
    telegramId = ANON_ID;
    firstName = 'DEV';
    username = 'dev_user';
  } else {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const user = await findOrCreateUser(telegramId, firstName, username, language, startParam);
  if (!user) return c.json({ error: 'user_lookup_failed' }, 500);
  c.set('user', {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
  } satisfies AuthedUser);

  await next();
});

export function getUser(c: Context<AppEnv>): AuthedUser {
  return c.get('user');
}

import { and, eq, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db } from '../db/index';
import { dailyClaims, users } from '../db/schema';
import type { DailyClaimResponse } from '@gm/shared';

export const DAILY_REWARD_STARS = 30;
export const STREAK_MILESTONE = 7;
export const STREAK_BONUS_STARS = 30;
export const REFERRAL_REWARD_STARS = 50;
export const REFERRAL_PURCHASE_PERCENT = 10;

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateKeyOffset(base: string, offsetDays: number): string {
  const [y, m, d] = base.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + offsetDays);
  return dateKey(dt);
}

const PALETTE: Array<[string, string, string]> = [
  ['Midnight Violet', '#2A1B4A', '#6A3DB0'],
  ['Amber Sunrise', '#FF9F0A', '#FFD60A'],
  ['Emerald Shadow', '#0F3D2E', '#30D158'],
  ['Arctic Frost', '#1B2A4A', '#5AC8FA'],
  ['Crimson Strike', '#4A0F0F', '#FF453A'],
  ['Voltage Lime', '#2E3D0F', '#A3F34A'],
  ['Neon Pink', '#3D0F2E', '#FF2D95'],
];

export function dailyLivery(key: string): { title: string; configCode: string } {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const [title, base, pearl] = PALETTE[hash % PALETTE.length];
  return {
    title,
    configCode: `VINYL=${key.replace(/-/g, '_')}_daily;BASE=${base};PEARL=${pearl};CLEAR=0.9`,
  };
}

/** True when the user has already claimed today (used for /me status). */
export async function hasClaimedToday(userId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: dailyClaims.id })
    .from(dailyClaims)
    .where(and(eq(dailyClaims.userId, userId), eq(dailyClaims.claimDate, dateKey(new Date()))));
  return row != null;
}

/**
 * Claim the daily bonus. Race-safe via the unique (user_id, claim_date) index:
 * the insert either wins or the claim was already made.
 */
export async function claimDaily(userId: number): Promise<{ error?: string; claim?: DailyClaimResponse }> {
  const now = new Date();
  const key = dateKey(now);

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return { error: 'not_found' };

  const livery = dailyLivery(key);

  const [inserted] = await db
    .insert(dailyClaims)
    .values({ userId, claimDate: key, streak: 0, rewardStars: 0, bonusStars: 0, createdAt: Date.now() })
    .onConflictDoNothing()
    .returning({ id: dailyClaims.id });
  if (!inserted) return { error: 'already_claimed' };

  const yesterday = dateKeyOffset(key, -1);
  const contiguous = user.lastClaimAt != null && dateKey(new Date(user.lastClaimAt)) === yesterday;
  const streak = contiguous ? (user.streak ?? 0) + 1 : 1;
  const bonus = streak % STREAK_MILESTONE === 0 ? STREAK_BONUS_STARS : 0;
  const reward = DAILY_REWARD_STARS;

  await db.transaction(async (tx) => {
    await tx
      .update(dailyClaims)
      .set({ streak, rewardStars: reward, bonusStars: bonus })
      .where(and(eq(dailyClaims.userId, userId), eq(dailyClaims.claimDate, key)));
    await tx
      .update(users)
      .set({ creditsStars: sql`${users.creditsStars} + ${reward + bonus}`, streak, lastClaimAt: now.getTime() })
      .where(eq(users.id, userId));
  });

  return {
    claim: {
      streak,
      rewardStars: reward,
      bonusStars: bonus,
      configCode: livery.configCode,
      configTitle: livery.title,
    },
  };
}

export function generateReferralCode(userId: number): string {
  const rand = randomBytes(4).toString('hex').toUpperCase();
  return `REF${(userId * 31).toString(36).toUpperCase()}${rand}`.slice(0, 16);
}

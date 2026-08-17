import { Hono } from 'hono';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { dailyClaims, purchases, users, referralRewards } from '../db/schema';
import { getUser, type AppEnv } from './auth';
import { isAdminTelegramId } from '../lib/admin';
import { claimDaily, dateKey, dateKeyOffset, generateReferralCode, hasClaimedToday, REFERRAL_REWARD_STARS } from '../lib/gamification';

export const meRoute = new Hono<AppEnv>();

function referralLink(code: string | null | undefined): string {
  const username = process.env.BOT_USERNAME ?? 'cpm2hub_bot';
  return code ? `https://t.me/${username}?startapp=ref_${code}` : '';
}

meRoute.get('/me', async (c) => {
  const u = getUser(c);
  const [user] = await db.select().from(users).where(eq(users.id, u.id));
  if (!user) return c.json({ error: 'not_found' }, 404);

  let referralCode = user.referralCode;
  if (!referralCode) {
    referralCode = generateReferralCode(u.id);
    await db.update(users).set({ referralCode }).where(eq(users.id, u.id));
  }

  const [paid] = await db
    .select({
      count: sql<number>`count(*)::int`.as('count'),
      total: sql<number>`coalesce(sum(amount_stars), 0)::int`.as('total'),
    })
    .from(purchases)
    .where(sql`${purchases.userId} = ${u.id} and ${purchases.status} = 'paid'`);

  const [invites] = await db
    .select({ n: count() })
    .from(users)
    .where(eq(users.referredBy, u.id));

  const dailyClaimed = await hasClaimedToday(u.id);

  const today = dateKey(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => dateKeyOffset(today, i - 6));
  const weekClaims = await db
    .select({ claimDate: dailyClaims.claimDate })
    .from(dailyClaims)
    .where(and(eq(dailyClaims.userId, u.id), inArray(dailyClaims.claimDate, weekDays)));
  const claimedSet = new Set(weekClaims.map((c) => c.claimDate));

  return c.json({
    user: {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      creditsStars: user.creditsStars,
      creditsTn: user.creditsTn,
      createdAt: user.createdAt,
    },
    purchasesCount: paid?.count ?? 0,
    totalSpent: paid?.total ?? 0,
    isAdmin: isAdminTelegramId(user.telegramId),
    referralCode,
    referralCount: invites?.n ?? 0,
    streak: user.streak ?? 0,
    dailyClaimed,
    week: weekDays.map((date) => ({ date, claimed: claimedSet.has(date) })),
  });
});

meRoute.get('/me/referral', async (c) => {
  const u = getUser(c);
  const [user] = await db.select().from(users).where(eq(users.id, u.id));
  if (!user) return c.json({ error: 'not_found' }, 404);

  let referralCode = user.referralCode;
  if (!referralCode) {
    referralCode = generateReferralCode(u.id);
    await db.update(users).set({ referralCode }).where(eq(users.id, u.id));
  }

  const [invites] = await db
    .select({ n: count() })
    .from(users)
    .where(eq(users.referredBy, u.id));
  const [earnings] = await db
    .select({ total: sql<number>`coalesce(sum(${referralRewards.amountStars}), 0)::int` })
    .from(referralRewards)
    .where(eq(referralRewards.referrerId, u.id));
  return c.json({
    code: referralCode,
    link: referralLink(referralCode),
    count: invites?.n ?? 0,
    rewardStars: REFERRAL_REWARD_STARS,
    totalEarned: earnings?.total ?? 0,
  });
});

meRoute.get('/me/referral/list', async (c) => {
  const u = getUser(c);
  const referred = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      username: users.username,
      telegramId: users.telegramId,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.referredBy, u.id))
    .orderBy(sql`${users.createdAt} desc`);

  const buyerIds = referred.map((r) => r.id);
  if (buyerIds.length === 0) return c.json({ users: [], totalEarned: 0 });

  const rewards = await db
    .select({
      buyerId: referralRewards.buyerId,
      total: sql<number>`coalesce(sum(${referralRewards.amountStars}), 0)::int`,
      purchases: count(referralRewards.id),
    })
    .from(referralRewards)
    .where(and(eq(referralRewards.referrerId, u.id), inArray(referralRewards.buyerId, buyerIds)))
    .groupBy(referralRewards.buyerId);

  const rewardsMap = new Map(rewards.map((r) => [r.buyerId, { earned: r.total, purchases: r.purchases }]));

  let totalEarned = 0;
  const list = referred.map((r) => {
    const rr = rewardsMap.get(r.id);
    const earned = rr?.earned ?? 0;
    totalEarned += earned;
    return {
      id: r.id,
      firstName: r.firstName,
      username: r.username,
      telegramId: r.telegramId,
      joinedAt: r.createdAt,
      earned,
      purchases: rr?.purchases ?? 0,
    };
  });

  return c.json({ users: list, totalEarned });
});

meRoute.get('/me/referral/leaderboard', async (c) => {
  const rows = await db
    .select({
      referrerId: referralRewards.referrerId,
      total: sql<number>`coalesce(sum(${referralRewards.amountStars}), 0)::int`,
      purchases: count(referralRewards.id),
    })
    .from(referralRewards)
    .groupBy(referralRewards.referrerId)
    .orderBy(sql`sum(${referralRewards.amountStars}) desc`)
    .limit(20);

  if (rows.length === 0) return c.json({ leaderboard: [] });

  const userIds = rows.map((r) => r.referrerId);
  const userRows = await db
    .select({ id: users.id, firstName: users.firstName, username: users.username, telegramId: users.telegramId })
    .from(users)
    .where(inArray(users.id, userIds));
  const userMap = new Map(userRows.map((u) => [u.id, u]));

  const leaderboard = rows.map((r, i) => ({
    rank: i + 1,
    ...userMap.get(r.referrerId)!,
    totalEarned: r.total,
    purchases: r.purchases,
  }));

  return c.json({ leaderboard });
});

meRoute.post('/me/claim-daily', async (c) => {
  const u = getUser(c);
  const res = await claimDaily(u.id);
  if (res.error) return c.json({ error: res.error }, 400);
  return c.json({ claim: res.claim });
});

meRoute.delete('/me', async (c) => {
  const u = getUser(c);
  await db.delete(users).where(eq(users.id, u.id));
  return c.json({ deleted: true });
});

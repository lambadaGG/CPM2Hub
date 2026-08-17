import { Hono } from 'hono';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { products, purchases, topups, users, referralRewards } from '../db/schema';
import { getUser, type AppEnv } from './auth';
import { fetchStarTransactions, refundPurchase } from '../lib/stars';
import { isAdminTelegramId } from '../lib/admin';
import type { ModerationStatus } from '@gm/shared';

export const adminRoute = new Hono<AppEnv>();

function isAdmin(telegramId: number): boolean {
  return isAdminTelegramId(telegramId);
}

adminRoute.get('/admin/stars', async (c) => {
  const u = getUser(c);
  if (!isAdmin(u.telegramId)) return c.json({ error: 'forbidden' }, 403);

  const { balance, transactions } = await fetchStarTransactions({ limit: 100 });

  const [{ salesTotal }] = await db
    .select({ salesTotal: sql<number>`coalesce(sum(${purchases.amountStars}), 0)::int` })
    .from(purchases)
    .where(eq(purchases.status, 'paid'));
  const [{ pendingBuys }] = await db
    .select({ pendingBuys: sql<number>`count(*)::int` })
    .from(purchases)
    .where(eq(purchases.status, 'pending'));
  const [{ pendingTopups }] = await db
    .select({ pendingTopups: sql<number>`count(*)::int` })
    .from(topups)
    .where(eq(topups.status, 'pending'));
  const [{ liveProducts }] = await db
    .select({ liveProducts: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.active, true));

  const revenue = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  return c.json({
    bot: {
      balance,
      revenue,
    },
    platform: {
      totalSalesStars: salesTotal,
      pendingBuys,
      pendingTopups,
      liveProducts,
    },
    recent: transactions.slice(0, 20).map((t) => ({
      id: t.id,
      amount: t.amount,
      date: t.date,
      kind: t.amount > 0 ? 'income' : 'expense',
      refund: t.amount < 0,
      payload: t.source?.type === 'user' ? (t.source.invoice_payload ?? null) : null,
    })),
  });
});

adminRoute.get('/admin/purchases', async (c) => {
  const u = getUser(c);
  if (!isAdmin(u.telegramId)) return c.json({ error: 'forbidden' }, 403);

  const raw = Number(c.req.query('limit'));
  const limit = Number.isInteger(raw) && raw > 0 ? Math.min(raw, 200) : 50;

  const rows = await db
    .select({ purchase: purchases, product: products, buyer: users })
    .from(purchases)
    .innerJoin(products, eq(purchases.productId, products.id))
    .innerJoin(users, eq(purchases.userId, users.id))
    .orderBy(desc(purchases.createdAt))
    .limit(limit);

  return c.json(
    rows.map((r) => ({
      id: r.purchase.id,
      amountStars: r.purchase.amountStars,
      status: r.purchase.status,
      refunded: r.purchase.refunded,
      chargeId: r.purchase.chargeId,
      createdAt: r.purchase.createdAt,
      productTitle: r.product.title,
      buyer: {
        username: r.buyer.username,
        firstName: r.buyer.firstName,
        telegramId: r.buyer.telegramId,
      },
    })),
  );
});

adminRoute.post('/admin/refund', async (c) => {
  const u = getUser(c);
  if (!isAdmin(u.telegramId)) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json().catch(() => null);
  const id = Number((body as { purchaseId?: unknown } | null)?.purchaseId);
  if (!Number.isInteger(id)) return c.json({ error: 'bad_id' }, 400);

  const res = await refundPurchase(id);
  if (!res.ok) return c.json({ error: res.error ?? 'failed' }, 400);

  return c.json({ ok: true, purchaseId: id });
});

adminRoute.post('/admin/grant', async (c) => {
  const u = getUser(c);
  if (!isAdmin(u.telegramId)) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json().catch(() => null);
  const telegramId = Number(body?.telegramId);
  const stars = Number(body?.stars);
  const tn = Number(body?.tn);
  if (!Number.isInteger(telegramId)) return c.json({ error: 'bad_id' }, 400);
  if (!Number.isInteger(stars) && !Number.isInteger(tn)) return c.json({ error: 'bad_amount' }, 400);

  const [target] = await db.select().from(users).where(eq(users.telegramId, telegramId));
  if (!target) return c.json({ error: 'not_found' }, 404);

  const [updated] = await db
    .update(users)
    .set({
      ...(Number.isInteger(stars) ? { creditsStars: sql`${users.creditsStars} + ${stars}` } : {}),
      ...(Number.isInteger(tn) ? { creditsTn: sql`${users.creditsTn} + ${tn}` } : {}),
    })
    .where(eq(users.id, target.id))
    .returning({ creditsStars: users.creditsStars, creditsTn: users.creditsTn });

  return c.json({ ok: true, telegramId, creditsStars: updated?.creditsStars ?? target.creditsStars, creditsTn: updated?.creditsTn ?? target.creditsTn });
});

adminRoute.post('/admin/products/:id/moderate', async (c) => {
  const u = getUser(c);
  if (!isAdmin(u.telegramId)) return c.json({ error: 'forbidden' }, 403);

  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'bad_id' }, 400);

  const body = await c.req.json().catch(() => null);
  const status = body?.status as ModerationStatus | undefined;
  if (status !== 'approved' && status !== 'rejected') return c.json({ error: 'bad_status' }, 400);

  const [updated] = await db.update(products).set({ moderationStatus: status }).where(eq(products.id, id)).returning();
  if (!updated) return c.json({ error: 'not_found' }, 404);

  return c.json({ id: updated.id, moderationStatus: updated.moderationStatus });
});

adminRoute.get('/admin/pending', async (c) => {
  const u = getUser(c);
  if (!isAdmin(u.telegramId)) return c.json({ error: 'forbidden' }, 403);

  const rows = await db.select().from(products).where(eq(products.moderationStatus, 'pending'));
  return c.json(rows);
});

adminRoute.get('/admin/referral', async (c) => {
  const u = getUser(c);
  if (!isAdmin(u.telegramId)) return c.json({ error: 'forbidden' }, 403);

  const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`count(*)::int` }).from(users);
  const [{ totalReferred }] = await db.select({ totalReferred: sql<number>`count(*)::int` }).from(users).where(sql`${users.referredBy} is not null`);
  const [{ totalRewards }] = await db.select({ totalRewards: sql<number>`coalesce(sum(${referralRewards.amountStars}), 0)::int` }).from(referralRewards);
  const [{ rewardCount }] = await db.select({ rewardCount: sql<number>`count(*)::int` }).from(referralRewards);

  return c.json({
    totalUsers,
    totalReferred,
    totalRewards,
    rewardCount,
    referredPercent: totalUsers > 0 ? Math.round(totalReferred / totalUsers * 100) : 0,
  });
});

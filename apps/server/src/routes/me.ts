import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { purchases, users } from '../db/schema';
import { getUser } from './auth';

export const meRoute = new Hono();

meRoute.get('/me', async (c) => {
  const u = getUser(c);
  const [user] = await db.select().from(users).where(eq(users.id, u.id));
  if (!user) return c.json({ error: 'not_found' }, 404);

  const [paid] = await db
    .select({
      count: sql<number>`count(*)::int`.as('count'),
      total: sql<number>`coalesce(sum(amount_stars), 0)::int`.as('total'),
    })
    .from(purchases)
    .where(sql`${purchases.userId} = ${u.id} and ${purchases.status} = 'paid'`);

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
  });
});

meRoute.delete('/me', async (c) => {
  const u = getUser(c);
  await db.delete(users).where(eq(users.id, u.id));
  return c.json({ deleted: true });
});
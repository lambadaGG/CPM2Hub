import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { purchases, users } from '../db/schema';
import { getUser } from './auth';

export const meRoute = new Hono();

meRoute.get('/me', async (c) => {
  const u = getUser(c);
  const user = db.select().from(users).where(eq(users.id, u.id)).get();
  if (!user) return c.json({ error: 'not_found' }, 404);

  const paid = db
    .select({ count: sql<number>`count(*)`.as('count'), total: sql<number>`coalesce(sum(amount_stars), 0)`.as('total') })
    .from(purchases)
    .where(sql`${purchases.userId} = ${u.id} and ${purchases.status} = 'paid'`)
    .get();

  return c.json({
    user: {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      creditsStars: user.creditsStars,
      createdAt: user.createdAt,
    },
    purchasesCount: paid?.count ?? 0,
    totalSpent: paid?.total ?? 0,
  });
});

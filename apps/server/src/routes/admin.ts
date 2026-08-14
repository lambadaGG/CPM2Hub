import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { products } from '../db/schema';
import { getUser } from './auth';
import type { ModerationStatus } from '@gm/shared';

export const adminRoute = new Hono();

function isAdmin(telegramId: number): boolean {
  const list = process.env.ADMIN_IDS ?? '';
  return list.split(',').map((s) => s.trim()).filter(Boolean).includes(String(telegramId));
}

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

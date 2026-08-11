import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { trades } from '../db/schema';
import { getUser } from './auth';

export const tradesRoute = new Hono();

tradesRoute.get('/trades', async (c) => {
  const u = getUser(c);
  const rows = await db.select().from(trades).where(eq(trades.creatorId, u.id)).orderBy(desc(trades.createdAt));
  return c.json(
    rows.map((t) => ({
      id: t.id,
      kind: t.kind,
      offer: t.offer,
      receive: t.receive,
      peer: t.peer,
      status: t.status,
      createdAt: t.createdAt,
    })),
  );
});

tradesRoute.post('/trades', async (c) => {
  const u = getUser(c);
  const body = await c.req.json().catch(() => null);
  if (!body || !body.offer || !body.receive) return c.json({ error: 'invalid_body' }, 400);

  const kind = ['money', 'car', 'vinyl'].includes(body.kind) ? body.kind : 'money';
  const [created] = await db
    .insert(trades)
    .values({
      creatorId: u.id,
      kind,
      offer: String(body.offer),
      receive: String(body.receive),
      peer: String(body.peer ?? ''),
      status: 'waiting',
      createdAt: Date.now(),
    })
    .returning();

  return c.json({ id: created.id, status: created.status }, 201);
});

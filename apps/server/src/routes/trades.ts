import { Hono } from 'hono';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { trades, users } from '../db/schema';
import { getUser, type AppEnv } from './auth';
import { actTrade, canAct, notifyTrade, roleFor, type TradeAction, type TradeRow } from '../lib/escrow';

export const tradesRoute = new Hono<AppEnv>();

const KINDS: TradeRow['kind'][] = ['money', 'car', 'vinyl'];
const ACTIONS: TradeAction[] = ['accept', 'decline', 'cancel', 'complete', 'dispute'];

function normalizePeer(input: string): string {
  return input.trim().replace(/^@/, '').toLowerCase();
}

function toDto(row: TradeRow, userId: number) {
  return {
    id: row.id,
    kind: row.kind,
    offer: row.offer,
    receive: row.receive,
    peer: row.peer,
    peerUserId: row.peerUserId,
    status: row.status,
    role: roleFor(row, userId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

tradesRoute.get('/trades', async (c) => {
  const u = getUser(c);
  const rows = await db
    .select()
    .from(trades)
    .where(or(eq(trades.creatorId, u.id), eq(trades.peerUserId, u.id)))
    .orderBy(desc(trades.createdAt));
  return c.json(rows.map((t) => toDto(t, u.id)));
});

tradesRoute.get('/trades/:id', async (c) => {
  const u = getUser(c);
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'bad_id' }, 400);

  const [trade] = await db.select().from(trades).where(eq(trades.id, id));
  if (!trade || !roleFor(trade, u.id)) return c.json({ error: 'not_found' }, 404);
  return c.json(toDto(trade, u.id));
});

tradesRoute.post('/trades', async (c) => {
  const u = getUser(c);
  const body = await c.req.json().catch(() => null);
  if (!body || !body.offer || !body.receive) return c.json({ error: 'invalid_body' }, 400);

  const kind = KINDS.includes(body.kind) ? body.kind : 'money';
  const peer = normalizePeer(String(body.peer ?? ''));
  if (!peer) return c.json({ error: 'need_peer' }, 400);
  if (String(body.offer).length > 100 || String(body.receive).length > 100 || peer.length > 100) {
    return c.json({ error: 'field_too_long' }, 400);
  }

  // Telegram usernames are case-insensitive; the input was lowercased, so
  // match case-insensitively against the stored value.
  const [peerUser] = await db.select().from(users).where(sql`lower(${users.username}) = ${peer}`);
  if (!peerUser) return c.json({ error: 'peer_not_found' }, 400);
  if (peerUser.id === u.id) return c.json({ error: 'self_trade' }, 400);

  const [created] = await db
    .insert(trades)
    .values({
      creatorId: u.id,
      peerUserId: peerUser.id,
      kind,
      offer: String(body.offer),
      receive: String(body.receive),
      peer: peerUser.username ?? peer,
      status: 'waiting',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    .returning();

  await notifyTrade(created, 'created', u.id);

  return c.json({ id: created.id, status: created.status }, 201);
});

tradesRoute.post('/trades/:id/:action', async (c) => {
  const u = getUser(c);
  const id = Number(c.req.param('id'));
  const action = c.req.param('action') as TradeAction;
  if (!Number.isInteger(id)) return c.json({ error: 'bad_id' }, 400);
  if (!ACTIONS.includes(action)) return c.json({ error: 'bad_action' }, 400);

  const result = await actTrade(id, action, u.id);
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.json({ id, status: result.trade.status });
});

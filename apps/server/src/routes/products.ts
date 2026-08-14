import { Hono } from 'hono';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db } from '../db/index';
import { products, purchases, users } from '../db/schema';
import { getUser } from './auth';
import type { Category, SellCategory } from '@gm/shared';

export const productsRoute = new Hono();

const CATEGORIES: Category[] = ['gearbox', 'vinyl', 'tune', 'nick'];
const SELL_CATEGORIES: SellCategory[] = ['gearbox', 'vinyl', 'tune'];
const SELL_GLYPH: Record<SellCategory, string> = { gearbox: 'gear', vinyl: 'disc', tune: 'gauge' };
const MIN_PRICE = 1;
const MAX_PRICE = 1000;

export function validateListing(input: Record<string, unknown>): { error?: string; value?: { category: SellCategory; title: string; subtitle: string; priceStars: number; configCode: string } } {
  const category = input.category as SellCategory;
  if (!SELL_CATEGORIES.includes(category)) return { error: 'bad_category' };

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (title.length < 3 || title.length > 40) return { error: 'bad_title' };

  const subtitle = typeof input.subtitle === 'string' ? input.subtitle.trim() : '';
  if (subtitle.length > 80) return { error: 'bad_subtitle' };

  const priceStars = Number(input.priceStars);
  if (!Number.isInteger(priceStars) || priceStars < MIN_PRICE || priceStars > MAX_PRICE) return { error: 'bad_price' };

  const configCode = typeof input.configCode === 'string' ? input.configCode.trim() : '';
  if (configCode.length === 0 || configCode.length > 300) return { error: 'bad_code' };

  return { value: { category, title, subtitle, priceStars, configCode } };
}

export function validatePatch(input: Record<string, unknown>): { error?: string } {
  if (input.title !== undefined) {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (title.length < 3 || title.length > 40) return { error: 'bad_title' };
  }
  if (input.subtitle !== undefined) {
    const subtitle = typeof input.subtitle === 'string' ? input.subtitle.trim() : '';
    if (subtitle.length > 80) return { error: 'bad_subtitle' };
  }
  if (input.priceStars !== undefined) {
    const priceStars = Number(input.priceStars);
    if (!Number.isInteger(priceStars) || priceStars < MIN_PRICE || priceStars > MAX_PRICE) return { error: 'bad_price' };
  }
  if (input.configCode !== undefined) {
    const configCode = typeof input.configCode === 'string' ? input.configCode.trim() : '';
    if (configCode.length === 0 || configCode.length > 300) return { error: 'bad_code' };
  }
  if (input.active !== undefined && typeof input.active !== 'boolean') return { error: 'bad_active' };
  return {};
}

function makeSlug(userId: number): string {
  return `u${userId}-${randomBytes(4).toString('hex')}`;
}

function makePayload(productId: number, userId: number): string {
  return `pay:${productId}:${userId}:${randomBytes(4).toString('hex')}`;
}

async function attachSellers<R extends { sellerId: number | null }>(rows: R[]): Promise<Array<R & { seller: { id: number; username: string | null; firstName: string } | null }>> {
  const ids = [...new Set(rows.map((r) => r.sellerId).filter((v): v is number => v != null))];
  if (ids.length === 0) return rows.map((r) => ({ ...r, seller: null }));
  const sellers = await db.select().from(users).where(inArray(users.id, ids));
  const byId = new Map(sellers.map((s) => [s.id, s]));
  return rows.map((r) => ({
    ...r,
    seller: r.sellerId != null ? byId.get(r.sellerId) ?? null : null,
  }));
}

async function toDto(row: typeof products.$inferSelect) {
  const [full] = await attachSellers([row]);
  return {
    id: full.id,
    slug: full.slug,
    category: full.category as Category,
    title: full.title,
    subtitle: full.subtitle,
    priceStars: full.priceStars,
    downloads: full.downloads,
    verified: full.verified,
    glyph: full.glyph,
    configCode: full.configCode,
    active: full.active,
    sortOrder: full.sortOrder,
    sellerId: full.sellerId,
    seller: full.seller,
  };
}

productsRoute.get('/products', async (c) => {
  const category = c.req.query('category');
  const rows = category
    ? await db.select().from(products).where(and(eq(products.active, true), eq(products.category, category as Category)))
    : await db.select().from(products).where(eq(products.active, true));

  const admins = rows.filter((r) => r.sellerId == null).sort((a, b) => a.sortOrder - b.sortOrder);
  const users_ = rows.filter((r) => r.sellerId != null).sort((a, b) => b.id - a.id);
  const out = await attachSellers([...admins, ...users_]);
  return c.json(await Promise.all(out.map(toDto)));
});

productsRoute.get('/products/mine', async (c) => {
  const u = getUser(c);
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.sellerId, u.id))
    .orderBy(desc(products.id));
  const out = await attachSellers(rows);
  return c.json(await Promise.all(out.map(toDto)));
});

productsRoute.post('/products', async (c) => {
  const u = getUser(c);
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'invalid_body' }, 400);

  const check = validateListing(body);
  if (check.error) return c.json({ error: check.error }, 400);
  const v = check.value!;

  const [created] = await db
    .insert(products)
    .values({
      slug: makeSlug(u.id),
      category: v.category,
      title: v.title,
      subtitle: v.subtitle,
      priceStars: v.priceStars,
      configCode: v.configCode,
      verified: false,
      glyph: SELL_GLYPH[v.category],
      active: true,
      sortOrder: 999,
      sellerId: u.id,
    })
    .returning();

  return c.json(await toDto(created), 201);
});

async function getOwned(id: number, userId: number) {
  if (!Number.isInteger(id)) return null;
  const [row] = await db.select().from(products).where(and(eq(products.id, id), eq(products.sellerId, userId)));
  return row ?? null;
}

productsRoute.patch('/products/:id', async (c) => {
  const u = getUser(c);
  const id = Number(c.req.param('id'));
  const row = await getOwned(id, u.id);
  if (!row) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'invalid_body' }, 400);

  const check = validatePatch(body);
  if (check.error) return c.json({ error: check.error }, 400);

  const next: Record<string, unknown> = {};
  for (const key of ['title', 'subtitle', 'priceStars', 'configCode', 'active'] as const) {
    if (body[key] !== undefined) next[key] = key === 'title' || key === 'subtitle' || key === 'configCode' ? String(body[key]).trim() : body[key];
  }
  if (Object.keys(next).length === 0) return c.json({ error: 'nothing_to_update' }, 400);

  const [updated] = await db.update(products).set(next).where(eq(products.id, id)).returning();
  return c.json(await toDto(updated));
});

productsRoute.delete('/products/:id', async (c) => {
  const u = getUser(c);
  const id = Number(c.req.param('id'));
  const row = await getOwned(id, u.id);
  if (!row) return c.json({ error: 'not_found' }, 404);

  await db.delete(products).where(eq(products.id, id));
  return c.json({ ok: true });
});

productsRoute.post('/products/:id/pay', async (c) => {
  const u = getUser(c);
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'bad_id' }, 400);

  const [prod] = await db.select().from(products).where(eq(products.id, id));
  if (!prod || !prod.active) return c.json({ error: 'not_found' }, 404);
  if (prod.sellerId == null) return c.json({ error: 'invoice_only' }, 400);
  if (prod.sellerId === u.id) return c.json({ error: 'self_pay' }, 400);

  const price = prod.priceStars;

  try {
    const result = await db.transaction(async (tx) => {
      const [deducted] = await tx
        .update(users)
        .set({ creditsStars: sql`${users.creditsStars} - ${price}` })
        .where(and(eq(users.id, u.id), sql`${users.creditsStars} >= ${price}`))
        .returning({ id: users.id });
      if (!deducted) return { error: 'not_enough_stars' as const };

      await tx
        .update(users)
        .set({ creditsStars: sql`${users.creditsStars} + ${price}` })
        .where(eq(users.id, prod.sellerId!));

      const [purchase] = await tx
        .insert(purchases)
        .values({
          userId: u.id,
          productId: prod.id,
          chargeId: null,
          payload: makePayload(prod.id, u.id),
          amountStars: price,
          status: 'paid',
          createdAt: Date.now(),
        })
        .returning();

      await tx.update(products).set({ downloads: prod.downloads + 1 }).where(eq(products.id, prod.id));

      return { ok: true as const, purchaseId: purchase.id };
    });
    if ('error' in result) return c.json({ error: result.error }, 400);
    return c.json({ purchaseId: result.purchaseId, productTitle: prod.title, configCode: prod.configCode });
  } catch (err) {
    console.error('[pay] transaction failed', err);
    return c.json({ error: 'pay_failed' }, 500);
  }
});

export { toDto as productToDto, CATEGORIES };

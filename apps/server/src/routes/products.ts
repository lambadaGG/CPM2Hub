import { Hono } from 'hono';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db } from '../db/index';
import { products, purchases, users } from '../db/schema';
import { getUser } from './auth';
import {
  CATEGORY_META,
  computeModeration,
  mediaTypeFor,
  validateListing,
  validatePatch,
} from '../lib/market';
import type { Category, MediaType, ModerationStatus, Product } from '@gm/shared';

export { validateListing, validatePatch } from '../lib/market';

export const productsRoute = new Hono();

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

function toDto(row: (typeof products.$inferSelect) & { seller?: { id: number; username: string | null; firstName: string } | null }): Product {
  const mediaType = (row.mediaType ?? CATEGORY_META[row.category as Category]?.mediaType ?? 'photo') as MediaType;
  return {
    id: row.id,
    slug: row.slug,
    category: row.category as Category,
    title: row.title,
    subtitle: row.subtitle,
    priceStars: row.priceStars,
    downloads: row.downloads,
    verified: row.verified,
    glyph: row.glyph,
    configCode: row.configCode,
    active: row.active,
    sortOrder: row.sortOrder,
    sellerId: row.sellerId,
    seller: row.seller ?? null,
    media: {
      type: mediaType,
      previewUrl: row.previewUrl,
      videoUrl: row.videoUrl,
      audioUrl: row.audioUrl,
      beforeUrl: row.beforeUrl,
      afterUrl: row.afterUrl,
    },
    serverName: row.serverName,
    params: (row.params as Product['params']) ?? {},
    moderationStatus: (row.moderationStatus ?? 'approved') as ModerationStatus,
  };
}

productsRoute.get('/products', async (c) => {
  const category = c.req.query('category');
  const base = and(eq(products.active, true), eq(products.moderationStatus, 'approved'));
  const rows = category
    ? await db.select().from(products).where(and(base, eq(products.category, category as Category)))
    : await db.select().from(products).where(base);

  const admins = rows.filter((r) => r.sellerId == null).sort((a, b) => a.sortOrder - b.sortOrder);
  const users_ = rows.filter((r) => r.sellerId != null).sort((a, b) => b.id - a.id);
  const out = await attachSellers([...admins, ...users_]);
  return c.json(out.map(toDto));
});

productsRoute.get('/products/mine', async (c) => {
  const u = getUser(c);
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.sellerId, u.id))
    .orderBy(desc(products.id));
  const out = await attachSellers(rows);
  return c.json(out.map(toDto));
});

productsRoute.post('/products', async (c) => {
  const u = getUser(c);
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'invalid_body' }, 400);

  const check = validateListing(body);
  if (check.error) return c.json({ error: check.error }, 400);
  const v = check.value!;

  const moderation: ModerationStatus = computeModeration(v.category, v.params);
  if (moderation === 'rejected') return c.json({ error: 'profanity' }, 400);

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
      glyph: CATEGORY_META[v.category].glyph,
      active: true,
      sortOrder: 999,
      sellerId: u.id,
      mediaType: mediaTypeFor(v.category),
      previewUrl: typeof v.media.previewUrl === 'string' ? v.media.previewUrl : null,
      videoUrl: typeof v.media.videoUrl === 'string' ? v.media.videoUrl : null,
      audioUrl: typeof v.media.audioUrl === 'string' ? v.media.audioUrl : null,
      beforeUrl: typeof v.media.beforeUrl === 'string' ? v.media.beforeUrl : null,
      afterUrl: typeof v.media.afterUrl === 'string' ? v.media.afterUrl : null,
      serverName: v.serverName || null,
      params: v.params,
      moderationStatus: moderation,
    })
    .returning();

  const [out] = await attachSellers([created]);
  return c.json(toDto(out), 201);
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
  const cat = check.category ?? (row.category as Category);

  const next: Record<string, unknown> = {};
  for (const key of ['title', 'subtitle', 'priceStars', 'configCode', 'active'] as const) {
    if (body[key] !== undefined) next[key] = key === 'title' || key === 'subtitle' || key === 'configCode' ? String(body[key]).trim() : body[key];
  }

  const media = body.media as Record<string, unknown> | undefined;
  let contentChanged = false;
  if (media) {
    for (const key of ['previewUrl', 'videoUrl', 'audioUrl', 'beforeUrl', 'afterUrl'] as const) {
      if (media[key] !== undefined) {
        next[key] = typeof media[key] === 'string' && media[key].trim() !== '' ? media[key].trim() : null;
        contentChanged = true;
      }
    }
  }
  if (body.serverName !== undefined) {
    next.serverName = typeof body.serverName === 'string' && body.serverName.trim() !== '' ? body.serverName.trim() : null;
    contentChanged = true;
  }
  if (body.params !== undefined) {
    next.params = body.params;
    contentChanged = true;
  }

  if (Object.keys(next).length === 0) return c.json({ error: 'nothing_to_update' }, 400);

  if (contentChanged && CATEGORY_META[cat].requiresModeration) {
    const params = (body.params as Record<string, unknown>) ?? {};
    const moderation = computeModeration(cat, params as never);
    if (moderation === 'rejected') return c.json({ error: 'profanity' }, 400);
    next.moderationStatus = moderation;
  }

  const [updated] = await db.update(products).set(next).where(eq(products.id, id)).returning();
  const [out] = await attachSellers([updated]);
  return c.json(toDto(out));
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
  if (!prod || !prod.active || prod.moderationStatus !== 'approved') return c.json({ error: 'not_found' }, 404);
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

export { CATEGORY_META, toDto as productToDto };

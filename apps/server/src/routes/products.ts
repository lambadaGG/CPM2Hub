import { Hono } from 'hono';
import type { Context } from 'hono';
import { and, avg, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db } from '../db/index';
import { products, purchases, productRatings, users, wishlist } from '../db/schema';
import { getUser, type AppEnv } from './auth';
import {
  CATEGORY_META,
  computeModeration,
  mediaTypeFor,
  validateListing,
  validatePatch,
} from '../lib/market';
import { createInvoiceLink, makeBuyPayload } from '../lib/payments';
import type { Category, MediaType, ModerationStatus, Product } from '@gm/shared';

export { validateListing, validatePatch } from '../lib/market';

export const productsRoute = new Hono<AppEnv>();

function makeSlug(userId: number): string {
  return `u${userId}-${randomBytes(4).toString('hex')}`;
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

function toDto(
  row: (typeof products.$inferSelect) & { seller?: { id: number; username: string | null; firstName: string } | null },
  opts: { includeConfig?: boolean; rating?: { avg: number; count: number }; wishlisted?: boolean } = {},
): Product {
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
    ...(opts.includeConfig ? { configCode: row.configCode } : {}),
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
    guideUrl: row.guideUrl ?? null,
    ...(opts.rating ? { rating: opts.rating } : {}),
    ...(opts.wishlisted != null ? { wishlisted: opts.wishlisted } : {}),
  };
}

async function attachCommunity(
  rows: Array<{ id: number }>,
  userId: number,
): Promise<Map<number, { avg: number; count: number; wishlisted: boolean }>> {
  if (rows.length === 0) return new Map();
  const ids = rows.map((r) => r.id);

  const ratings = await db
    .select({
      productId: productRatings.productId,
      avg: avg(productRatings.value),
      count: count(productRatings.id),
    })
    .from(productRatings)
    .where(inArray(productRatings.productId, ids))
    .groupBy(productRatings.productId);

  const wished = await db
    .select({ productId: wishlist.productId })
    .from(wishlist)
    .where(and(eq(wishlist.userId, userId), inArray(wishlist.productId, ids)));

  const wishedSet = new Set(wished.map((w) => w.productId));
  const map = new Map<number, { avg: number; count: number; wishlisted: boolean }>();
  for (const r of ratings) {
    map.set(r.productId, {
      avg: Math.round((Number(r.avg) || 0) * 10) / 10,
      count: Number(r.count) || 0,
      wishlisted: wishedSet.has(r.productId),
    });
  }
  for (const id of ids) {
    if (!map.has(id)) map.set(id, { avg: 0, count: 0, wishlisted: wishedSet.has(id) });
  }
  return map;
}

async function listProducts(c: Context<AppEnv>, category?: Category): Promise<Product[]> {
  const u = getUser(c);
  const base = and(eq(products.active, true), eq(products.moderationStatus, 'approved'));
  const rows = category
    ? await db.select().from(products).where(and(base, eq(products.category, category)))
    : await db.select().from(products).where(base);

  const admins = rows.filter((r) => r.sellerId == null).sort((a, b) => a.sortOrder - b.sortOrder);
  const users_ = rows.filter((r) => r.sellerId != null).sort((a, b) => b.id - a.id);
  const out = await attachSellers([...admins, ...users_]);
  const community = await attachCommunity(out, u.id);
  return out.map((r) => toDto(r, { rating: community.get(r.id), wishlisted: community.get(r.id)?.wishlisted }));
}

productsRoute.get('/products', async (c) => {
  const category = c.req.query('category');
  return c.json(await listProducts(c, category ? (category as Category) : undefined));
});

productsRoute.get('/products/mine', async (c) => {
  const u = getUser(c);
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.sellerId, u.id))
    .orderBy(desc(products.id));
  const out = await attachSellers(rows);
  return c.json(out.map((r) => toDto(r, { includeConfig: true })));
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
      guideUrl: typeof body.guideUrl === 'string' && body.guideUrl.trim() ? body.guideUrl.trim() : null,
    })
    .returning();

  const [out] = await attachSellers([created]);
  return c.json(toDto(out, { includeConfig: true }), 201);
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
  if (body.guideUrl !== undefined) {
    next.guideUrl = typeof body.guideUrl === 'string' && body.guideUrl.trim() ? body.guideUrl.trim() : null;
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
  return c.json(toDto(out, { includeConfig: true }));
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
  if (prod.sellerId === u.id) return c.json({ error: 'self_pay' }, 400);

  const price = prod.priceStars;

  try {
    const [buyer] = await db.select().from(users).where(eq(users.id, u.id));
    const tnOk = buyer != null && buyer.creditsTn >= price;
    const starsOk = buyer != null && buyer.creditsStars >= price;

    // Auto-selection: TN account first, then Stars balance, else Telegram invoice.
    if (tnOk || starsOk) {
      const useTn = tnOk;
      const result = await db.transaction(async (tx) => {
        if (useTn) {
          const [deducted] = await tx
            .update(users)
            .set({ creditsTn: sql`${users.creditsTn} - ${price}` })
            .where(and(eq(users.id, u.id), sql`${users.creditsTn} >= ${price}`))
            .returning({ id: users.id });
          if (!deducted) return { error: 'not_enough_tn' as const };
          if (prod.sellerId != null) {
            await tx
              .update(users)
              .set({ creditsTn: sql`${users.creditsTn} + ${price}` })
              .where(eq(users.id, prod.sellerId));
          }
        } else {
          const [deducted] = await tx
            .update(users)
            .set({ creditsStars: sql`${users.creditsStars} - ${price}` })
            .where(and(eq(users.id, u.id), sql`${users.creditsStars} >= ${price}`))
            .returning({ id: users.id });
          if (!deducted) return { error: 'not_enough_stars' as const };
          if (prod.sellerId != null) {
            await tx
              .update(users)
              .set({ creditsStars: sql`${users.creditsStars} + ${price}` })
              .where(eq(users.id, prod.sellerId));
          }
        }

        const [purchase] = await tx
          .insert(purchases)
          .values({
            userId: u.id,
            productId: prod.id,
            chargeId: null,
            payload: makeBuyPayload(prod.id, u.id),
            amountStars: price,
            status: 'paid',
            createdAt: Date.now(),
          })
          .returning();

        await tx.update(products).set({ downloads: sql`${products.downloads} + 1` }).where(eq(products.id, prod.id));

        return { ok: true as const, method: (useTn ? 'tn' : 'stars') as 'tn' | 'stars', purchaseId: purchase.id };
      });
      if ('error' in result) return c.json({ error: result.error }, 400);
      return c.json({ purchaseId: result.purchaseId, method: result.method, productTitle: prod.title, configCode: prod.configCode });
    }

    // Neither balance covers the price → Telegram Stars invoice.
    const payload = makeBuyPayload(prod.id, u.id);
    const link = await createInvoiceLink({
      title: prod.title,
      description: `${prod.subtitle}\nCategory: ${prod.category}\nVerified config`,
      payload,
      amountStars: price,
    });
    await db.insert(purchases)
      .values({ userId: u.id, productId: prod.id, payload, amountStars: price, status: 'pending', createdAt: Date.now() });

    return c.json({ purchaseId: 0, productTitle: prod.title, configCode: '', method: 'invoice', link });
  } catch (err) {
    console.error('[pay] transaction failed', err);
    return c.json({ error: 'pay_failed' }, 500);
  }
});

productsRoute.post('/products/:id/rate', async (c) => {
  const u = getUser(c);
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'bad_id' }, 400);

  const [prod] = await db.select().from(products).where(eq(products.id, id));
  if (!prod) return c.json({ error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const value = Number(body?.value);
  if (!Number.isInteger(value) || value < 1 || value > 5) return c.json({ error: 'bad_value' }, 400);

  await db
    .insert(productRatings)
    .values({ userId: u.id, productId: id, value, createdAt: Date.now() })
    .onConflictDoUpdate({ target: [productRatings.userId, productRatings.productId], set: { value } });

  const [agg] = await db
    .select({ avg: avg(productRatings.value), count: count(productRatings.id) })
    .from(productRatings)
    .where(eq(productRatings.productId, id));

  return c.json({
    rating: { avg: Math.round((Number(agg?.avg) || 0) * 10) / 10, count: Number(agg?.count) || 0 },
    value,
  });
});

productsRoute.post('/products/:id/wishlist', async (c) => {
  const u = getUser(c);
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'bad_id' }, 400);

  const [prod] = await db.select().from(products).where(eq(products.id, id));
  if (!prod) return c.json({ error: 'not_found' }, 404);

  const existing = await db
    .select({ id: wishlist.id })
    .from(wishlist)
    .where(and(eq(wishlist.userId, u.id), eq(wishlist.productId, id)));

  if (existing.length > 0) {
    await db.delete(wishlist).where(and(eq(wishlist.userId, u.id), eq(wishlist.productId, id)));
    return c.json({ wishlisted: false });
  }

  await db.insert(wishlist).values({ userId: u.id, productId: id, createdAt: Date.now() }).onConflictDoNothing();
  return c.json({ wishlisted: true });
});

export { CATEGORY_META, toDto as productToDto };

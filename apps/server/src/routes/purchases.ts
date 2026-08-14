import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { products, purchases, topups } from '../db/schema';
import { getUser } from './auth';
import { productToDto } from './products';
import { createInvoiceLink, makeBuyPayload, makeTopupPayload } from '../lib/payments';

export const purchasesRoute = new Hono();

purchasesRoute.get('/my/downloads', async (c) => {
  const u = getUser(c);
  const rows = await db
    .select({ p: purchases, product: products })
    .from(purchases)
    .innerJoin(products, eq(purchases.productId, products.id))
    .where(and(eq(purchases.userId, u.id), eq(purchases.status, 'paid')));

  return c.json(
    rows.map((r) => ({
      id: r.p.id,
      productId: r.p.productId,
      chargeId: r.p.chargeId,
      amountStars: r.p.amountStars,
      status: r.p.status,
      createdAt: r.p.createdAt,
      product: productToDto(r.product),
    })),
  );
});

purchasesRoute.post('/products/:id/buy', async (c) => {
  const u = getUser(c);
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: 'bad_id' }, 400);

  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product || !product.active || product.moderationStatus !== 'approved') return c.json({ error: 'not_found' }, 404);

  const payload = makeBuyPayload(product.id, u.id);
  const link = await createInvoiceLink({
    title: product.title,
    description: `${product.subtitle}\nCategory: ${product.category}\nVerified config`,
    payload,
    amountStars: product.priceStars,
  });

  await db.insert(purchases)
    .values({ userId: u.id, productId: product.id, payload, amountStars: product.priceStars, status: 'pending', createdAt: Date.now() });

  return c.json({ link });
});

purchasesRoute.post('/topup', async (c) => {
  const u = getUser(c);
  const body = await c.req.json().catch(() => null);
  const amount = Number((body as { amount?: unknown } | null)?.amount);
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000) {
    return c.json({ error: 'bad_amount' }, 400);
  }

  const payload = makeTopupPayload(u.id, amount);
  const link = await createInvoiceLink({
    title: 'CPM2 Hub · Stars Top Up',
    description: 'Add Stars to your balance',
    payload,
    amountStars: amount,
  });

  await db.insert(topups)
    .values({ userId: u.id, payload, amountStars: amount, status: 'pending', createdAt: Date.now() });

  return c.json({ link });
});

import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { products, purchases } from '../db/schema';
import { getUser } from './auth';
import { productToDto } from './products';
import { createInvoiceLink, makeBuyPayload } from '../lib/payments';

export const purchasesRoute = new Hono();

purchasesRoute.get('/my/downloads', async (c) => {
  const u = getUser(c);
  const rows = db
    .select({ p: purchases, product: products })
    .from(purchases)
    .innerJoin(products, eq(purchases.productId, products.id))
    .where(and(eq(purchases.userId, u.id), eq(purchases.status, 'paid')))
    .all();

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

  const product = db.select().from(products).where(eq(products.id, id)).get();
  if (!product || !product.active) return c.json({ error: 'not_found' }, 404);

  const payload = makeBuyPayload(product.id, u.id);
  const link = await createInvoiceLink({
    title: product.title,
    description: `${product.subtitle}\nCategory: ${product.category}\nVerified config`,
    payload,
    amountStars: product.priceStars,
  });

  db.insert(purchases)
    .values({ userId: u.id, productId: product.id, payload, amountStars: product.priceStars, status: 'pending', createdAt: Date.now() })
    .run();

  return c.json({ link });
});

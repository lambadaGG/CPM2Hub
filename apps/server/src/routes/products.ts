import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { products } from '../db/schema';
import type { Category } from '@gm/shared';

export const productsRoute = new Hono();

const CATEGORIES: Category[] = ['gearbox', 'vinyl', 'tune', 'nick'];

function toDto(row: typeof products.$inferSelect) {
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
  };
}

productsRoute.get('/products', async (c) => {
  const category = c.req.query('category');
  const rows = category
    ? db.select().from(products).where(and(eq(products.active, true), eq(products.category, category as Category))).all()
    : db.select().from(products).where(eq(products.active, true)).all();

  rows.sort((a, b) => a.sortOrder - b.sortOrder);
  return c.json(rows.map(toDto));
});

export { toDto as productToDto, CATEGORIES };

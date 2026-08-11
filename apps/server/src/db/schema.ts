import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    telegramId: integer('telegram_id').notNull(),
    username: text('username'),
    firstName: text('first_name').notNull(),
    language: text('language'),
    creditsStars: integer('credits_stars').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('users_telegram_id_idx').on(t.telegramId)],
);

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  category: text('category', { enum: ['gearbox', 'vinyl', 'tune', 'nick'] }).notNull(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  priceStars: integer('price_stars').notNull(),
  downloads: integer('downloads').notNull().default(0),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(true),
  glyph: text('glyph').notNull(),
  configCode: text('config_code').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const purchases = sqliteTable(
  'purchases',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    chargeId: text('charge_id'),
    payload: text('payload').notNull(),
    amountStars: integer('amount_stars').notNull().default(0),
    status: text('status', { enum: ['pending', 'paid'] }).notNull().default('pending'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('purchases_user_idx').on(t.userId),
    uniqueIndex('purchases_charge_idx').on(t.chargeId),
    uniqueIndex('purchases_payload_idx').on(t.payload),
  ],
);

export const trades = sqliteTable('trades', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creatorId: integer('creator_id')
    .notNull()
    .references(() => users.id),
  kind: text('kind', { enum: ['money', 'car', 'vinyl'] }).notNull(),
  offer: text('offer').notNull(),
  receive: text('receive').notNull(),
  peer: text('peer').notNull(),
  status: text('status', { enum: ['waiting', 'escrow', 'completed'] }).notNull().default('waiting'),
  createdAt: integer('created_at').notNull(),
});

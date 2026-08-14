import { pgTable, text, integer, boolean, bigint, serial, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    telegramId: bigint('telegram_id', { mode: 'number' }).notNull(),
    username: text('username'),
    firstName: text('first_name').notNull(),
    language: text('language'),
    creditsStars: integer('credits_stars').notNull().default(0),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [uniqueIndex('users_telegram_id_idx').on(t.telegramId)],
);

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  category: text('category', {
    enum: [
      'gearbox', 'vinyl', 'tune', 'nick', 'bodykit', 'wheels', 'engine',
      'suspension', 'plates', 'exhaust', 'neon', 'garage', 'account',
    ],
  }).notNull(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  priceStars: integer('price_stars').notNull(),
  downloads: integer('downloads').notNull().default(0),
  verified: boolean('verified').notNull().default(true),
  glyph: text('glyph').notNull(),
  configCode: text('config_code').notNull(),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  sellerId: integer('seller_id').references(() => users.id),
  mediaType: text('media_type'),
  previewUrl: text('preview_url'),
  videoUrl: text('video_url'),
  audioUrl: text('audio_url'),
  beforeUrl: text('before_url'),
  afterUrl: text('after_url'),
  serverName: text('server_name'),
  params: jsonb('params').$type<Record<string, unknown>>(),
  moderationStatus: text('moderation_status', { enum: ['pending', 'approved', 'rejected'] })
    .notNull()
    .default('approved'),
});

export const purchases = pgTable(
  'purchases',
  {
    id: serial('id').primaryKey(),
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
    refunded: boolean('refunded').notNull().default(false),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    index('purchases_user_idx').on(t.userId),
    uniqueIndex('purchases_charge_idx').on(t.chargeId),
    uniqueIndex('purchases_payload_idx').on(t.payload),
  ],
);

export const trades = pgTable('trades', {
  id: serial('id').primaryKey(),
  creatorId: integer('creator_id')
    .notNull()
    .references(() => users.id),
  peerUserId: integer('peer_user_id').references(() => users.id),
  kind: text('kind', { enum: ['money', 'car', 'vinyl'] }).notNull(),
  offer: text('offer').notNull(),
  receive: text('receive').notNull(),
  peer: text('peer').notNull(),
  status: text('status', { enum: ['waiting', 'escrow', 'completed', 'cancelled', 'disputed'] })
    .notNull()
    .default('waiting'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull().default(0),
});

export const topups = pgTable(
  'topups',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    chargeId: text('charge_id'),
    payload: text('payload').notNull(),
    amountStars: integer('amount_stars').notNull().default(0),
    status: text('status', { enum: ['pending', 'paid'] }).notNull().default('pending'),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    index('topups_user_idx').on(t.userId),
    uniqueIndex('topups_charge_idx').on(t.chargeId),
    uniqueIndex('topups_payload_idx').on(t.payload),
  ],
);

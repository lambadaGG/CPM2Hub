import { pgTable, text, integer, boolean, bigint, serial, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    telegramId: bigint('telegram_id', { mode: 'number' }).notNull(),
    username: text('username'),
    firstName: text('first_name').notNull(),
    language: text('language'),
    creditsStars: integer('credits_stars').notNull().default(0),
    creditsTn: integer('credits_tn').notNull().default(0),
    referralCode: text('referral_code'),
    referredBy: integer('referred_by').references((): AnyPgColumn => users.id),
    streak: integer('streak').notNull().default(0),
    lastClaimAt: bigint('last_claim_at', { mode: 'number' }),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    uniqueIndex('users_telegram_id_idx').on(t.telegramId),
    uniqueIndex('users_referral_code_idx').on(t.referralCode),
  ],
);

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  category: text('category', {
    enum: [
      'gearbox', 'vinyl', 'tune', 'nick', 'bodykit', 'wheels', 'engine',
      'suspension', 'plates', 'exhaust', 'neon', 'garage', 'account',
      'service', 'smoke', 'character', 'bundle',
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
  guideUrl: text('guide_url'),
}, (t) => [
  index('products_seller_idx').on(t.sellerId),
]);

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
}, (t) => [
  index('trades_creator_idx').on(t.creatorId),
  index('trades_peer_user_idx').on(t.peerUserId),
]);

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

export const productRatings = pgTable(
  'product_ratings',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    value: integer('value').notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    uniqueIndex('ratings_user_product_idx').on(t.userId, t.productId),
    index('ratings_user_idx').on(t.userId),
    index('ratings_product_idx').on(t.productId),
  ],
);

export const wishlist = pgTable(
  'wishlist',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    uniqueIndex('wishlist_user_product_idx').on(t.userId, t.productId),
  ],
);

export const dailyClaims = pgTable(
  'daily_claims',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    claimDate: text('claim_date').notNull(),
    streak: integer('streak').notNull().default(1),
    rewardStars: integer('reward_stars').notNull().default(0),
    bonusStars: integer('bonus_stars').notNull().default(0),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    uniqueIndex('daily_claims_user_date_idx').on(t.userId, t.claimDate),
  ],
);

export const referralRewards = pgTable(
  'referral_rewards',
  {
    id: serial('id').primaryKey(),
    referrerId: integer('referrer_id')
      .notNull()
      .references(() => users.id),
    buyerId: integer('buyer_id')
      .notNull()
      .references(() => users.id),
    purchaseId: integer('purchase_id')
      .notNull()
      .references(() => purchases.id),
    amountStars: integer('amount_stars').notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    index('referral_rewards_referrer_idx').on(t.referrerId),
    index('referral_rewards_buyer_idx').on(t.buyerId),
    uniqueIndex('referral_rewards_purchase_idx').on(t.purchaseId),
  ],
);

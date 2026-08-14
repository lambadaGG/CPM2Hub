import { and, eq, sql } from 'drizzle-orm';
import type { StarAmount, StarTransaction } from 'grammy/types';
import { db } from '../db/index';
import { products, purchases, topups, users } from '../db/schema';
import { parseBuyPayload, parseTopupPayload } from './payments';

export interface StarTransactionsResult {
  transactions: StarTransaction[];
  balance: number;
}

export async function fetchStarTransactions(opts: { offset?: number; limit?: number } = {}): Promise<StarTransactionsResult> {
  const { getBot } = await import('../bot');
  const bot = getBot();
  const params: Record<string, number> = {};
  if (opts.offset != null) params.offset = opts.offset;
  if (opts.limit != null) params.limit = opts.limit;
  const res = await bot.api.raw.getStarTransactions(params);
  let balance = 0;
  try {
    const bal: StarAmount = await bot.api.raw.getMyStarBalance();
    balance = bal.amount ?? 0;
  } catch {
    /* balance is best-effort */
  }
  return { transactions: res.transactions ?? [], balance };
}

/** Refund a Telegram Stars charge via the official Bot API (Bot API 7.0+). */
export async function refundStarPayment(telegramId: number, chargeId: string): Promise<void> {
  const { getBot } = await import('../bot');
  const bot = getBot();
  const ok = await bot.api.raw.refundStarPayment({
    user_id: telegramId,
    telegram_payment_charge_id: chargeId,
  });
  if (!ok) throw new Error('refund declined');
}

async function sendMessage(telegramId: number, text: string): Promise<void> {
  try {
    const { getBot } = await import('../bot');
    await getBot().api.sendMessage(telegramId, text, { parse_mode: 'Markdown' });
  } catch {
    /* user may have blocked the bot — ignore */
  }
}

/** Escape user-controlled text for legacy Telegram Markdown. */
function esc(s: string): string {
  return s.replace(/([_*[\]`\\])/g, '\\$1');
}

/** Atomically mark a pending topup as paid and credit the balance. Idempotent. */
export async function applyTopup(topupId: number, chargeId: string | null): Promise<boolean> {
  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(topups)
      .set({ status: 'paid', chargeId })
      .where(and(eq(topups.id, topupId), eq(topups.status, 'pending')))
      .returning();
    if (!updated) return null;
    await tx
      .update(users)
      .set({ creditsStars: sql`${users.creditsStars} + ${updated.amountStars}` })
      .where(eq(users.id, updated.userId));
    return { userId: updated.userId, amountStars: updated.amountStars };
  });
  if (!result) return false;
  await notifyTopup(result.userId, result.amountStars);
  return true;
}

/** Atomically mark a pending purchase as paid, bump downloads and credit the seller. Idempotent. */
export async function applyPurchase(purchaseId: number, chargeId: string | null, amountStars: number): Promise<boolean> {
  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(purchases)
      .set({ status: 'paid', chargeId, amountStars })
      .where(and(eq(purchases.id, purchaseId), eq(purchases.status, 'pending')))
      .returning();
    if (!updated) return null;

    const [product] = await tx.select().from(products).where(eq(products.id, updated.productId));
    if (!product) return { userId: updated.userId, title: 'Item', configCode: '', sellerId: null };

    await tx.update(products).set({ downloads: sql`${products.downloads} + 1` }).where(eq(products.id, product.id));
    if (product.sellerId != null) {
      await tx
        .update(users)
        .set({ creditsStars: sql`${users.creditsStars} + ${amountStars}` })
        .where(eq(users.id, product.sellerId));
    }
    return { userId: updated.userId, title: product.title, configCode: product.configCode, sellerId: product.sellerId };
  });
  if (!result) return false;
  if (result.sellerId != null) await notifySeller(result.sellerId, result.title, amountStars);
  await notifyBuyer(result.userId, result.title, result.configCode);
  return true;
}

async function notifyTopup(userId: number, amountStars: number): Promise<void> {
  const [user] = await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, userId));
  if (user) await sendMessage(user.telegramId, `⭐ +${amountStars} Stars added to your balance.`);
}

async function notifyBuyer(userId: number, title: string, configCode: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return;
  const greet = user.username ? `@${user.username}` : user.firstName;
  await sendMessage(
    user.telegramId,
    [
      `✅ Config purchased: **${esc(title)}**`,
      ``,
      `Hey ${esc(greet)}, your config code:`,
      '```txt',
      configCode,
      '```',
      `Saved in Profile → My Downloads.`,
    ].join('\n'),
  );
}

async function notifySeller(userId: number, title: string, amountStars: number): Promise<void> {
  const [seller] = await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, userId));
  if (!seller) return;
  await sendMessage(
    seller.telegramId,
    `🎉 Your config **${esc(title)}** was sold for **${amountStars} ⭐**!\n\nBalance credited: +${amountStars} ⭐`,
  );
}

/**
 * Reconcile against the official Telegram Bot API: pulls the bot's Star
 * transactions and finalizes any pending topup/purchase whose payload shows up
 * as a successful charge. Catches payments whose successful_payment update was
 * missed (dropped webhook, downtime). Idempotent — safe to run repeatedly.
 */
export async function reconcileStars(): Promise<number> {
  const { transactions } = await fetchStarTransactions({ limit: 100 });
  let applied = 0;

  for (const tx of transactions) {
    // Only incoming invoice payments carry a bot payload; outgoing transactions
    // (refunds, withdrawals) are ignored.
    if (!tx.source || tx.source.type !== 'user' || tx.source.transaction_type !== 'invoice_payment') continue;
    const payload = tx.source.invoice_payload;
    if (!payload) continue;

    const topup = parseTopupPayload(payload);
    if (topup) {
      const [rec] = await db.select().from(topups).where(eq(topups.payload, payload));
      if (rec && rec.status === 'pending') {
        if (await applyTopup(rec.id, tx.id)) applied++;
      }
      continue;
    }

    const buy = parseBuyPayload(payload);
    if (buy) {
      const [rec] = await db.select().from(purchases).where(eq(purchases.payload, payload));
      if (rec && rec.status === 'pending') {
        if (await applyPurchase(rec.id, tx.id, Math.abs(tx.amount))) applied++;
      }
    }
  }

  return applied;
}

/**
 * Refund a paid purchase. For charge-based payments refunds the Telegram Stars
 * via the official Bot API and reverses the internal ledger (seller credit,
 * downloads). For balance-based payments reverses the transfer by crediting the
 * buyer back. Idempotent and spam-safe: the purchase is claimed atomically, so
 * concurrent/rapid retries resolve to a single refund.
 */
export async function refundPurchase(purchaseId: number): Promise<{ ok: boolean; error?: string }> {
  const [purchase] = await db.select().from(purchases).where(eq(purchases.id, purchaseId));
  if (!purchase || purchase.status !== 'paid' || purchase.refunded) return { ok: false, error: 'not_refundable' };

  const [product] = await db.select().from(products).where(eq(products.id, purchase.productId));

  // Atomic claim: exactly one caller wins the guard, so a spammed "refund"
  // button can never refund twice. Losers immediately bail out.
  const [claim] = await db
    .update(purchases)
    .set({ refunded: true })
    .where(and(eq(purchases.id, purchaseId), eq(purchases.status, 'paid'), eq(purchases.refunded, false)))
    .returning({ id: purchases.id });
  if (!claim) return { ok: false, error: 'not_refundable' };

  // Revert the internal ledger first (still under the claim).
  await db.transaction(async (tx) => {
    if (product?.sellerId != null) {
      await tx
        .update(users)
        .set({ creditsStars: sql`${users.creditsStars} - ${purchase.amountStars}` })
        .where(eq(users.id, product.sellerId));
    }
    if (!purchase.chargeId) {
      await tx
        .update(users)
        .set({ creditsStars: sql`${users.creditsStars} + ${purchase.amountStars}` })
        .where(eq(users.id, purchase.userId));
    }
    if (product) {
      await tx.update(products).set({ downloads: Math.max(0, product.downloads - 1) }).where(eq(products.id, product.id));
    }
  });

  // External Telegram refund last, so the network call happens at most once per claim.
  try {
    if (purchase.chargeId) {
      const [buyer] = await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, purchase.userId));
      if (!buyer) throw new Error('no_buyer');
      await refundStarPayment(buyer.telegramId, purchase.chargeId);
    }
  } catch (err) {
    // Compensate the ledger and release the claim so the admin can retry cleanly.
    await db.transaction(async (tx) => {
      if (product?.sellerId != null) {
        await tx
          .update(users)
          .set({ creditsStars: sql`${users.creditsStars} + ${purchase.amountStars}` })
          .where(eq(users.id, product.sellerId));
      }
      if (!purchase.chargeId) {
        await tx
          .update(users)
          .set({ creditsStars: sql`${users.creditsStars} - ${purchase.amountStars}` })
          .where(eq(users.id, purchase.userId));
      }
      if (product) {
        await tx.update(products).set({ downloads: sql`${products.downloads} + 1` }).where(eq(products.id, product.id));
      }
      await tx.update(purchases).set({ refunded: false }).where(eq(purchases.id, purchaseId));
    });
    return { ok: false, error: `refund_failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  const [buyer] = await db.select().from(users).where(eq(users.id, purchase.userId));
  if (buyer) {
    await sendMessage(buyer.telegramId, `↩️ Purchase **${esc(product?.title ?? 'item')}** was refunded. The Stars have been returned.`);
  }

  return { ok: true };
}

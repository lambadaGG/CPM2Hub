import 'dotenv/config';
import { Bot } from 'grammy';
import { eq } from 'drizzle-orm';
import { db } from './db/index';
import { products, purchases, topups, users } from './db/schema';
import { parseBuyPayload, parseTopupPayload } from './lib/payments';
import { applyPurchase, applyTopup } from './lib/stars';
import { actTrade, buildTradeMessage, type TradeAction } from './lib/escrow';

let bot: Bot | null = null;

// Secret token for webhook verification — задать в env WEBHOOK_SECRET
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';

const SUPPORT_LINK = 'https://t.me/CPM2Hub_Support';
const ANNOUNCEMENTS_LINK = 'https://t.me/CPM2Hub_Announcements';
const COMMUNITY_LINK = 'https://t.me/CPM2Hub_Community';

export function getBot(): Bot {
  if (bot) return bot;
  const token = process.env.BOT_TOKEN ?? '';
  if (!token) throw new Error('BOT_TOKEN is not set');
  bot = new Bot(token);
  registerHandlers(bot);
  return bot;
}

export async function setupWebhook(bot: Bot): Promise<void> {
  const url = process.env.PUBLIC_URL ?? '';
  // Добавляем https:// если не задано
  const webhookUrl = url.startsWith('https://') ? url : `https://${url}`;
  await bot.api.setWebhook(`${webhookUrl}/webhook`, {
    secret_token: WEBHOOK_SECRET,
  });
}

export async function setBotCommands(bot: Bot): Promise<void> {
  await bot.api.setMyCommands([
    { command: 'start', description: 'Open GearMarket' },
    { command: 'terms', description: 'Terms & Conditions' },
    { command: 'support', description: 'Get help' },
    { command: 'paysupport', description: 'Payment & refund support' },
  ]);
}

function registerHandlers(b: Bot) {
  b.command('start', async (ctx) => {
    const webAppUrl = process.env.WEBAPP_URL;
    await ctx.reply(
      `🏁 GearMarket\n\nDark marketplace for tuning configs: gearboxes, vinyl presets, nicknames.\n\nPayments in Telegram Stars.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Open GearMarket', web_app: { url: webAppUrl ?? '' } }],
            [{ text: '📢 Announcements', url: ANNOUNCEMENTS_LINK }],
            [{ text: '💬 Community Chat', url: COMMUNITY_LINK }],
            [{ text: '🆘 Support', url: SUPPORT_LINK }],
          ],
        },
      },
    );
  });

  b.command('terms', async (ctx) => {
    await ctx.reply(
      `📜 *Terms & Conditions*\n\nBy using GearMarket you agree that:\n• All listings must be original configurations.\n• Digital goods are delivered instantly after payment.\n• Fraud or scam attempts lead to a ban.\n\nRefunds are handled per order via support.`,
      { parse_mode: 'Markdown' },
    );
  });

  b.command('support', async (ctx) => {
    await ctx.reply(
      `🆘 *Support*\n\nQuestions about orders, payments or listings?\n\nWrite to us: ${SUPPORT_LINK}\nCommunity: ${COMMUNITY_LINK}`,
      { parse_mode: 'Markdown' },
    );
  });

  b.command('paysupport', async (ctx) => {
    await ctx.reply(
      `💳 *Payment Support*\n\nPaid but didn't receive the config, or need a refund?\n\n1. Write to ${SUPPORT_LINK}\n2. Attach the receipt from Profile → History.\n\nWe verify the payment via Telegram's API and refund within 3 days.`,
      { parse_mode: 'Markdown' },
    );
  });

  b.on('pre_checkout_query', async (ctx) => {
    const payload = ctx.preCheckoutQuery.invoice_payload;

    const topup = parseTopupPayload(payload);
    if (topup) {
      if (ctx.preCheckoutQuery.total_amount !== topup.amountStars) {
        await ctx.answerPreCheckoutQuery(false, 'Amount mismatch');
        return;
      }
      const [pending] = await db
        .select()
        .from(topups)
        .where(eq(topups.payload, payload));
      if (!pending || pending.status !== 'pending') {
        await ctx.answerPreCheckoutQuery(false, 'Order not found');
        return;
      }
      await ctx.answerPreCheckoutQuery(true);
      return;
    }

    const parsed = parseBuyPayload(payload);
    if (!parsed) {
      await ctx.answerPreCheckoutQuery(false, 'Invalid order');
      return;
    }
    const [pending] = await db
      .select()
      .from(purchases)
      .where(eq(purchases.payload, ctx.preCheckoutQuery.invoice_payload));
    if (!pending || pending.status !== 'pending') {
      await ctx.answerPreCheckoutQuery(false, 'Order not found');
      return;
    }
    await ctx.answerPreCheckoutQuery(true);
  });

  b.on('message:successful_payment', async (ctx) => {
    const payment = ctx.message.successful_payment;
    const payload = payment.invoice_payload;
    const payer = ctx.from;

    const tid = async (userId: number) => {
      const [u] = await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, userId));
      return u?.telegramId ?? null;
    };

    const topup = parseTopupPayload(payload);
    if (topup) {
      const [existing] = await db
        .select()
        .from(topups)
        .where(eq(topups.payload, payload));
      if (!existing || existing.status === 'paid') return;
      if (payer?.id !== (await tid(existing.userId))) return;
      if (payment.total_amount !== existing.amountStars) return;

      await applyTopup(existing.id, payment.telegram_payment_charge_id);
      return;
    }

    const parsed = parseBuyPayload(payload);
    if (!parsed) return;

    const [existing] = await db
      .select()
      .from(purchases)
      .where(eq(purchases.payload, payload));
    if (!existing || existing.status === 'paid') return;

    if (payer?.id !== (await tid(existing.userId))) return;

    const [product] = await db.select().from(products).where(eq(products.id, existing.productId));
    if (!product || payment.total_amount !== product.priceStars) return;

    await applyPurchase(existing.id, payment.telegram_payment_charge_id, payment.total_amount);
  });

  b.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const m = /^escrow:(accept|decline|cancel|complete|dispute):(\d+)$/.exec(data);
    if (!m) return;

    const action = m[1] as TradeAction;
    const id = Number(m[2]);
    const tgId = ctx.from?.id;
    if (!tgId) {
      await ctx.answerCallbackQuery({ text: 'Unknown user' });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.telegramId, tgId));
    if (!user) {
      await ctx.answerCallbackQuery({ text: 'User not found' });
      return;
    }

    const result = await actTrade(id, action, user.id);
    if (!result.ok) {
      await ctx.answerCallbackQuery({ text: `Not allowed: ${result.error}` });
      return;
    }

    await ctx.answerCallbackQuery({ text: `Trade #${id}: ${result.trade.status}` });
    try {
      await ctx.editMessageText(buildTradeMessage(result.trade));
    } catch {
      /* message may have been deleted or already edited */
    }
  });
}

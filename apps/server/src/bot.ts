import 'dotenv/config';
import { Bot } from 'grammy';
import { eq } from 'drizzle-orm';
import { db } from './db/index';
import { products, purchases, topups, users } from './db/schema';
import { parseBuyPayload, parseTopupPayload } from './lib/payments';
import { actTrade, buildTradeMessage, type TradeAction } from './lib/escrow';

let bot: Bot | null = null;

// Secret token for webhook verification — задать в env WEBHOOK_SECRET
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';

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

function registerHandlers(b: Bot) {
  b.command('start', async (ctx) => {
    const webAppUrl = process.env.WEBAPP_URL;
    await ctx.reply(
      `🏁 GearMarket\n\nDark marketplace for tuning configs: gearboxes, vinyl presets, nicknames.\n\nPayments in Telegram Stars.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Open GearMarket', web_app: { url: webAppUrl ?? '' } }],
            [{ text: '📢 Announcements', url: 'https://t.me/CPM2Hub_Announcements' }],
            [{ text: '💬 Community Chat', url: 'https://t.me/CPM2Hub_Community' }],
            [{ text: '🆘 Support', url: 'https://t.me/CPM2Hub_Support' }],
          ],
        },
      },
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

    const topup = parseTopupPayload(payload);
    if (topup) {
      const [existing] = await db
        .select()
        .from(topups)
        .where(eq(topups.payload, payload));
      if (!existing || existing.status === 'paid') return;

      const payer = ctx.from;
      if (payer?.id !== existing.userId) return;
      if (payment.total_amount !== existing.amountStars) return;

      await db.update(topups)
        .set({ status: 'paid', chargeId: payment.telegram_payment_charge_id })
        .where(eq(topups.id, existing.id));

      const [user] = await db.select().from(users).where(eq(users.id, existing.userId));
      const current = user?.creditsStars ?? 0;
      await db.update(users)
        .set({ creditsStars: current + existing.amountStars })
        .where(eq(users.id, existing.userId));

      await ctx.reply(`⭐ +${existing.amountStars} Stars added to your balance.`);
      return;
    }

    const parsed = parseBuyPayload(payload);
    if (!parsed) return;

    const [existing] = await db
      .select()
      .from(purchases)
      .where(eq(purchases.payload, payload));
    if (!existing || existing.status === 'paid') return;

    // Verify payer identity: Telegram user who paid must match the purchase creator
    const payer = ctx.from;
    if (payer?.id !== existing.userId) return;

    // Verify amount matches product price
    const [product] = await db.select().from(products).where(eq(products.id, existing.productId));
    if (!product || payment.total_amount !== product.priceStars) return;

    await db.update(purchases)
      .set({ status: 'paid', chargeId: payment.telegram_payment_charge_id, amountStars: payment.total_amount })
      .where(eq(purchases.id, existing.id));

    if (product) {
      await db.update(products).set({ downloads: product.downloads + 1 }).where(eq(products.id, product.id));
    }

    if (product.sellerId != null) {
      const [seller] = await db.select().from(users).where(eq(users.id, product.sellerId));
      if (seller) {
        await db.update(users)
          .set({ creditsStars: seller.creditsStars + payment.total_amount })
          .where(eq(users.id, seller.id));
        await ctx.api.sendMessage(
          seller.telegramId,
          `🎉 Your config **${product.title}** was sold for **${payment.total_amount} ⭐**!\n\nBalance credited: +${payment.total_amount} ⭐`,
          { parse_mode: 'Markdown' },
        );
      }
    }

    const [user] = await db.select().from(users).where(eq(users.id, existing.userId));
    const greet = user ? `@${user.username ?? user.firstName}` : 'there';

    await ctx.reply(
      [
        `✅ Config purchased: **${product?.title ?? 'item'}**`,
        ``,
        `Hey ${greet}, your config code:`,
        `\`\`\`txt`,
        product?.configCode ?? 'N/A',
        `\`\`\``,
        `Saved in Profile → My Downloads.`,
      ].join('\n'),
    );
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

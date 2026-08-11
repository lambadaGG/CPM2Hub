import 'dotenv/config';
import { Bot } from 'grammy';
import { eq } from 'drizzle-orm';
import { db } from './db/index';
import { products, purchases, users } from './db/schema';
import { parseBuyPayload } from './lib/payments';

let bot: Bot | null = null;

export function getBot(): Bot {
  if (bot) return bot;
  const token = process.env.BOT_TOKEN ?? '';
  if (!token) throw new Error('BOT_TOKEN is not set');
  bot = new Bot(token);
  registerHandlers(bot);
  return bot;
}

export async function setupWebhook(bot: Bot): Promise<void> {
  const url = process.env.PUBLIC_URL;
  if (!url) throw new Error('PUBLIC_URL is not set (webhook mode)');
  await bot.api.setWebhook(`${url}/webhook`);
}

function registerHandlers(b: Bot) {
  b.command('start', async (ctx) => {
    const webAppUrl = process.env.WEBAPP_URL;
    await ctx.reply(
      `🏁 GearMarket\n\nDark marketplace for tuning configs: gearboxes, vinyl presets, nicknames.\n\nPayments in Telegram Stars.`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: 'Open GearMarket', web_app: { url: webAppUrl ?? '' } }]],
        },
      },
    );
  });

  b.on('pre_checkout_query', async (ctx) => {
    const parsed = parseBuyPayload(ctx.preCheckoutQuery.invoice_payload);
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
    const parsed = parseBuyPayload(payment.invoice_payload);
    if (!parsed) return;

    const [existing] = await db
      .select()
      .from(purchases)
      .where(eq(purchases.payload, payment.invoice_payload));
    if (!existing || existing.status === 'paid') return;

    await db.update(purchases)
      .set({ status: 'paid', chargeId: payment.telegram_payment_charge_id, amountStars: payment.total_amount })
      .where(eq(purchases.id, existing.id));

    const [product] = await db.select().from(products).where(eq(products.id, existing.productId));
    if (product) {
      await db.update(products).set({ downloads: product.downloads + 1 }).where(eq(products.id, product.id));
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
}

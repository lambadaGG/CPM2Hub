import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { webhookCallback } from 'grammy';
import { auth } from './routes/auth';
import { meRoute } from './routes/me';
import { productsRoute } from './routes/products';
import { purchasesRoute } from './routes/purchases';
import { tradesRoute } from './routes/trades';
import { adminRoute } from './routes/admin';
import { getBot, setupWebhook, setBotCommands, WEBHOOK_SECRET } from './bot';
import { reconcileStars } from './lib/stars';

const app = new Hono();

app.use(
  '/api/*',
  cors({
    origin: ['https://web.telegram.org', process.env.WEBAPP_URL ?? ''],
    allowHeaders: ['Content-Type', 'X-Init-Data'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  }),
);

app.use('/api/*', auth);

app.route('/api', meRoute);
app.route('/api', productsRoute);
app.route('/api', purchasesRoute);
app.route('/api', tradesRoute);
app.route('/api', adminRoute);

app.get('/health', (c) => c.json({ ok: true }));

async function main() {
  const token = process.env.BOT_TOKEN;
  const bot = token ? getBot() : null;

  if (bot) {
    await bot.init();
    const webhookUrl = process.env.PUBLIC_URL;

    if (webhookUrl) {
      await setupWebhook(bot);
      // Recommended grammY webhook integration for Hono: handles the 10s timeout
      // (prevents Telegram retries from re-processing updates) and verifies the
      // X-Telegram-Bot-Api-Secret-Token header when a secret is configured.
      app.post(
        '/webhook',
        webhookCallback(bot, 'hono', { secretToken: WEBHOOK_SECRET || undefined }),
      );
      console.log('[bot] webhook mode →', webhookUrl);
    } else {
      bot.start({ drop_pending_updates: true });
      console.log('[bot] polling mode');
    }
    await setBotCommands(bot).catch((err) => console.error('[bot] setMyCommands failed', err));
  } else {
    console.log('[bot] BOT_TOKEN not set — API-only mode');
  }

  const port = Number(process.env.PORT ?? 8080);
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`[api] listening on http://localhost:${info.port}`);
  });

  if (bot) {
    setInterval(() => {
      reconcileStars()
        .then((n) => {
          if (n > 0) console.log(`[stars] reconciled ${n} payment(s)`);
        })
        .catch((err) => console.error('[stars] reconcile failed', err));
    }, 60_000);
    console.log('[stars] reconcile loop started (60s)');
  }
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});

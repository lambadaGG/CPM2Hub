import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from './routes/auth';
import { meRoute } from './routes/me';
import { productsRoute } from './routes/products';
import { purchasesRoute } from './routes/purchases';
import { tradesRoute } from './routes/trades';
import { getBot, setupWebhook } from './bot';

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

app.get('/health', (c) => c.json({ ok: true }));

async function main() {
  const token = process.env.BOT_TOKEN;
  const bot = token ? getBot() : null;

  if (bot) {
    await bot.init();
    const webhookUrl = process.env.PUBLIC_URL;

    if (webhookUrl) {
      await setupWebhook(bot);
      app.post('/webhook', async (c) => {
        const update = await c.req.json();
        try {
          await bot.handleUpdate(update);
        } catch (err) {
          console.error('[webhook] update failed', err);
        }
        return c.json({ ok: true });
      });
      console.log('[bot] webhook mode →', webhookUrl);
    } else {
      bot.start({ drop_pending_updates: true });
      console.log('[bot] polling mode');
    }
  } else {
    console.log('[bot] BOT_TOKEN not set — API-only mode');
  }

  const port = Number(process.env.PORT ?? 8080);
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`[api] listening on http://localhost:${info.port}`);
  });
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});

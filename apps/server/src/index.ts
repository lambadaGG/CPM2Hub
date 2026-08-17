import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono-rate-limiter';
import { webhookCallback } from 'grammy';
import { auth, type AppEnv } from './routes/auth';
import { meRoute } from './routes/me';
import { productsRoute } from './routes/products';
import { purchasesRoute } from './routes/purchases';
import { tradesRoute } from './routes/trades';
import { adminRoute } from './routes/admin';
import { avatarRoute } from './routes/avatar';
import { getBot, setupWebhook, setBotCommands, WEBHOOK_SECRET } from './bot';
import { reconcileStars } from './lib/stars';
import { closeDb } from './db/index';

const app = new Hono<AppEnv>();

app.use('*', secureHeaders({ crossOriginResourcePolicy: false }));

app.use(
  '/api/*',
  cors({
    origin: ['https://web.telegram.org', process.env.WEBAPP_URL ?? ''].filter(Boolean),
    allowHeaders: ['Content-Type', 'X-Init-Data'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

app.use('/api/*', bodyLimit({ maxSize: 2 * 1024 * 1024, onError: (c) => c.json({ error: 'too_large' }, 413) }));

app.use(
  '/api/*',
  rateLimiter({
    windowMs: 60_000,
    limit: 60,
    keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown',
  }),
);

app.use('/api/*', auth);

// grammY webhookCallback rethrows middleware errors (bot.catch only runs in
// polling mode). Log them here — Telegram will retry the update, and our
// payment handlers are idempotent, so a retry is safe.
app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  const url = c.req.path;
  if (process.env.NODE_ENV === 'production') {
    console.error(`[api] unhandled error on ${url}:`, err instanceof Error ? err.message : err);
  } else {
    console.error(`[api] unhandled error on ${url}:`, err instanceof Error ? err.stack ?? err : err);
  }
  return c.json({ error: 'internal_error' }, 500);
});

app.notFound((c) => c.json({ error: 'not_found' }, 404));

app.route('/api', meRoute);
app.route('/api', productsRoute);
app.route('/api', purchasesRoute);
app.route('/api', tradesRoute);
app.route('/api', adminRoute);

app.route('/', avatarRoute);

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
  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`[api] listening on http://localhost:${info.port}`);
  });

  async function shutdown(signal: string) {
    console.log(`[api] ${signal} received — shutting down`);
    try {
      server.close();
    } catch { /* ignore */ }
    try {
      await closeDb();
    } catch (err) {
      console.error('[api] failed to close db', err);
    }
    process.exit(0);
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

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

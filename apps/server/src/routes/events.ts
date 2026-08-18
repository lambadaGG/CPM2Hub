import { Hono } from 'hono';
import { db } from '../db/index';
import { events } from '../db/schema';
import { getUser, type AppEnv } from './auth';

export const eventsRoute = new Hono<AppEnv>();

const VALID_TYPES = new Set([
  'app_open', 'build_view', 'build_like', 'build_unlike',
  'build_rate', 'build_publish', 'share_click',
]);

eventsRoute.post('/events', async (c) => {
  const u = getUser(c);
  const body = await c.req.json<{
    type?: string;
    buildId?: number;
    source?: string;
    deepLink?: string;
    campaign?: string;
  }>();

  if (!body.type || !VALID_TYPES.has(body.type)) {
    return c.json({ error: 'invalid_type' }, 400);
  }

  await db.insert(events).values({
    type: body.type,
    userId: u.id,
    buildId: body.buildId ?? null,
    source: body.source ?? null,
    deepLink: body.deepLink ?? null,
    campaign: body.campaign ?? null,
    createdAt: Date.now(),
  });

  return c.json({ ok: true });
});

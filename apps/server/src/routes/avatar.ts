import { Hono } from 'hono';
import type { Context } from 'hono';
import { getBot } from '../bot';

const TTL = 24 * 60 * 60 * 1000;
const NOT_FOUND_TTL = 60 * 60 * 1000;
const cache = new Map<number, { url: string | null; ts: number }>();

const ALLOWED_HOSTS = new Set(['api.telegram.org']);

export const avatarRoute = new Hono();

function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && ALLOWED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

async function proxyAvatar(c: Context, url: string): Promise<Response> {
  if (!isAllowedUrl(url)) return c.json({ error: 'forbidden' }, 403);
  const res = await fetch(url);
  if (!res.ok || !res.body) return c.json({ error: 'avatar_fetch_failed' }, 502);
  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}

avatarRoute.get('/avatar/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: 'bad_id' }, 400);

  const hit = cache.get(id);
  if (hit) {
    const ttl = hit.url ? TTL : NOT_FOUND_TTL;
    if (Date.now() - hit.ts < ttl) {
      if (!hit.url) return c.json({ error: 'no_photo' }, 404);
      return proxyAvatar(c, hit.url);
    }
  }

  try {
    const bot = getBot();
    const photos = await bot.api.getUserProfilePhotos(id, { limit: 1 });
    const photo = photos.photos[0]?.[0];
    if (!photo) {
      cache.set(id, { url: null, ts: Date.now() });
      return c.json({ error: 'no_photo' }, 404);
    }
    const file = await bot.api.getFile(photo.file_id);
    if (!file.file_path) {
      cache.set(id, { url: null, ts: Date.now() });
      return c.json({ error: 'no_file' }, 404);
    }
    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    cache.set(id, { url, ts: Date.now() });
    return proxyAvatar(c, url);
  } catch {
    return c.json({ error: 'avatar_failed' }, 502);
  }
});

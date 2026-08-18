import { Hono } from 'hono';
import { and, eq, sql, desc, count, inArray } from 'drizzle-orm';
import { db } from '../db/index';
import { builds, buildLikes, buildRatings, users } from '../db/schema';
import { getUser, type AppEnv } from './auth';

export const buildsRoute = new Hono<AppEnv>();

// ── helpers ──

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

async function getBuildRating(buildId: number) {
  const [row] = await db
    .select({
      avg: sql<number>`coalesce(avg(${buildRatings.value}), 0)::numeric(3,2)`.as('avg'),
      cnt: count(buildRatings.id).as('cnt'),
    })
    .from(buildRatings)
    .where(eq(buildRatings.buildId, buildId));
  return { avg: Number(row?.avg ?? 0), count: row?.cnt ?? 0 };
}

// ── list builds (trending / featured / by author) ──

buildsRoute.get('/builds', async (c) => {
  const q = c.req.query();
  const u = getUser(c);

  let rows: typeof builds.$inferSelect[];

  if (q.authorId) {
    rows = await db
      .select()
      .from(builds)
      .where(eq(builds.authorId, Number(q.authorId)))
      .orderBy(desc(builds.createdAt))
      .limit(50);
  } else if (q.featured === '1') {
    rows = await db
      .select()
      .from(builds)
      .where(eq(builds.featured, true))
      .orderBy(desc(builds.createdAt))
      .limit(20);
  } else {
    // trending: top by likes_count desc, then by recency
    rows = await db
      .select()
      .from(builds)
      .orderBy(desc(builds.likesCount), desc(builds.createdAt))
      .limit(50);
  }

  // batch: likes status + ratings
  const buildIds = rows.map((r) => r.id);
  let likedSet = new Set<number>();
  let ratingsMap = new Map<number, { avg: number; count: number }>();

  if (buildIds.length > 0) {
    const [likes, ratings] = await Promise.all([
      db
        .select({ buildId: buildLikes.buildId })
        .from(buildLikes)
        .where(and(eq(buildLikes.userId, u.id), inArray(buildLikes.buildId, buildIds))),
      db
        .select({
          buildId: buildRatings.buildId,
          avg: sql<number>`coalesce(avg(${buildRatings.value}), 0)::numeric(3,2)`.as('avg'),
          cnt: count(buildRatings.id).as('cnt'),
        })
        .from(buildRatings)
        .where(inArray(buildRatings.buildId, buildIds))
        .groupBy(buildRatings.buildId),
    ]);
    likedSet = new Set(likes.map((l) => l.buildId));
    ratingsMap = new Map(ratings.map((r) => [r.buildId, { avg: Number(r.avg), count: r.cnt }]));
  }

  // batch: authors
  const authorIds = [...new Set(rows.map((r) => r.authorId))];
  let authorMap = new Map<number, { id: number; username: string | null; firstName: string; telegramId: number }>();
  if (authorIds.length > 0) {
    const authorRows = await db
      .select({ id: users.id, username: users.username, firstName: users.firstName, telegramId: users.telegramId })
      .from(users)
      .where(inArray(users.id, authorIds));
    authorMap = new Map(authorRows.map((a) => [a.id, a]));
  }

  const result = rows.map((b) => ({
    ...b,
    specs: b.specs as Record<string, unknown>,
    screenshots: b.screenshots ?? [],
    author: authorMap.get(b.authorId) ?? null,
    liked: likedSet.has(b.id),
    myRating: null as number | null,
    rating: ratingsMap.get(b.id) ?? { avg: Number(b.ratingAvg), count: b.ratingCount },
  }));

  return c.json(result);
});

// ── single build ──

buildsRoute.get('/builds/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const u = getUser(c);
  const [b] = await db.select().from(builds).where(eq(builds.id, id));
  if (!b) return c.json({ error: 'not_found' }, 404);

  const [author] = await db
    .select({ id: users.id, username: users.username, firstName: users.firstName, telegramId: users.telegramId })
    .from(users)
    .where(eq(users.id, b.authorId));

  const [liked] = await db
    .select({ buildId: buildLikes.buildId })
    .from(buildLikes)
    .where(and(eq(buildLikes.userId, u.id), eq(buildLikes.buildId, id)))
    .limit(1);

  const [myRatingRow] = await db
    .select({ value: buildRatings.value })
    .from(buildRatings)
    .where(and(eq(buildRatings.userId, u.id), eq(buildRatings.buildId, id)))
    .limit(1);

  const rating = await getBuildRating(id);

  return c.json({
    ...b,
    specs: b.specs as Record<string, unknown>,
    screenshots: b.screenshots ?? [],
    author,
    liked: !!liked,
    myRating: myRatingRow?.value ?? null,
    rating,
  });
});

// ── create build ──

buildsRoute.post('/builds', async (c) => {
  const u = getUser(c);
  const body = await c.req.json<{
    title?: string;
    carModel?: string;
    specs?: Record<string, unknown>;
    screenshots?: string[];
  }>();

  if (!body.title || !body.title.trim()) return c.json({ error: 'title_required' }, 400);
  if (!body.carModel || !body.carModel.trim()) return c.json({ error: 'car_model_required' }, 400);

  const screenshots = (body.screenshots ?? []).slice(0, 10);

  const [created] = await db
    .insert(builds)
    .values({
      authorId: u.id,
      title: body.title.trim().slice(0, 120),
      carModel: body.carModel.trim().slice(0, 80),
      specs: body.specs ?? {},
      screenshots,
      createdAt: Date.now(),
    })
    .returning();

  return c.json(created, 201);
});

// ── update build (author only) ──

buildsRoute.patch('/builds/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const u = getUser(c);
  const [existing] = await db.select().from(builds).where(eq(builds.id, id));
  if (!existing) return c.json({ error: 'not_found' }, 404);
  if (existing.authorId !== u.id) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{
    title?: string;
    carModel?: string;
    specs?: Record<string, unknown>;
    screenshots?: string[];
  }>();

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title.trim().slice(0, 120);
  if (body.carModel !== undefined) patch.carModel = body.carModel.trim().slice(0, 80);
  if (body.specs !== undefined) patch.specs = body.specs;
  if (body.screenshots !== undefined) patch.screenshots = body.screenshots.slice(0, 10);

  if (Object.keys(patch).length === 0) return c.json(existing);

  const [updated] = await db.update(builds).set(patch).where(eq(builds.id, id)).returning();
  return c.json(updated);
});

// ── delete build (author only) ──

buildsRoute.delete('/builds/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const u = getUser(c);
  const [existing] = await db.select().from(builds).where(eq(builds.id, id));
  if (!existing) return c.json({ error: 'not_found' }, 404);
  if (existing.authorId !== u.id) return c.json({ error: 'forbidden' }, 403);

  await db.delete(buildLikes).where(eq(buildLikes.buildId, id));
  await db.delete(buildRatings).where(eq(buildRatings.buildId, id));
  await db.delete(builds).where(eq(builds.id, id));
  return c.json({ ok: true });
});

// ── toggle like ──

buildsRoute.post('/builds/:id/like', async (c) => {
  const id = Number(c.req.param('id'));
  const u = getUser(c);
  const [existing] = await db.select().from(builds).where(eq(builds.id, id));
  if (!existing) return c.json({ error: 'not_found' }, 404);

  const [liked] = await db
    .select()
    .from(buildLikes)
    .where(and(eq(buildLikes.userId, u.id), eq(buildLikes.buildId, id)))
    .limit(1);

  if (liked) {
    await db.delete(buildLikes).where(eq(buildLikes.id, liked.id));
    await db
      .update(builds)
      .set({ likesCount: sql`${builds.likesCount} - 1` })
      .where(eq(builds.id, id));
    return c.json({ liked: false, likesCount: Math.max(0, existing.likesCount - 1) });
  } else {
    await db.insert(buildLikes).values({ userId: u.id, buildId: id, createdAt: Date.now() });
    await db
      .update(builds)
      .set({ likesCount: sql`${builds.likesCount} + 1` })
      .where(eq(builds.id, id));
    return c.json({ liked: true, likesCount: existing.likesCount + 1 });
  }
});

// ── rate build ──

buildsRoute.post('/builds/:id/rate', async (c) => {
  const id = Number(c.req.param('id'));
  const u = getUser(c);
  const body = await c.req.json<{ value?: number }>();
  const value = body.value;

  if (typeof value !== 'number' || value < 1 || value > 5) {
    return c.json({ error: 'invalid_value' }, 400);
  }

  const [existing] = await db.select().from(builds).where(eq(builds.id, id));
  if (!existing) return c.json({ error: 'not_found' }, 404);

  const [existingRating] = await db
    .select()
    .from(buildRatings)
    .where(and(eq(buildRatings.userId, u.id), eq(buildRatings.buildId, id)))
    .limit(1);

  if (existingRating) {
    await db
      .update(buildRatings)
      .set({ value })
      .where(eq(buildRatings.id, existingRating.id));
  } else {
    await db.insert(buildRatings).values({ userId: u.id, buildId: id, value, createdAt: Date.now() });
  }

  const rating = await getBuildRating(id);
  await db
    .update(builds)
    .set({ ratingAvg: String(rating.avg), ratingCount: rating.count })
    .where(eq(builds.id, id));

  return c.json({ ratingAvg: rating.avg, ratingCount: rating.count, value });
});

// ── creator profile ──

buildsRoute.get('/creators/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const [user] = await db
    .select({ id: users.id, username: users.username, firstName: users.firstName, telegramId: users.telegramId, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, id));
  if (!user) return c.json({ error: 'not_found' }, 404);

  const [buildStats] = await db
    .select({
      buildsCount: count(builds.id).as('buildsCount'),
      likesCount: sql<number>`coalesce(sum(${builds.likesCount}), 0)::int`.as('likesCount'),
    })
    .from(builds)
    .where(eq(builds.authorId, id));

  const [ratingStats] = await db
    .select({
      avg: sql<number>`coalesce(avg(${buildRatings.value}), 0)::numeric(3,2)`.as('avg'),
      cnt: count(buildRatings.id).as('cnt'),
    })
    .from(buildRatings)
    .innerJoin(builds, eq(buildRatings.buildId, builds.id))
    .where(eq(builds.authorId, id));

  return c.json({
    ...user,
    buildsCount: buildStats?.buildsCount ?? 0,
    likesCount: buildStats?.likesCount ?? 0,
    ratingAvg: Number(ratingStats?.avg ?? 0),
    ratingCount: ratingStats?.cnt ?? 0,
  });
});

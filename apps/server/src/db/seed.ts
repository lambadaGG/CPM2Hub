import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, isDbConfigured } from './index';
import { products } from './schema';

if (!isDbConfigured()) {
  console.error('DATABASE_URL is not set — run `docker compose up -d` first');
  process.exit(1);
}

const seed: Array<typeof products.$inferInsert> = [
  {
    slug: '7-speed-drag-gearbox',
    category: 'gearbox',
    title: '7-Speed Drag Gearbox',
    subtitle: 'MK4 Supra · AWD',
    priceStars: 149,
    glyph: 'gear',
    configCode: 'FINAL=3.20;G1=3.60;G2=2.40;G3=1.70;G4=1.25;G5=0.92;G6=0.78;G7=0.68;SHIFT=1.0',
    sortOrder: 1,
  },
  {
    slug: 'midnight-purple-wrap',
    category: 'vinyl',
    title: 'Midnight Purple Wrap',
    subtitle: 'R34 GT-R · 2-tone',
    priceStars: 89,
    glyph: 'disc',
    configCode: 'VINYL=midnight_purple;BASE=#2A1B4A;PEARL=#6A3DB0;CLEAR=0.9',
    sortOrder: 2,
  },
  {
    slug: 'launch-control-pro',
    category: 'tune',
    title: 'Launch Control Pro',
    subtitle: 'Nismo GTR · 850 HP',
    priceStars: 199,
    glyph: 'gauge',
    configCode: 'MAP=launch_pro;BOOST=1.45;ANTI_LAG=on;RPM_LIMIT=7400;TRACTION=8',
    sortOrder: 3,
  },
  {
    slug: 'nick-pack-ace',
    category: 'nick',
    title: 'Nick Pack 『ACE』',
    subtitle: '3 styles · premium',
    priceStars: 49,
    glyph: 'type',
    configCode: 'NICK1=『ACE』王;NICK2=ACE_777;NICK3=ÆCE',
    sortOrder: 4,
  },
];

let inserted = 0;
for (const row of seed) {
  const existing = await db.select().from(products).where(eq(products.slug, row.slug!));
  if (existing.length > 0) continue;
  await db.insert(products).values(row);
  inserted++;
}

const all = await db.select().from(products);
console.log(`Seed done. inserted=${inserted} total=${all.length}`);
process.exit(0);

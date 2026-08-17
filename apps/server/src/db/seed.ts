import 'dotenv/config';
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
  {
    slug: 'police-cruiser-skin',
    category: 'service',
    title: 'Police Cruiser',
    subtitle: 'Patrol mode skin · R34',
    priceStars: 8,
    glyph: 'shieldcheck',
    configCode: 'VINYL=police_cruiser;BASE=#1C1C1E;STRIPE=#FFFFFF;LIGHT=#2AABEE',
    sortOrder: 5,
    params: { model: 'R34', variant: 'Patrol' },
  },
  {
    slug: 'taxi-yellow-skin',
    category: 'service',
    title: 'Taxi Yellow',
    subtitle: 'Street mode skin · R34',
    priceStars: 8,
    glyph: 'shieldcheck',
    configCode: 'VINYL=taxi_yellow;BASE=#FFD60A;STRIPE=#111111;LIGHT=#FFFFFF',
    sortOrder: 6,
    params: { model: 'R34', variant: 'Street' },
  },
  {
    slug: 'starter-pack',
    category: 'bundle',
    title: 'Starter Pack',
    subtitle: 'Garage + Sound + Plate',
    priceStars: 25,
    glyph: 'gift',
    configCode: 'BUNDLE=starter;GARAGE=2slot_garage;SOUND=burble_turbo;PLATE=CUSTOM1',
    sortOrder: 7,
    params: { contents: ['Garage preset', 'Turbo sound', 'Custom plate'], discount: 40 },
  },
  {
    slug: 'r34-drift-kit',
    category: 'suspension',
    title: 'Drift Angle Kit',
    subtitle: 'R34 · camber −3.5°',
    priceStars: 9,
    glyph: 'tools',
    configCode: 'FRONT_CAMBER=-3.5;REAR_CAMBER=-2.0;FRONT_TOE=0.2;RIDE=0.8;LOCK=2.0',
    sortOrder: 8,
    params: { style: 'Drift', model: 'R34', camber: -3.5 },
  },
  {
    slug: 'v8-burble-turbo',
    category: 'exhaust',
    title: 'V8 Burble + Turbo',
    subtitle: 'Exhaust sound · MK4',
    priceStars: 7,
    glyph: 'zap',
    configCode: 'SOUND=burble_turbo;VOLUME=0.9;PITCH=1.1;ANTI_LAG=on',
    sortOrder: 9,
    params: { soundType: 'Burble + Turbo', model: 'MK4' },
  },
  {
    slug: 'custom-plate-r34z',
    category: 'plates',
    title: 'Custom Plate 「R34Z」',
    subtitle: 'Japan style',
    priceStars: 3,
    glyph: 'type',
    configCode: 'PLATE=R34Z;REGION=JP;STYLE=japan',
    sortOrder: 10,
    params: { plateText: 'R34Z', region: 'JP', style: 'Japan' },
  },
  {
    slug: 'midnight-neon-kit',
    category: 'neon',
    title: 'Midnight Neon Kit',
    subtitle: 'R34 · underglow 4 zones',
    priceStars: 6,
    glyph: 'star',
    configCode: 'NEON=midnight;BASE=#6A3DB0;ANIM=flow;ZONES=front,rear,side_l,side_r',
    sortOrder: 11,
    params: { colorScheme: 'Midnight Purple', zones: ['front', 'rear', 'side_l', 'side_r'], animation: 'Flow' },
  },
  {
    slug: 'smoke-white-exit',
    category: 'smoke',
    title: 'White Smoke Exhaust',
    subtitle: 'Cold start · white cloud',
    priceStars: 5,
    glyph: 'smoke',
    configCode: 'SMOKE=white;ZONES=dual;DENSITY=high;COLOR=#F2F2F2',
    sortOrder: 12,
    params: { model: 'R34', color: 'White', zones: ['dual'] },
  },
  {
    slug: 'ninja-driver-skin',
    category: 'character',
    title: 'Ninja Driver',
    subtitle: 'Stealth character skin',
    priceStars: 11,
    glyph: 'person',
    configCode: 'CHAR=ninja;OUTFIT=black_shadow;MODEL=R34',
    sortOrder: 13,
    params: { type: 'Ninja', model: 'R34' },
  },
];

const inserted = await db
  .insert(products)
  .values(seed)
  .onConflictDoNothing({ target: products.slug })
  .returning({ id: products.id, slug: products.slug });

const all = await db.select().from(products);
console.log(`Seed done. inserted=${inserted.length} total=${all.length}`);
process.exit(0);

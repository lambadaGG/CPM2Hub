import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateListing, validatePatch } from '../routes/products';

const GOOD = {
  category: 'gearbox',
  title: 'Drag Gearbox',
  subtitle: 'MK4 Supra',
  priceStars: 149,
  configCode: 'FINAL=3.20;G1=3.60',
};

test('validateListing accepts a valid user listing', () => {
  const r = validateListing(GOOD);
  assert.equal(r.error, undefined);
  assert.equal(r.value?.category, 'gearbox');
  assert.equal(r.value?.priceStars, 149);
});

test('validateListing rejects non-sellable categories', () => {
  assert.equal(validateListing({ ...GOOD, category: 'account' }).error, 'bad_category');
  assert.equal(validateListing({ ...GOOD, category: 'paint' }).error, 'bad_category');
  assert.equal(validateListing({ ...GOOD, category: undefined }).error, 'bad_category');
});

test('validateListing trims title and enforces length 3..40', () => {
  const short = validateListing({ ...GOOD, title: '  a  ' });
  assert.equal(short.error, 'bad_title');
  assert.equal(validateListing({ ...GOOD, title: '  Drag  ' }).value?.title, 'Drag');
  assert.equal(validateListing({ ...GOOD, title: 'x'.repeat(41) }).error, 'bad_title');
  assert.equal(validateListing({ ...GOOD, title: 'x'.repeat(40) }).error, undefined);
});

test('validateListing enforces subtitle <= 80', () => {
  assert.equal(validateListing({ ...GOOD, subtitle: 'x'.repeat(81) }).error, 'bad_subtitle');
  assert.equal(validateListing({ ...GOOD, subtitle: 'x'.repeat(80) }).error, undefined);
  assert.equal(validateListing({ ...GOOD, subtitle: '  ' }).value?.subtitle, '');
});

test('validateListing enforces priceStars 1..1000 integer', () => {
  assert.equal(validateListing({ ...GOOD, priceStars: 0 }).error, 'bad_price');
  assert.equal(validateListing({ ...GOOD, priceStars: 1001 }).error, 'bad_price');
  assert.equal(validateListing({ ...GOOD, priceStars: 1.5 }).error, 'bad_price');
  assert.equal(validateListing({ ...GOOD, priceStars: 'abc' }).error, 'bad_price');
  assert.equal(validateListing({ ...GOOD, priceStars: 1000 }).error, undefined);
});

test('validateListing enforces configCode 1..300', () => {
  assert.equal(validateListing({ ...GOOD, configCode: '' }).error, 'bad_code');
  assert.equal(validateListing({ ...GOOD, configCode: '   ' }).error, 'bad_code');
  assert.equal(validateListing({ ...GOOD, configCode: 'x'.repeat(301) }).error, 'bad_code');
  assert.equal(validateListing({ ...GOOD, configCode: 'x'.repeat(300) }).error, undefined);
});

test('validatePatch accepts partial updates and ignores unknown fields', () => {
  assert.equal(validatePatch({ priceStars: 50 }).error, undefined);
  assert.equal(validatePatch({ active: false }).error, undefined);
  assert.equal(validatePatch({}).error, undefined);
});

test('validatePatch rejects invalid per-field values', () => {
  assert.equal(validatePatch({ title: 'a' }).error, 'bad_title');
  assert.equal(validatePatch({ priceStars: 0 }).error, 'bad_price');
  assert.equal(validatePatch({ configCode: '' }).error, 'bad_code');
  assert.equal(validatePatch({ active: 'yes' }).error, 'bad_active');
});

test('validateListing accepts all new sellable categories', () => {
  const base = { title: 'Item', subtitle: '', priceStars: 10, configCode: 'X' };
  const cases: Array<{ category: string; params?: Record<string, string>; media?: { videoUrl?: string; audioUrl?: string }; serverName?: string }> = [
    { category: 'gearbox' },
    { category: 'vinyl' },
    { category: 'tune' },
    { category: 'nick' },
    { category: 'bodykit', params: { model: 'Silvia', kitType: 'Street' } },
    { category: 'wheels', params: { brand: 'TE37', models: 'S15, GTR' } },
    { category: 'engine', params: { donorEngine: 'SR20', targetModel: 'Silvia', hp: '250' }, media: { videoUrl: 'https://cdn.example.com/v.mp4' } },
    { category: 'suspension', params: { style: 'Stance', model: 'Silvia' } },
    { category: 'plates', params: { plateText: 'A777AA' } },
    { category: 'exhaust', params: { soundType: 'V8' }, media: { audioUrl: 'https://cdn.example.com/s.mp3' } },
    { category: 'neon', params: { colorScheme: 'Blue' } },
    { category: 'garage', serverName: 'CPM2 RP' },
  ];
  for (const c of cases) {
    const r = validateListing({ ...base, category: c.category, params: c.params, media: c.media, serverName: c.serverName });
    assert.equal(r.error, undefined, `category ${c.category} → ${r.error}`);
  }
});

test('engine requires a video url', () => {
  const engine = { ...GOOD, category: 'engine', params: { donorEngine: 'SR20', targetModel: 'Silvia', hp: '250' } };
  assert.equal(validateListing(engine).error, 'bad_video');
  assert.equal(validateListing({ ...engine, media: { videoUrl: 'https://cdn.example.com/v.mp4' } }).error, undefined);
  assert.equal(validateListing({ ...engine, media: { videoUrl: 'not-a-url' } }).error, 'bad_video');
});

test('exhaust requires an audio url', () => {
  const exhaust = { ...GOOD, category: 'exhaust', params: { soundType: 'V8' } };
  assert.equal(validateListing(exhaust).error, 'bad_audio');
  assert.equal(validateListing({ ...exhaust, media: { audioUrl: 'https://cdn.example.com/s.mp3' } }).error, undefined);
});

test('bodykit requires model params', () => {
  assert.equal(validateListing({ ...GOOD, category: 'bodykit' }).error, 'bad_params');
  assert.equal(
    validateListing({ ...GOOD, category: 'bodykit', params: { model: 'Silvia S15', kitType: 'Street' } }).error,
    undefined,
  );
});

test('plates requires plateText and trims params', () => {
  assert.equal(validateListing({ ...GOOD, category: 'plates' }).error, 'bad_params');
  const r = validateListing({ ...GOOD, category: 'plates', params: { plateText: 'A777AA' } });
  assert.equal(r.error, undefined);
  assert.equal(r.value?.params.plateText, 'A777AA');
});

test('garage requires a server name', () => {
  assert.equal(validateListing({ ...GOOD, category: 'garage' }).error, 'bad_server');
  assert.equal(validateListing({ ...GOOD, category: 'garage', serverName: '  CPM2 RP  ' }).error, undefined);
});

test('wheels parses list params', () => {
  const r = validateListing({
    ...GOOD,
    category: 'wheels',
    params: { brand: 'TE37', models: 'S15, GTR', offset: '12' },
  });
  assert.equal(r.error, undefined);
  assert.deepEqual(r.value?.params.models, ['S15', 'GTR']);
  assert.equal(r.value?.params.offset, 12);
});

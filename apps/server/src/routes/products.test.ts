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
  assert.equal(validateListing({ ...GOOD, category: 'nick' }).error, 'bad_category');
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

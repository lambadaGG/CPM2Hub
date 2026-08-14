import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeModeration, containsProfanity, mediaTypeFor, riskFor } from '../lib/market';

test('mediaTypeFor maps categories to media types', () => {
  assert.equal(mediaTypeFor('bodykit'), 'before_after');
  assert.equal(mediaTypeFor('suspension'), 'before_after');
  assert.equal(mediaTypeFor('engine'), 'video');
  assert.equal(mediaTypeFor('exhaust'), 'audio');
  assert.equal(mediaTypeFor('plates'), 'plate');
  assert.equal(mediaTypeFor('wheels'), 'photo');
});

test('riskFor maps categories to risk tiers', () => {
  assert.equal(riskFor('gearbox'), 'low');
  assert.equal(riskFor('nick'), 'medium');
  assert.equal(riskFor('engine'), 'medium');
  assert.equal(riskFor('plates'), 'medium');
  assert.equal(riskFor('garage'), 'high');
  assert.equal(riskFor('account'), 'high');
});

test('computeModeration auto-approves low-risk categories', () => {
  for (const c of ['gearbox', 'vinyl', 'tune', 'bodykit', 'wheels', 'suspension', 'exhaust', 'neon']) {
    assert.equal(computeModeration(c, {}), 'approved');
  }
});

test('computeModeration holds medium/high categories pending', () => {
  assert.equal(computeModeration('nick', {}), 'pending');
  assert.equal(computeModeration('engine', {}), 'pending');
  assert.equal(computeModeration('garage', {}), 'pending');
  assert.equal(computeModeration('account', {}), 'pending');
});

test('computeModeration auto-moderates plates with profanity filter', () => {
  assert.equal(computeModeration('plates', { plateText: 'A777AA' }), 'approved');
  assert.equal(computeModeration('plates', { plateText: 'ХУЙ777' }), 'rejected');
  assert.equal(computeModeration('plates', { plateText: 'FUCK111' }), 'rejected');
});

test('containsProfanity catches russian and latin words', () => {
  assert.equal(containsProfanity('Обычный ник'), false);
  assert.equal(containsProfanity('БЛЯТЬ'), true);
  assert.equal(containsProfanity('пиздец'), true);
  assert.equal(containsProfanity('fuck you'), true);
  assert.equal(containsProfanity('Merc 600'), false);
});

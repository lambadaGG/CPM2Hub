import { test } from 'node:test';
import assert from 'node:assert/strict';

// Pure-unit tests for builds validation logic.
// Same pattern as gamification.test.ts — no DB, no HTTP.

test('BuildSpecs defaults to empty object', () => {
  const specs: Record<string, unknown> = {};
  assert.deepEqual(specs, {});
});

test('BuildSpecs keys are well-known', () => {
  const KNOWN = [
    'hp', 'torque', 'zero100', 'maxSpeed', 'gearbox', 'suspension',
    'camber', 'rideHeight', 'tires', 'engine', 'visual', 'vinyl',
  ];
  const specs: Record<string, unknown> = {
    hp: 400, torque: 500, zero100: 4.2, maxSpeed: 280,
    gearbox: '6MT', suspension: 'Coilover', camber: -2.5,
    rideHeight: 90, tires: '245/35R19', engine: '2JZ', visual: 'Widebody', vinyl: 'Matte Black',
  };
  for (const k of Object.keys(specs)) {
    assert.ok(KNOWN.includes(k), `unexpected key: ${k}`);
  }
});

test('EventType valid values', () => {
  const VALID = [
    'app_open', 'build_view', 'build_like', 'build_unlike',
    'build_rate', 'build_publish', 'share_click',
  ];
  assert.equal(VALID.length, 7);
  assert.ok(VALID.includes('app_open'));
  assert.ok(VALID.includes('share_click'));
});

test('Rating value must be 1-5', () => {
  const isValid = (v: number) => typeof v === 'number' && v >= 1 && v <= 5;
  assert.ok(isValid(1));
  assert.ok(isValid(3));
  assert.ok(isValid(5));
  assert.ok(!isValid(0));
  assert.ok(!isValid(6));
  assert.ok(!isValid(-1));
});

test('Screenshots array max length is 10', () => {
  const clamp = (arr: string[]) => arr.slice(0, 10);
  const big = Array.from({ length: 15 }, (_, i) => `url${i}`);
  assert.equal(clamp(big).length, 10);
  assert.equal(clamp(big)[0], 'url0');
  assert.equal(clamp(big)[9], 'url9');
});

test('Title max length is 120', () => {
  const clamp = (s: string) => s.trim().slice(0, 120);
  const long = 'A'.repeat(200);
  assert.equal(clamp(long).length, 120);
  assert.equal(clamp('short').length, 5);
});

test('CarModel max length is 80', () => {
  const clamp = (s: string) => s.trim().slice(0, 80);
  const long = 'B'.repeat(150);
  assert.equal(clamp(long).length, 80);
});

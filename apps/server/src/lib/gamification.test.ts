import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyLivery, dateKey, dateKeyOffset, generateReferralCode, REFERRAL_REWARD_STARS, STREAK_BONUS_STARS } from '../lib/gamification';

test('dateKey formats local date', () => {
  assert.equal(dateKey(new Date(2026, 7, 15)), '2026-08-15');
  assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('dateKeyOffset shifts by days', () => {
  assert.equal(dateKeyOffset('2026-08-15', -1), '2026-08-14');
  assert.equal(dateKeyOffset('2026-03-01', -1), '2026-02-28');
  assert.equal(dateKeyOffset('2026-12-31', 1), '2027-01-01');
});

test('dailyLivery is deterministic and valid for same key', () => {
  const a = dailyLivery('2026-08-15');
  const b = dailyLivery('2026-08-15');
  assert.equal(a.configCode, b.configCode);
  assert.equal(a.title, b.title);
  assert.match(a.configCode, /^VINYL=2026_08_15_daily;/);
  assert.ok(a.configCode.includes('BASE='));
});

test('dailyLivery differs across keys', () => {
  const a = dailyLivery('2026-08-15').configCode;
  const b = dailyLivery('2026-08-16').configCode;
  assert.notEqual(a, b);
});

test('generateReferralCode is unique, uppercase and short', () => {
  const codes = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const code = generateReferralCode(i + 1);
    assert.ok(/^[A-Z0-9]{4,16}$/.test(code), `bad code ${code}`);
    codes.add(code);
  }
  assert.equal(codes.size, 200);
});

test('reward constants are sane', () => {
  assert.equal(REFERRAL_REWARD_STARS, 50);
  assert.equal(STREAK_BONUS_STARS, 30);
});

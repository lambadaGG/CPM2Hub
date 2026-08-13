import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyInitData } from './initData';

const BOT_TOKEN = '123456:TEST-BOT-TOKEN';

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function buildInitData(params: Record<string, string>, hash?: string): string {
  const keys = Object.keys(params).sort();
  const dataCheckString = keys.map((k) => `${k}=${params[k]}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const computed = hmac(secret, dataCheckString).toString('hex');
  const p = new URLSearchParams(params);
  p.set('hash', hash ?? computed);
  return p.toString();
}

function baseParams(authDate = Math.floor(Date.now() / 1000)): Record<string, string> {
  return {
    auth_date: String(authDate),
    query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
    user: JSON.stringify({ id: 84920192, first_name: 'Alex', username: 'alex_dev' }),
  };
}

describe('verifyInitData', () => {
  it('accepts a valid initData', () => {
    const raw = buildInitData(baseParams());
    const res = verifyInitData(raw, BOT_TOKEN);
    assert.ok(res, 'should verify');
    assert.equal(res!.userId, 84920192);
    assert.equal(res!.user?.first_name, 'Alex');
  });

  it('rejects a tampered parameter', () => {
    const raw = buildInitData(baseParams());
    const forged = raw.replace(/user=[^&]+/, `user=${encodeURIComponent(JSON.stringify({ id: 111, first_name: 'Eve' }))}`);
    assert.equal(verifyInitData(forged, BOT_TOKEN), null);
  });

  it('rejects a wrong bot token', () => {
    const raw = buildInitData(baseParams());
    assert.equal(verifyInitData(raw, 'wrong:token'), null);
  });

  it('rejects missing hash', () => {
    const p = new URLSearchParams(baseParams()).toString();
    assert.equal(verifyInitData(p, BOT_TOKEN), null);
  });

  it('rejects expired auth_date (older than 24h)', () => {
    const old = Math.floor(Date.now() / 1000) - 26 * 60 * 60;
    const raw = buildInitData(baseParams(old));
    assert.equal(verifyInitData(raw, BOT_TOKEN), null);
  });

  it('accepts malformed user JSON with userId 0', () => {
    const p = baseParams();
    p.user = 'not-json';
    const raw = buildInitData(p);
    const res = verifyInitData(raw, BOT_TOKEN);
    assert.ok(res);
    assert.equal(res!.userId, 0);
    assert.equal(res!.user, undefined);
  });

  it('rejects empty raw or empty token', () => {
    assert.equal(verifyInitData('', BOT_TOKEN), null);
    assert.equal(verifyInitData(buildInitData(baseParams()), ''), null);
  });
});

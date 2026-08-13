import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fmtDate, fmtDateTime, fmtCompact } from './utils';

describe('fmtCompact', () => {
  it('plain numbers', () => {
    assert.equal(fmtCompact(0), '0');
    assert.equal(fmtCompact(999), '999');
  });

  it('thousands', () => {
    assert.equal(fmtCompact(1000), '1k');
    assert.equal(fmtCompact(4500), '4.5k');
  });

  it('millions', () => {
    assert.equal(fmtCompact(1000000), '1M');
    assert.equal(fmtCompact(1230000), '1.2M');
  });
});

describe('fmtDate / fmtDateTime', () => {
  it('formats a timestamp', () => {
    const ts = Date.UTC(2026, 7, 13, 15, 8);
    assert.equal(fmtDate(ts), '13 Aug 2026');
    assert.match(fmtDateTime(ts), /^13 Aug · \d{2}:\d{2}$/);
  });

  it('returns empty for invalid input', () => {
    assert.equal(fmtDate(Number.NaN), '');
    assert.equal(fmtDateTime('nope'), '');
  });
});

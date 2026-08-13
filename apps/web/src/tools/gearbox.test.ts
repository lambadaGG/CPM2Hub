import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { gearSpeed } from './gearbox';

describe('gearSpeed', () => {
  it('is zero at 0 rpm', () => {
    assert.equal(gearSpeed(0, 3.2, 1), 0);
  });

  it('grows with rpm', () => {
    assert.ok(gearSpeed(4000, 3.2, 1) < gearSpeed(8000, 3.2, 1));
  });

  it('is slower in a lower gear (higher ratio)', () => {
    assert.ok(gearSpeed(8000, 3.2, 3.6) < gearSpeed(8000, 3.2, 1.0));
  });

  it('is slower with a higher final drive', () => {
    assert.ok(gearSpeed(8000, 5.0, 1) < gearSpeed(8000, 2.5, 1));
  });

  it('produces sane km/h for a 7-speed drag setup', () => {
    const top = gearSpeed(8000, 3.2, 0.68);
    assert.ok(Math.abs(top - 443.5) < 0.5, `top speed ${top}`);
  });
});

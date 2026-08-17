import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fitmentTag, suspensionCode } from './suspension';

describe('suspensionCode', () => {
  it('formats a valid setup', () => {
    assert.equal(
      suspensionCode({ rideMm: -45, camberFront: -3.5, camberRear: -2, spring: 6 }),
      'RIDE=-45mm;CAMBER_F=-3.5;CAMBER_R=-2.0;SPRING=6',
    );
  });

  it('clamps out-of-range values', () => {
    assert.equal(
      suspensionCode({ rideMm: 30, camberFront: -12, camberRear: 5, spring: 99 }),
      'RIDE=10mm;CAMBER_F=-8.0;CAMBER_R=0.0;SPRING=10',
    );
    assert.equal(
      suspensionCode({ rideMm: -80, camberFront: 0, camberRear: -8, spring: -3 }),
      'RIDE=-50mm;CAMBER_F=0.0;CAMBER_R=-8.0;SPRING=1',
    );
  });

  it('rounds ride height and spring to integers', () => {
    assert.equal(
      suspensionCode({ rideMm: -25.4, camberFront: -1, camberRear: -1, spring: 3.7 }),
      'RIDE=-25mm;CAMBER_F=-1.0;CAMBER_R=-1.0;SPRING=4',
    );
  });
});

describe('fitmentTag', () => {
  it('returns stance for deep camber or very low ride', () => {
    assert.equal(fitmentTag(-35, -1), 'stance');
    assert.equal(fitmentTag(-10, -6), 'stance');
  });

  it('returns track for moderate lowering', () => {
    assert.equal(fitmentTag(-20, -3), 'track');
  });

  it('returns comfort near stock', () => {
    assert.equal(fitmentTag(0, 0), 'comfort');
    assert.equal(fitmentTag(-5, -1), 'comfort');
  });
});

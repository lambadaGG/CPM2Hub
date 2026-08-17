import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CARS, maxSpeedKmh, powerWeight, zeroTo100Kmh } from './compare';

describe('CARS', () => {
  it('has unique ids and sane specs', () => {
    const ids = new Set(CARS.map((c) => c.id));
    assert.equal(ids.size, CARS.length);
    for (const c of CARS) {
      assert.ok(c.hp > 0);
      assert.ok(c.nm > 0);
      assert.ok(c.weightKg > 500 && c.weightKg < 2500);
      assert.ok(c.cdA > 0.4 && c.cdA < 1);
      assert.ok(c.name.length > 0);
    }
  });
});

describe('powerWeight', () => {
  it('rewards more power per tonne', () => {
    const weak = CARS[0];
    const strong = CARS.find((c) => c.hp > weak.hp)!;
    assert.ok(powerWeight(strong) > powerWeight(weak));
  });

  it('is positive', () => {
    for (const c of CARS) assert.ok(powerWeight(c) > 0);
  });
});

describe('maxSpeedKmh', () => {
  it('is faster with more power', () => {
    const slow = CARS.find((c) => c.hp < 300)!;
    const fast = CARS.find((c) => c.hp > 600)!;
    assert.ok(maxSpeedKmh(fast) > maxSpeedKmh(slow));
  });

  it('produces plausible values', () => {
    for (const c of CARS) {
      const v = maxSpeedKmh(c);
      assert.ok(v > 150 && v < 420, `${c.id} → ${v} km/h`);
    }
  });
});

describe('zeroTo100Kmh', () => {
  it('is faster with a better power-to-weight', () => {
    const weak = CARS[0];
    const strong = CARS.find((c) => c.hp > weak.hp + 100)!;
    assert.ok(zeroTo100Kmh(strong) < zeroTo100Kmh(weak));
  });

  it('produces plausible times', () => {
    for (const c of CARS) {
      const t = zeroTo100Kmh(c);
      assert.ok(t > 2 && t < 12, `${c.id} → ${t}s`);
    }
  });
});

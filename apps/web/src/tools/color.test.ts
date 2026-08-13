import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hslToHex, hslToRgb, rgbToHsl, wheelPoint, pickFromPosition, PALETTES, WHEEL_SIZE } from './color';

describe('hslToRgb / hslToHex', () => {
  it('primary colors', () => {
    assert.equal(hslToHex(0, 100, 100), '#FF0000');
    assert.equal(hslToHex(120, 100, 100), '#00FF00');
    assert.equal(hslToHex(240, 100, 100), '#0000FF');
  });

  it('grayscale and black', () => {
    assert.equal(hslToHex(0, 0, 100), '#FFFFFF');
    assert.equal(hslToHex(90, 100, 0), '#000000');
  });

  it('rgb values are in range', () => {
    const [r, g, b] = hslToRgb(210, 70, 60);
    for (const v of [r, g, b]) assert.ok(v >= 0 && v <= 255);
  });
});

describe('rgbToHsl roundtrip', () => {
  for (const hex of PALETTES) {
    it(`roundtrips ${hex}`, () => {
      const hsv = rgbToHsl(hex);
      assert.equal(hslToHex(hsv.h, hsv.s, hsv.t), hex);
    });
  }
});

describe('wheelPoint', () => {
  it('center at 0% saturation', () => {
    const p = wheelPoint(90, 0);
    assert.ok(Math.abs(p.left - WHEEL_SIZE / 2) < 0.001);
    assert.ok(Math.abs(p.top - WHEEL_SIZE / 2) < 0.001);
  });

  it('stays inside the wheel at 100% saturation', () => {
    const p = wheelPoint(45, 100);
    const r = Math.hypot(p.left - WHEEL_SIZE / 2, p.top - WHEEL_SIZE / 2);
    assert.ok(r <= WHEEL_SIZE / 2);
  });
});

describe('pickFromPosition', () => {
  it('center of wheel gives 0% saturation', () => {
    const rect = { left: 0, top: 0, width: 132, height: 132 };
    const hsv = pickFromPosition(WHEEL_SIZE / 2, WHEEL_SIZE / 2, rect as DOMRect);
    assert.ok(hsv);
    assert.equal(Math.round(hsv!.s), 0);
  });

  it('outside the wheel returns null', () => {
    const rect = { left: 0, top: 0, width: 132, height: 132 };
    assert.equal(pickFromPosition(0, 0, rect as DOMRect), null);
  });
});

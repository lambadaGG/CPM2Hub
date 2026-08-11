export interface HSV {
  h: number;
  s: number;
  t: number;
}

export function hslToRgb(h: number, s: number, v: number): [number, number, number] {
  h /= 360; s /= 100; v /= 100;
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  let r = v, g = v, b = v;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function hslToHex(h: number, s: number, v: number): string {
  const [r, g, b] = hslToRgb(h, s, v);
  return '#' + [r, g, b].map((x) => ('0' + x.toString(16)).slice(-2)).join('').toUpperCase();
}

export function rgbToHsl(hex: string): HSV {
  let rr = parseInt(hex.slice(1, 3), 16) / 255;
  let gg = parseInt(hex.slice(3, 5), 16) / 255;
  let bb = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
  let h = 0, s = 0;
  const v = max;
  const d = max - min;
  if (d !== 0) {
    s = d / max;
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, t: v * 100 };
}

export const WHEEL_SIZE = 132;
const INNER_R = WHEEL_SIZE / 2 - 10;

export function wheelPoint(h: number, s: number): { left: number; top: number; color: string } {
  const rad = (h * Math.PI) / 180;
  const r = (INNER_R * s) / 100;
  const [cr, cg, cb] = hslToRgb(h, s, 100);
  return {
    left: WHEEL_SIZE / 2 + r * Math.cos(rad),
    top: WHEEL_SIZE / 2 + r * Math.sin(rad),
    color: `rgb(${cr},${cg},${cb})`,
  };
}

export function pickFromPosition(clientX: number, clientY: number, rect: DOMRect): HSV | null {
  const cx = (clientX - rect.left) * (WHEEL_SIZE / rect.width);
  const cy = (clientY - rect.top) * (WHEEL_SIZE / rect.height);
  const dx = cx - WHEEL_SIZE / 2, dy = cy - WHEEL_SIZE / 2;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > WHEEL_SIZE / 2) return null;
  let h = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (h < 0) h += 360;
  const s = Math.min(100, (dist / INNER_R) * 100);
  return { h, s, t: 100 };
}

export const PALETTES = ['#2AABEE', '#30D158', '#FFD60A', '#FF453A', '#FF9F0A', '#BF5AF2', '#64D2FF', '#FFFFFF'];

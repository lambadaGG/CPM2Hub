export type Ratios = Record<string, number>;

export interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

export const SLIDER_DEFS: SliderDef[] = [
  { key: 'fd', label: 'Final Drive', min: 2.5, max: 5, step: 0.1, value: 3.2 },
  { key: 'g1', label: 'Gear 1', min: 3, max: 4, step: 0.05, value: 3.6 },
  { key: 'g2', label: 'Gear 2', min: 2, max: 3, step: 0.05, value: 2.4 },
  { key: 'g3', label: 'Gear 3', min: 1.3, max: 2.2, step: 0.05, value: 1.7 },
  { key: 'g4', label: 'Gear 4', min: 1, max: 1.6, step: 0.05, value: 1.25 },
  { key: 'g5', label: 'Gear 5', min: 0.8, max: 1.1, step: 0.01, value: 0.92 },
  { key: 'g6', label: 'Gear 6', min: 0.6, max: 0.9, step: 0.01, value: 0.78 },
  { key: 'g7', label: 'Gear 7', min: 0.5, max: 0.8, step: 0.01, value: 0.68 },
];

export function defaultRatios(): Ratios {
  const r: Ratios = {};
  for (const d of SLIDER_DEFS) r[d.key] = d.value;
  return r;
}

export function gearSpeed(rpm: number, finalDrive: number, gear: number): number {
  return (rpm / (finalDrive * gear)) * 2 * Math.PI * 0.32 * 60 / 1000;
}

export function buildChart(r: Ratios) {
  const fd = r.fd;
  const W = 120, H = 118, padL = 26, padB = 18, padT = 6, padR = 8;
  const peak = Math.max(gearSpeed(8000, fd, r.g1), gearSpeed(8000, fd, r.g3), gearSpeed(8000, fd, r.g7));
  const x = (rpm: number) => padL + ((8000 - rpm) / 8000) * (W - padL - padR);
  const y = (v: number) => padT + ((peak - v) / peak) * (H - padT - padB);

  let out = '';
  [0.25, 0.5, 0.75].forEach((f) => {
    const yp = padT + f * (H - padT - padB);
    out += `<line x1="${padL}" y1="${yp}" x2="${W - padR}" y2="${yp}" stroke="rgba(255,255,255,.06)"/>`;
  });

  const gears: Array<[string, string]> = [['g1', 'rgba(99,99,102,.9)'], ['g3', 'rgba(142,142,147,.9)'], ['g7', '#fff']];
  for (const [key, color] of gears) {
    let d = '';
    let first = true;
    for (let rpm = 500; rpm <= 8000; rpm += 250) {
      const px = x(rpm), py = y(gearSpeed(rpm, fd, r[key]));
      d += (first ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1);
      first = false;
    }
    out += `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round"/>`;
  }

  out += `<line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="rgba(255,255,255,.18)"/>`;
  out += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="rgba(255,255,255,.18)"/>`;
  out += `<text x="${padL}" y="${H - 4}" font-size="7" fill="#636366">0</text>`;
  out += `<text x="${padL + (W - padL - padR) / 2 - 3}" y="${H - 4}" font-size="7" fill="#636366">4</text>`;
  out += `<text x="${W - padR - 6}" y="${H - 4}" font-size="7" fill="#636366">8</text>`;
  out += `<text x="${padL - 4}" y="${padT + 3}" font-size="6.5" fill="#636366" text-anchor="end">${Math.round(peak)}</text>`;
  out += `<text x="${padL - 4}" y="${(H - padB + padT) / 2}" font-size="6.5" fill="#636366" text-anchor="middle" transform="rotate(-90 ${padL - 4} ${(H - padB + padT) / 2})">km/h</text>`;

  return { peak: Math.round(peak), markup: out };
}

export function configCode(r: Ratios): string {
  return ['fd', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7']
    .map((k) => `${k.toUpperCase()}=${r[k].toFixed(k === 'fd' ? 2 : 2)}`)
    .join(';');
}

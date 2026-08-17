export interface CarSpec {
  id: string;
  name: string;
  hp: number;
  nm: number;
  weightKg: number;
  cdA: number; // drag coefficient x frontal area, m^2
}

export const CARS: CarSpec[] = [
  { id: 'golfR', name: 'VW Golf R', hp: 310, nm: 400, weightKg: 1530, cdA: 0.66 },
  { id: 'e30', name: 'BMW M3 E30', hp: 215, nm: 230, weightKg: 1200, cdA: 0.66 },
  { id: 'm4', name: 'BMW M4 Competition', hp: 510, nm: 650, weightKg: 1725, cdA: 0.62 },
  { id: 'wrx', name: 'Subaru WRX STI', hp: 300, nm: 407, weightKg: 1520, cdA: 0.68 },
  { id: 'gtr', name: 'Nissan GT-R R35', hp: 565, nm: 632, weightKg: 1740, cdA: 0.6 },
  { id: 'supra', name: 'Toyota Supra MK5', hp: 340, nm: 500, weightKg: 1520, cdA: 0.62 },
  { id: 'mustang', name: 'Ford Mustang GT', hp: 450, nm: 529, weightKg: 1785, cdA: 0.64 },
  { id: 'rx7', name: 'Mazda RX-7 FD', hp: 280, nm: 313, weightKg: 1290, cdA: 0.62 },
  { id: 'skyline', name: 'Nissan Skyline GT-R R34', hp: 280, nm: 392, weightKg: 1560, cdA: 0.62 },
  { id: 'huracan', name: 'Lamborghini Huracán EVO', hp: 640, nm: 600, weightKg: 1422, cdA: 0.58 },
];

export function powerWeight(c: CarSpec): number {
  return c.hp / (c.weightKg / 1000);
}

export function zeroTo100Kmh(c: CarSpec): number {
  const t = 0.8 * (c.weightKg / c.hp) + 0.9;
  return Math.round(t * 10) / 10;
}

export function maxSpeedKmh(c: CarSpec): number {
  // Drag-limited top speed: v = (2P / (rho * CdA))^(1/3)
  const watts = c.hp * 735.49875;
  const vms = Math.cbrt((2 * watts) / (1.225 * c.cdA));
  return Math.round(vms * 3.6);
}

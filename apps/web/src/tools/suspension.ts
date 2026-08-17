export interface SuspensionSetup {
  rideMm: number;      // ride height in mm, negative = lowered
  camberFront: number; // front camber in degrees, negative = inward
  camberRear: number;  // rear camber in degrees, negative = inward
  spring: number;      // spring stiffness 1..10
}

export const SUSPENSION_LIMITS = {
  rideMin: -50,
  rideMax: 10,
  camberMin: -8,
  camberMax: 0,
  springMin: 1,
  springMax: 10,
} as const;

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function suspensionCode(s: SuspensionSetup): string {
  const ride = clamp(Math.round(s.rideMm), SUSPENSION_LIMITS.rideMin, SUSPENSION_LIMITS.rideMax);
  const cf = clamp(s.camberFront, SUSPENSION_LIMITS.camberMin, SUSPENSION_LIMITS.camberMax);
  const cr = clamp(s.camberRear, SUSPENSION_LIMITS.camberMin, SUSPENSION_LIMITS.camberMax);
  const spring = clamp(Math.round(s.spring), SUSPENSION_LIMITS.springMin, SUSPENSION_LIMITS.springMax);
  return `RIDE=${ride}mm;CAMBER_F=${cf.toFixed(1)};CAMBER_R=${cr.toFixed(1)};SPRING=${spring}`;
}

export type Fitment = 'stance' | 'track' | 'comfort';

export function fitmentTag(rideMm: number, camberFront: number): Fitment {
  const ride = clamp(rideMm, SUSPENSION_LIMITS.rideMin, SUSPENSION_LIMITS.rideMax);
  const camber = clamp(camberFront, SUSPENSION_LIMITS.camberMin, SUSPENSION_LIMITS.camberMax);
  if (ride <= -30 || camber <= -5) return 'stance';
  if (ride <= -12 || camber <= -2) return 'track';
  return 'comfort';
}

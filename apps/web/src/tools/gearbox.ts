export function gearSpeed(rpm: number, finalDrive: number, gear: number): number {
  return (rpm / (finalDrive * gear)) * 2 * Math.PI * 0.32 * 60 / 1000;
}

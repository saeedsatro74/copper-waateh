import {
  THICKNESS_OPTIONS,
  DIAMETER_OPTIONS,
  ThicknessUnitMode,
  DiameterUnitMode,
} from '../types';

/**
 * Helper utilities for copper tube calculations (Meters <-> Weight in Kg) and Unit Formatting
 */

export function formatThickness(
  val: string,
  mode: ThicknessUnitMode = 'mm'
): string {
  if (!val) return '-';

  // Find matching option from THICKNESS_OPTIONS
  const opt = THICKNESS_OPTIONS.find(
    (o) =>
      o.value === val ||
      o.mm === val ||
      val.includes(o.mm)
  );

  const mmVal = opt ? opt.mm : val.replace(/[^0-9.]/g, '') || val;
  const inchVal = opt ? opt.inch : '';

  if (mode === 'inch' && inchVal) {
    return `${inchVal} in`;
  }
  if (mode === 'both' && inchVal) {
    return `${mmVal} mm (${inchVal} in)`;
  }
  // Default 'mm' - clean and simple
  return `${mmVal} mm`;
}

export function formatDiameter(
  val: string,
  mode: DiameterUnitMode = 'inch'
): string {
  if (!val) return '-';

  // Find matching option from DIAMETER_OPTIONS
  const opt = DIAMETER_OPTIONS.find(
    (o) =>
      o.value === val ||
      val.includes(o.inchFraction) ||
      val.includes(o.mm)
  );

  const inchVal = opt ? opt.inchFraction : val;
  const mmVal = opt ? `${opt.mm} mm` : '';

  if (mode === 'mm' && mmVal) {
    return mmVal;
  }
  if (mode === 'both' && mmVal) {
    return `${inchVal} (${mmVal})`;
  }
  // Default 'inch' - clean and simple e.g. 3/8"
  return inchVal;
}

export function getDiameterMm(diameterStr: string): number {
  if (!diameterStr) return 9.52;
  const opt = DIAMETER_OPTIONS.find(
    (o) =>
      o.value === diameterStr ||
      diameterStr.includes(o.inchFraction) ||
      diameterStr.includes(o.mm)
  );
  if (opt) return parseFloat(opt.mm);
  const num = parseFloat(diameterStr.replace(/[^0-9.]/g, ''));
  return isNaN(num) || num <= 0 ? 9.52 : num;
}

export function getThicknessMm(thicknessStr: string): number {
  if (!thicknessStr) return 0.75;
  const opt = THICKNESS_OPTIONS.find(
    (o) =>
      o.value === thicknessStr ||
      o.mm === thicknessStr ||
      thicknessStr.includes(o.mm)
  );
  if (opt) return parseFloat(opt.mm);
  const num = parseFloat(thicknessStr.replace(/[^0-9.]/g, ''));
  return isNaN(num) || num <= 0 ? 0.75 : num;
}

export function estimateCopperWeightPerMeter(diameterStr: string, thicknessStr: string): number {
  const outerDiameterMm = getDiameterMm(diameterStr);
  const thicknessMm = getThicknessMm(thicknessStr);

  // Formula: PI * (OD - t) * t * 0.00896 (density of copper approx 8.96 g/cm³)
  const weightKgPerMeter = Math.PI * (outerDiameterMm - thicknessMm) * thicknessMm * 0.00896;
  return Math.round(weightKgPerMeter * 1000) / 1000;
}

export function calculateTotalCopperWeightKg(
  diameterMm: number,
  thicknessMm: number,
  lengthMeters: number,
  quantity: number = 1
): { weightPerMeterKg: number; totalWeightKg: number } {
  if (diameterMm <= 0 || thicknessMm <= 0 || lengthMeters <= 0 || quantity <= 0) {
    return { weightPerMeterKg: 0, totalWeightKg: 0 };
  }
  const weightPerMeter = Math.PI * (diameterMm - thicknessMm) * thicknessMm * 0.00896;
  const totalWeight = weightPerMeter * lengthMeters * quantity;
  return {
    weightPerMeterKg: Math.round(weightPerMeter * 1000) / 1000,
    totalWeightKg: Math.round(totalWeight * 100) / 100,
  };
}

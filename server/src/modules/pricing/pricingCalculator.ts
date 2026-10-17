import { AppError } from '../../core/errorHandler';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const VN_OFFSET_MS = 7 * HOUR_MS;

export interface PricingRule {
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
}

export interface PricingSegment {
  start: string;
  end: string;
  date: string;
  ruleName: string | null;
  multiplier: number;
  units: number;
  baseAmount: number;
  seasonalAdjustment: number;
  amount: number;
}

export interface RentalQuote {
  baseRentalAmount: number;
  seasonalSurcharge: number;
  rentalAmount: number;
  pricingMode: 'hourly' | 'daily';
  billedUnits: number;
  durationHours: number;
  breakdown: PricingSegment[];
}

export const vietnamDate = (date: Date): string =>
  new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

export const isCalendarDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(new Date(`${value}T00:00:00Z`).getTime()) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/**
 * Retain the existing rounded-up hourly/daily base. Each billed unit is split
 * at Vietnam midnight; its full price is allocated by actual occupied time.
 * This also prorates a partial final billed unit consistently across seasons.
 */
export const calculateRentalQuote = (
  vehicle: { dailyPrice: number; hourlyPrice?: number },
  pickup: string | Date,
  returned: string | Date,
  rules: readonly PricingRule[] = [],
): RentalQuote => {
  const start = new Date(pickup).getTime();
  const end = new Date(returned).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new AppError(400, 'Thời gian nhận hoặc trả xe không hợp lệ.');
  }
  const durationHours = (end - start) / HOUR_MS;
  if (durationHours < 2 || durationHours > 30 * 24) {
    throw new AppError(400, 'Thời gian thuê xe phải từ 2 giờ đến 30 ngày.');
  }
  const hourly = durationHours < 24 && vehicle.hourlyPrice !== undefined;
  const unitPrice = hourly ? vehicle.hourlyPrice! : vehicle.dailyPrice;
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new AppError(400, 'Biểu giá của phương tiện chưa hợp lệ. Vui lòng liên hệ chi nhánh.');
  }
  const unitMs = hourly ? HOUR_MS : DAY_MS;
  const billedUnits = Math.ceil((end - start) / unitMs);
  const segments: Array<PricingSegment & { rawBase: number; rawAdjusted: number }> = [];

  for (let unitStart = start; unitStart < end; unitStart += unitMs) {
    const unitEnd = Math.min(end, unitStart + unitMs);
    for (let cursor = unitStart; cursor < unitEnd;) {
      const date = vietnamDate(new Date(cursor));
      const midnight = Math.floor((cursor + VN_OFFSET_MS) / DAY_MS + 1) * DAY_MS - VN_OFFSET_MS;
      const segmentEnd = Math.min(unitEnd, midnight);
      const rule = rules.find((candidate) => candidate.startDate <= date && candidate.endDate >= date);
      const multiplier = rule?.multiplier ?? 1;
      const units = (segmentEnd - cursor) / (unitEnd - unitStart);
      const rawBase = unitPrice * units;
      const last = segments[segments.length - 1];
      if (last && last.date === date && last.multiplier === multiplier && last.ruleName === (rule?.name ?? null)) {
        last.end = new Date(segmentEnd).toISOString();
        last.units += units;
        last.rawBase += rawBase;
        last.rawAdjusted += rawBase * multiplier;
      } else {
        segments.push({
          start: new Date(cursor).toISOString(), end: new Date(segmentEnd).toISOString(),
          date, ruleName: rule?.name ?? null, multiplier, units,
          rawBase, rawAdjusted: rawBase * multiplier,
          baseAmount: 0, seasonalAdjustment: 0, amount: 0,
        });
      }
      cursor = segmentEnd;
    }
  }

  let rawBaseTotal = 0;
  let rawAdjustedTotal = 0;
  let roundedBase = 0;
  let roundedAdjusted = 0;
  const breakdown = segments.map(({ rawBase, rawAdjusted, ...segment }) => {
    rawBaseTotal += rawBase;
    rawAdjustedTotal += rawAdjusted;
    const baseAmount = Math.round(rawBaseTotal) - roundedBase;
    const amount = Math.round(rawAdjustedTotal) - roundedAdjusted;
    roundedBase += baseAmount;
    roundedAdjusted += amount;
    return { ...segment, units: Math.round(segment.units * 10000) / 10000,
      baseAmount, amount, seasonalAdjustment: amount - baseAmount };
  });
  return {
    baseRentalAmount: roundedBase, seasonalSurcharge: roundedAdjusted - roundedBase,
    rentalAmount: roundedAdjusted, pricingMode: hourly ? 'hourly' : 'daily', billedUnits,
    durationHours: Math.round(durationHours * 100) / 100, breakdown,
  };
};

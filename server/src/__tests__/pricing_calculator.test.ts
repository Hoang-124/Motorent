import { describe, expect, it } from 'vitest';
import { calculateRentalQuote, isCalendarDate, vietnamDate } from '../modules/pricing/pricingCalculator';

const vehicle = { dailyPrice: 200_000, hourlyPrice: 30_000 };
const rules = [{ name: 'Cao điểm tháng 12', startDate: '2026-12-12', endDate: '2026-12-17', multiplier: 2.3 }];
const quote = (start: string, end: string) => calculateRentalQuote(vehicle, start, end, rules);
const vn = (date: string, time = '08:00') => `${date}T${time}:00+07:00`;

describe('seasonal rental calculator', () => {
  it('retains the base daily price outside the season', () => {
    expect(quote(vn('2026-12-10'), vn('2026-12-11'))).toMatchObject({
      pricingMode: 'daily', billedUnits: 1, baseRentalAmount: 200_000,
      seasonalSurcharge: 0, rentalAmount: 200_000,
    });
  });

  it('applies the multiplier to a rental fully within inclusive rule dates', () => {
    const result = quote(vn('2026-12-12'), vn('2026-12-14'));
    expect(result).toMatchObject({ pricingMode: 'daily', billedUnits: 2,
      baseRentalAmount: 400_000, seasonalSurcharge: 520_000, rentalAmount: 920_000 });
    expect(result.breakdown.every((segment) => segment.multiplier === 2.3)).toBe(true);
  });

  it('prorates a mixed rental by the time occupied on each Vietnam date', () => {
    const result = quote(vn('2026-12-11', '12:00'), vn('2026-12-13', '12:00'));
    expect(result).toMatchObject({ baseRentalAmount: 400_000, seasonalSurcharge: 390_000, rentalAmount: 790_000 });
    expect(result.breakdown.map(({ date, multiplier, amount }) => ({ date, multiplier, amount }))).toEqual([
      { date: '2026-12-11', multiplier: 1, amount: 100_000 },
      { date: '2026-12-12', multiplier: 2.3, amount: 460_000 },
      { date: '2026-12-13', multiplier: 2.3, amount: 230_000 },
    ]);
  });

  it('does not charge a season beginning at the exclusive checkout midnight', () => {
    const result = quote(vn('2026-12-11', '00:00'), vn('2026-12-12', '00:00'));
    expect(result.rentalAmount).toBe(200_000);
    expect(result.seasonalSurcharge).toBe(0);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].date).toBe('2026-12-11');
  });

  it('includes the final rule date and returns to base price the following midnight', () => {
    const result = quote(vn('2026-12-17', '12:00'), vn('2026-12-18', '12:00'));
    expect(result).toMatchObject({ baseRentalAmount: 200_000, seasonalSurcharge: 130_000, rentalAmount: 330_000 });
    expect(result.breakdown.map(({ date, multiplier }) => ({ date, multiplier }))).toEqual([
      { date: '2026-12-17', multiplier: 2.3 }, { date: '2026-12-18', multiplier: 1 },
    ]);
  });

  it('rounds sub-day rentals up to hourly units when hourly pricing exists', () => {
    expect(quote(vn('2026-12-12', '08:00'), vn('2026-12-12', '10:30'))).toMatchObject({
      pricingMode: 'hourly', billedUnits: 3, baseRentalAmount: 90_000,
      seasonalSurcharge: 117_000, rentalAmount: 207_000,
    });
    expect(quote(vn('2026-12-10', '08:00'), vn('2026-12-10', '10:30'))).toMatchObject({
      baseRentalAmount: 90_000, seasonalSurcharge: 0, rentalAmount: 90_000,
    });
  });

  it('splits a billed hour crossing midnight and charges its partial final hour consistently', () => {
    const result = quote(vn('2026-12-11', '23:30'), vn('2026-12-12', '02:00'));
    expect(result).toMatchObject({ pricingMode: 'hourly', billedUnits: 3,
      baseRentalAmount: 90_000, seasonalSurcharge: 97_500, rentalAmount: 187_500 });
    expect(result.breakdown.map(({ date, baseAmount, amount }) => ({ date, baseAmount, amount }))).toEqual([
      { date: '2026-12-11', baseAmount: 15_000, amount: 15_000 },
      { date: '2026-12-12', baseAmount: 75_000, amount: 172_500 },
    ]);
  });

  it('uses daily pricing at exactly 24 hours', () => {
    expect(quote(vn('2026-12-12'), vn('2026-12-13'))).toMatchObject({
      pricingMode: 'daily', billedUnits: 1, baseRentalAmount: 200_000, rentalAmount: 460_000,
    });
  });

  it('uses daily pricing for sub-day rentals without an hourly price', () => {
    expect(calculateRentalQuote({ dailyPrice: 200_000 }, vn('2026-12-10', '08:00'), vn('2026-12-10', '10:30'), rules))
      .toMatchObject({ pricingMode: 'daily', billedUnits: 1, rentalAmount: 200_000 });
  });

  it('retains a full final daily unit when a 25-hour rental crosses the season boundary', () => {
    // The first 24-hour unit is half base / half seasonal. The final hour is
    // billed as one complete daily unit and occurs entirely within the season.
    expect(quote(vn('2026-12-11', '12:00'), vn('2026-12-12', '13:00'))).toMatchObject({
      billedUnits: 2, baseRentalAmount: 400_000, seasonalSurcharge: 390_000, rentalAmount: 790_000,
    });
  });

  it('supports seasonal reductions without applying a voucher a second time', () => {
    const result = calculateRentalQuote(vehicle, vn('2026-12-12'), vn('2026-12-13'), [{ ...rules[0], multiplier: 0.9 }]);
    expect(result).toMatchObject({ baseRentalAmount: 200_000, seasonalSurcharge: -20_000, rentalAmount: 180_000 });
    expect(result).not.toHaveProperty('discountAmount');
  });

  it('keeps every rounded segment and adjustment equal to the quote totals', () => {
    const result = quote(vn('2026-12-11', '23:47'), vn('2026-12-13', '04:19'));
    expect(result.breakdown.reduce((sum, segment) => sum + segment.baseAmount, 0)).toBe(result.baseRentalAmount);
    expect(result.breakdown.reduce((sum, segment) => sum + segment.amount, 0)).toBe(result.rentalAmount);
    expect(result.breakdown.reduce((sum, segment) => sum + segment.seasonalAdjustment, 0)).toBe(result.seasonalSurcharge);
    for (const segment of result.breakdown) expect(segment.amount - segment.baseAmount).toBe(segment.seasonalAdjustment);
  });

  it.each([
    ['invalid-date', vn('2026-12-12')],
    [vn('2026-12-12'), vn('2026-12-12')],
    [vn('2026-12-12', '10:00'), vn('2026-12-12', '09:00')],
    [vn('2026-12-12', '08:00'), vn('2026-12-12', '09:59')],
    [vn('2026-12-01'), vn('2027-01-01')],
  ])('rejects invalid or unsupported rental bounds (%s → %s)', (start, end) => {
    expect(() => quote(start, end)).toThrow();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects an invalid active unit price %s', (dailyPrice) => {
    expect(() => calculateRentalQuote({ dailyPrice }, vn('2026-12-10'), vn('2026-12-11'), rules)).toThrow();
  });

  it('validates real dates and determines calendar days in Vietnam independently of UTC', () => {
    expect(isCalendarDate('2028-02-29')).toBe(true);
    for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '12/12/2026', '2026-1-01']) expect(isCalendarDate(date)).toBe(false);
    expect(vietnamDate(new Date('2026-12-11T17:00:00Z'))).toBe('2026-12-12');
    expect(vietnamDate(new Date('2026-12-11T16:59:59Z'))).toBe('2026-12-11');
  });
});

import mongoose from 'mongoose';
import { Vehicle } from '../../models/Vehicle';
import { SeasonalPricingRule } from '../../models/SeasonalPricingRule';
import { IUser } from '../../models/User';
import { assertBranchAccess } from '../../core/permissions';
import { AppError } from '../../core/errorHandler';
import { calculateRentalQuote, vietnamDate } from './pricingCalculator';
import { withResourceLock as withPricingLock } from '../../core/resourceLock';

export interface RuleInput { name: string; startDate: string; endDate: string; multiplier: number }

const getVehicle = async (id: string, user?: IUser) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'Mã phương tiện không hợp lệ.');
  const vehicle = await Vehicle.findOne({ _id: id, isDeleted: false });
  if (!vehicle) throw new AppError(404, 'Không tìm thấy phương tiện.');
  if (user) assertBranchAccess(user, vehicle.branchId);
  return vehicle;
};

export const updatePricing = async (id: string, user: IUser, data: { dailyPrice: number; hourlyPrice?: number | null }) => {
  return withPricingLock(id, async () => {
  const vehicle = await getVehicle(id, user);
  vehicle.dailyPrice = data.dailyPrice;
  if (data.hourlyPrice !== undefined) vehicle.hourlyPrice = data.hourlyPrice === null ? undefined : data.hourlyPrice;
  return vehicle.save();
  });
};

export const listRules = async (id: string, user: IUser) => {
  await getVehicle(id, user);
  return SeasonalPricingRule.find({ vehicleId: id }).sort({ startDate: 1, createdAt: 1 });
};

export const saveRule = async (id: string, user: IUser, data: RuleInput, ruleId?: string) =>
  withPricingLock(id, async () => {
    const vehicle = await getVehicle(id, user);
    if (ruleId && !mongoose.isValidObjectId(ruleId)) throw new AppError(400, 'Mã quy tắc giá không hợp lệ.');
    const existing = ruleId ? await SeasonalPricingRule.findOne({ _id: ruleId, vehicleId: id }) : null;
    if (ruleId && !existing) throw new AppError(404, 'Không tìm thấy quy tắc giá của phương tiện.');
    const overlap = await SeasonalPricingRule.findOne({
      vehicleId: id, ...(ruleId ? { _id: { $ne: ruleId } } : {}),
      startDate: { $lte: data.endDate }, endDate: { $gte: data.startDate },
    });
    if (overlap) throw new AppError(409, `Khoảng ngày trùng với quy tắc "${overlap.name}" (${overlap.startDate} – ${overlap.endDate}).`);
    if (existing) {
      existing.set(data);
      return existing.save();
    }
    return SeasonalPricingRule.create({ ...data, vehicleId: id, branchId: vehicle.branchId });
  });

export const deleteRule = async (id: string, user: IUser, ruleId: string) =>
  withPricingLock(id, async () => {
    await getVehicle(id, user);
    if (!mongoose.isValidObjectId(ruleId)) throw new AppError(400, 'Mã quy tắc giá không hợp lệ.');
    const deleted = await SeasonalPricingRule.findOneAndDelete({ _id: ruleId, vehicleId: id });
    if (!deleted) throw new AppError(404, 'Không tìm thấy quy tắc giá của phương tiện.');
    return deleted;
  });

export const quoteVehicleRental = async (
  vehicle: { _id: unknown; dailyPrice: number; hourlyPrice?: number },
  pickup: string | Date,
  returned: string | Date,
) => {
  // Validate before querying dates so invalid input never reaches ISO formatting.
  calculateRentalQuote(vehicle, pickup, returned);
  const rules = await SeasonalPricingRule.find({ vehicleId: vehicle._id,
    startDate: { $lte: vietnamDate(new Date(returned)) },
    endDate: { $gte: vietnamDate(new Date(pickup)) },
  }).sort({ startDate: 1 });
  return calculateRentalQuote(vehicle, pickup, returned, rules);
};

export const getQuote = async (id: string, pickup: string, returned: string) => {
  const vehicle = await getVehicle(id);
  return quoteVehicleRental(vehicle, pickup, returned);
};

import { AppError } from '../../core/errorHandler';

export type DeliveryMode = 'BranchPickup' | 'DoorDelivery';

export const DOOR_DELIVERY_ONE_WAY_FEE = 40_000;
export const DOOR_DELIVERY_DEFAULT_FEE = 50_000;
export const OVERDUE_HOURLY_FEE = 30_000;
export const RETURN_GRACE_MINUTES = 15;

/**
 * Unified vehicle transport / door-to-door delivery fee calculator:
 * - BranchPickup: 0 VND
 * - DoorDelivery with custom pickup address: +40,000 VND
 * - DoorDelivery with custom return address: +40,000 VND (80,000 VND round-trip)
 * - DoorDelivery selected before addresses are entered: 50,000 VND base fee
 */
export const calculateDoorDeliveryFee = (
  deliveryMode?: string,
  customPickupAddress?: string,
  customReturnAddress?: string
): number => {
  if (deliveryMode !== 'DoorDelivery') {
    return 0;
  }
  const hasPickup = Boolean(customPickupAddress && customPickupAddress.trim());
  const hasReturn = Boolean(customReturnAddress && customReturnAddress.trim());
  const directionalFee =
    (hasPickup ? DOOR_DELIVERY_ONE_WAY_FEE : 0) +
    (hasReturn ? DOOR_DELIVERY_ONE_WAY_FEE : 0);

  return directionalFee > 0 ? directionalFee : DOOR_DELIVERY_DEFAULT_FEE;
};

export interface NoRefundCancellationEvaluation {
  refundAmount: 0;
  forfeitAmount: number;
  refundStatus: 'None';
  policyNotice: string;
}

/**
 * Strict NO REFUND policy evaluation for cancelled or rejected bookings.
 */
export const evaluateNoRefundPolicy = (
  paidAmount: number,
  context: 'CANCEL' | 'REJECT' = 'CANCEL'
): NoRefundCancellationEvaluation => {
  const normalizedPaid = Math.max(0, Math.round(paidAmount || 0));
  const policyNotice =
    normalizedPaid > 0
      ? context === 'REJECT'
        ? 'Đơn đặt xe đã đóng theo quy định vận hành. Áp dụng điều khoản hợp đồng KHÔNG HOÀN TIỀN trên hệ thống.'
        : 'Áp dụng chính sách KHÔNG HOÀN TIỀN theo điều khoản hợp đồng. Toàn bộ số tiền cọc/đã thanh toán không được hoàn lại khi hủy đơn.'
      : 'Đơn đặt giữ chưa phát sinh tiền thanh toán, hủy đơn không mất phí.';

  return {
    refundAmount: 0,
    forfeitAmount: normalizedPaid,
    refundStatus: 'None',
    policyNotice,
  };
};

export interface CheckoutSettlementInput {
  now: Date;
  scheduledReturn: Date;
  remainingAmount: number;
  damageFee: number;
  rawReturnNotes?: string;
}

export interface CheckoutSettlementResult {
  lateHours: number;
  lateFee: number;
  damageFee: number;
  finalDue: number;
  isEarlyReturn: boolean;
  earlyHours: number;
  returnNotes: string;
  refundAmount: 0;
  refundStatus: 'None';
}

/**
 * Evaluates check-out settlement, overdue fees, and early-return non-refundable contract clause.
 */
export const evaluateCheckoutSettlement = ({
  now,
  scheduledReturn,
  remainingAmount,
  damageFee,
  rawReturnNotes,
}: CheckoutSettlementInput): CheckoutSettlementResult => {
  const graceMs = RETURN_GRACE_MINUTES * 60 * 1000;
  let lateHours = 0;
  if (now.getTime() > scheduledReturn.getTime() + graceMs) {
    lateHours = Math.ceil((now.getTime() - scheduledReturn.getTime()) / (1000 * 3600));
  }

  const lateFee = Math.max(0, lateHours * OVERDUE_HOURLY_FEE);
  const normalizedDamage = Math.max(0, Math.round(damageFee || 0));
  const normalizedRemaining = Math.max(0, Math.round(remainingAmount || 0));
  const finalDue = normalizedRemaining + lateFee + normalizedDamage;

  const isEarlyReturn = now.getTime() < scheduledReturn.getTime();
  const earlyHours = isEarlyReturn
    ? Math.max(1, Math.round((scheduledReturn.getTime() - now.getTime()) / (1000 * 3600)))
    : 0;

  let returnNotes = (rawReturnNotes || '').trim();
  if (isEarlyReturn) {
    const earlyNotice = `[Trả xe sớm ${earlyHours} giờ - Áp dụng điều khoản Hợp đồng: Không hoàn tiền khi trả xe sớm]`;
    returnNotes = returnNotes ? `${returnNotes} | ${earlyNotice}` : earlyNotice;
  }

  return {
    lateHours,
    lateFee,
    damageFee: normalizedDamage,
    finalDue,
    isEarlyReturn,
    earlyHours,
    returnNotes,
    refundAmount: 0,
    refundStatus: 'None',
  };
};

export interface HandoverSignatureInput {
  inputESignature?: string;
  existingESignature?: string;
  inputLessorSignature?: string;
  existingLessorSignature?: string;
  staffIdentifier: string;
  signedAt?: Date;
}

export interface HandoverSignatureResolution {
  customerSignature: string;
  lessorSignature: string;
  contractSignedAt: Date;
}

/**
 * Enforces mandatory customer signature upon vehicle handover (Check-in)
 * and guarantees Lessor/Staff counter-signature is recorded.
 */
export const resolveHandoverSignatures = ({
  inputESignature,
  existingESignature,
  inputLessorSignature,
  existingLessorSignature,
  staffIdentifier,
  signedAt = new Date(),
}: HandoverSignatureInput): HandoverSignatureResolution => {
  const customerSignature = (inputESignature || existingESignature || '').trim();
  if (!customerSignature) {
    throw new AppError(400, 'Yêu cầu chữ ký xác nhận của khách hàng khi bàn giao xe.');
  }

  const lessorSignature = (
    inputLessorSignature ||
    existingLessorSignature ||
    `MOTORENT-STAFF:${staffIdentifier}:${signedAt.toISOString()}`
  ).trim();

  return {
    customerSignature,
    lessorSignature,
    contractSignedAt: signedAt,
  };
};

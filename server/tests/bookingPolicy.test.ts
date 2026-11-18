import { describe, it, expect } from 'vitest';
import {
  calculateDoorDeliveryFee,
  evaluateNoRefundPolicy,
  evaluateCheckoutSettlement,
  resolveHandoverSignatures,
} from '../src/modules/booking/bookingPolicy';
import { AppError } from '../src/core/errorHandler';

describe('Booking Domain Policy (Delivery Fee, Strict No-Refund, Handover Signatures)', () => {
  describe('calculateDoorDeliveryFee', () => {
    it('returns 0 VND when deliveryMode is BranchPickup', () => {
      expect(calculateDoorDeliveryFee('BranchPickup', '123 Bach Dang', 'San Bay Da Nang')).toBe(0);
      expect(calculateDoorDeliveryFee(undefined, '', '')).toBe(0);
    });

    it('calculates 40,000 VND for one-way pickup or return DoorDelivery', () => {
      expect(calculateDoorDeliveryFee('DoorDelivery', 'Khach san Novotel 36 Bach Dang', '')).toBe(40_000);
      expect(calculateDoorDeliveryFee('DoorDelivery', '   ', 'San Bay Quoc Te Da Nang')).toBe(40_000);
    });

    it('calculates 80,000 VND for round-trip DoorDelivery (both pickup and return)', () => {
      expect(
        calculateDoorDeliveryFee('DoorDelivery', 'Khach san Muong Thanh', 'Ga Da Nang')
      ).toBe(80_000);
    });

    it('returns 50,000 VND default base fee when DoorDelivery is selected without addresses yet', () => {
      expect(calculateDoorDeliveryFee('DoorDelivery', '', '')).toBe(50_000);
    });
  });

  describe('evaluateNoRefundPolicy (Strict KHÔNG HOÀN TIỀN)', () => {
    it('forfeits 100% of paid deposit and returns refundAmount = 0 on cancellation', () => {
      const res = evaluateNoRefundPolicy(150_000, 'CANCEL');
      expect(res.refundAmount).toBe(0);
      expect(res.forfeitAmount).toBe(150_000);
      expect(res.refundStatus).toBe('None');
      expect(res.policyNotice).toContain('KHÔNG HOÀN TIỀN');
    });

    it('returns 0 forfeit and 0 refund when unpaid booking is cancelled', () => {
      const res = evaluateNoRefundPolicy(0, 'CANCEL');
      expect(res.refundAmount).toBe(0);
      expect(res.forfeitAmount).toBe(0);
      expect(res.refundStatus).toBe('None');
    });

    it('maintains strict 0 refund on operational rejection', () => {
      const res = evaluateNoRefundPolicy(300_000, 'REJECT');
      expect(res.refundAmount).toBe(0);
      expect(res.forfeitAmount).toBe(300_000);
      expect(res.refundStatus).toBe('None');
    });
  });

  describe('evaluateCheckoutSettlement (Early Return & Overdue Fees)', () => {
    it('appends non-refundable early return contract clause and refunds 0 VND when returned early', () => {
      const scheduledReturn = new Date('2026-11-20T18:00:00.000Z');
      const actualNow = new Date('2026-11-20T06:00:00.000Z'); // 12 hours early

      const res = evaluateCheckoutSettlement({
        now: actualNow,
        scheduledReturn,
        remainingAmount: 210_000,
        damageFee: 0,
        rawReturnNotes: 'Xe sạch đẹp',
      });

      expect(res.isEarlyReturn).toBe(true);
      expect(res.earlyHours).toBe(12);
      expect(res.lateFee).toBe(0);
      expect(res.finalDue).toBe(210_000);
      expect(res.refundAmount).toBe(0);
      expect(res.refundStatus).toBe('None');
      expect(res.returnNotes).toContain('Không hoàn tiền khi trả xe sớm');
      expect(res.returnNotes).toContain('Xe sạch đẹp');
    });

    it('grants 15-minute grace period without late fee', () => {
      const scheduledReturn = new Date('2026-11-20T18:00:00.000Z');
      const withinGrace = new Date('2026-11-20T18:14:00.000Z');

      const res = evaluateCheckoutSettlement({
        now: withinGrace,
        scheduledReturn,
        remainingAmount: 100_000,
        damageFee: 50_000,
      });

      expect(res.isEarlyReturn).toBe(false);
      expect(res.lateHours).toBe(0);
      expect(res.lateFee).toBe(0);
      expect(res.finalDue).toBe(150_000);
    });

    it('charges 30,000 VND per ceiling overdue hour beyond 15-minute grace', () => {
      const scheduledReturn = new Date('2026-11-20T18:00:00.000Z');
      const overdueTime = new Date('2026-11-20T20:20:00.000Z'); // 2h20m overdue -> 3 hours

      const res = evaluateCheckoutSettlement({
        now: overdueTime,
        scheduledReturn,
        remainingAmount: 200_000,
        damageFee: 0,
      });

      expect(res.lateHours).toBe(3);
      expect(res.lateFee).toBe(90_000);
      expect(res.finalDue).toBe(290_000);
    });
  });

  describe('resolveHandoverSignatures (Mandatory Check-in Signatures)', () => {
    it('throws AppError(400) if customer signature is missing during vehicle handover', () => {
      expect(() =>
        resolveHandoverSignatures({
          inputESignature: '',
          existingESignature: '',
          staffIdentifier: 'staff_dad',
        })
      ).toThrowError(AppError);
    });

    it('accepts customer signature and auto-stamps lessor signature when staff canvas is empty', () => {
      const fixedDate = new Date('2026-11-18T08:00:00.000Z');
      const res = resolveHandoverSignatures({
        inputESignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
        staffIdentifier: 'staff01',
        signedAt: fixedDate,
      });

      expect(res.customerSignature).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==');
      expect(res.lessorSignature).toContain('MOTORENT-STAFF:staff01:');
      expect(res.contractSignedAt).toEqual(fixedDate);
    });

    it('preserves explicit drawn signatures from both Party A and Party B', () => {
      const res = resolveHandoverSignatures({
        inputESignature: 'data:image/png;base64,CUSTOMER_SIG',
        inputLessorSignature: 'data:image/png;base64,LESSOR_SIG',
        staffIdentifier: 'staff01',
      });

      expect(res.customerSignature).toBe('data:image/png;base64,CUSTOMER_SIG');
      expect(res.lessorSignature).toBe('data:image/png;base64,LESSOR_SIG');
    });
  });
});

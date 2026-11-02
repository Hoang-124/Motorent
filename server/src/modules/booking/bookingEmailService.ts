import { IBooking } from '../../models/Booking';
import { User } from '../../models/User';
import { BookingEmailPayload, sendBookingStatusEmail } from '../../config/mailer';

const mapStatusToEvent = (status: IBooking['status']): BookingEmailPayload['event'] => {
  switch (status) {
    case 'Approved':
      return 'APPROVED';
    case 'Ongoing':
      return 'CHECKIN';
    case 'Completed':
      return 'COMPLETED';
    case 'Rejected':
      return 'REJECTED';
    case 'Cancelled':
      return 'CANCELLED';
    default:
      return 'CONFIRMED';
  }
};

export const sendBookingStatusUpdateEmail = async (booking: IBooking): Promise<void> => {
  try {
    const customer = await User.findById(booking.userId).select('email username firstName lastName');
    if (!customer) {
      console.error(`[EMAIL] Could not find customer for booking ${booking.bookingCode}.`);
      return;
    }
    const customerName =
      [customer.lastName, customer.firstName].filter(Boolean).join(' ').trim() ||
      customer.firstName ||
      customer.username;
    await sendBookingStatusEmail({
      toEmail: customer.email,
      customerName,
      bookingCode: booking.bookingCode,
      event: mapStatusToEvent(booking.status),
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount,
      remainingAmount: booking.remainingAmount,
    });
  } catch (error) {
    console.error(`[EMAIL] Failed to prepare status email for booking ${booking.bookingCode}:`, error);
  }
};

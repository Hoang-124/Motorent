import { IBooking } from '../../models/Booking';
import { User } from '../../models/User';
import { sendBookingStatusEmail } from '../../config/mailer';

export const sendBookingStatusUpdateEmail = async (booking: IBooking): Promise<void> => {
  try {
    const customer = await User.findById(booking.userId).select('email username firstName');
    if (!customer) {
      console.error(`[EMAIL] Could not find customer for booking ${booking.bookingCode}.`);
      return;
    }
    await sendBookingStatusEmail({
      toEmail: customer.email,
      username: customer.firstName || customer.username,
      bookingCode: booking.bookingCode,
      status: booking.status,
      pickupDateTime: booking.pickupDateTime,
      totalAmount: booking.totalAmount,
    });
  } catch (error) {
    console.error(`[EMAIL] Failed to prepare status email for booking ${booking.bookingCode}:`, error);
  }
};

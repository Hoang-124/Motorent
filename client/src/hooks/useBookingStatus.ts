import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../services/socket';
import { api } from '../services/api';
import type { Booking } from '../types';

export interface BookingStatusPayload {
  bookingId: string;
  bookingCode: string;
  status: string;
  isPaid: boolean;
  depositPaid: boolean;
  remainingAmount: number;
  updatedAt: string;
}

export interface UseBookingStatusResult {
  status?: string;
  isPaid?: boolean;
  depositPaid?: boolean;
  remainingAmount?: number;
  updatedAt?: string;
  isLive: boolean;
  refetch: () => Promise<void>;
}

/**
 * UC-37 Real-Time Booking Status Hook
 * Listens to Socket.IO booking:status events with automatic fallback to 15s polling.
 */
export const useBookingStatus = (
  bookingId: string | undefined,
  initialBooking?: Booking | null
): UseBookingStatusResult => {
  const [status, setStatus] = useState<string | undefined>(initialBooking?.status);
  const [isPaid, setIsPaid] = useState<boolean | undefined>(initialBooking?.isPaid);
  const [depositPaid, setDepositPaid] = useState<boolean | undefined>(initialBooking?.depositPaid);
  const [remainingAmount, setRemainingAmount] = useState<number | undefined>(initialBooking?.remainingAmount);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(initialBooking?.updatedAt);
  const [isLive, setIsLive] = useState<boolean>(false);

  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLatest = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = await api.get(`/bookings/${bookingId}`);
      if (res.data?.success && res.data.data) {
        const b = res.data.data;
        setStatus(b.status);
        setIsPaid(b.isPaid);
        setDepositPaid(b.depositPaid);
        setRemainingAmount(b.remainingAmount);
        setUpdatedAt(b.updatedAt);
      }
    } catch {
      // Ignore polling errors silently
    }
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;

    const socket = getSocket();

    const handleConnect = () => {
      setIsLive(true);
      socket.emit('join_booking', bookingId);
    };

    const handleDisconnect = () => {
      setIsLive(false);
    };

    const handleStatusUpdate = (payload: BookingStatusPayload) => {
      if (payload.bookingId === bookingId) {
        setStatus(payload.status);
        setIsPaid(payload.isPaid);
        setDepositPaid(payload.depositPaid);
        setRemainingAmount(payload.remainingAmount);
        setUpdatedAt(payload.updatedAt);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('booking:status', handleStatusUpdate);

    if (socket.connected) {
      handleConnect();
    }

    // Fallback polling interval every 15 seconds if socket is disconnected or as safety
    fallbackTimerRef.current = setInterval(() => {
      if (!socket.connected) {
        fetchLatest();
      }
    }, 15000);

    return () => {
      socket.emit('leave_booking', bookingId);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('booking:status', handleStatusUpdate);
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
      }
    };
  }, [bookingId, fetchLatest]);

  return {
    status,
    isPaid,
    depositPaid,
    remainingAmount,
    updatedAt,
    isLive,
    refetch: fetchLatest,
  };
};

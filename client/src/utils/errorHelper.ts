import axios from 'axios';

export const extractApiError = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string } | undefined)?.message;
    if (msg && typeof msg === 'string') return msg;
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
};

export const extractEntityId = (val: unknown): string => {
  if (val && typeof val === 'object' && '_id' in val) {
    return String((val as { _id?: unknown })._id || '');
  }
  return val ? String(val) : '';
};

import { env } from './env';

export const normalizeVietnamesePhoneNumber = (phoneNumber: string): string => {
  const trimmed = phoneNumber.trim().replace(/[ .()-]/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('0')) return `+84${trimmed.slice(1)}`;
  if (trimmed.startsWith('84')) return `+${trimmed}`;
  return trimmed;
};

export const isSmsConfigured = (): boolean =>
  Boolean(
    env.TWILIO_ACCOUNT_SID?.trim() &&
      env.TWILIO_AUTH_TOKEN?.trim() &&
      env.TWILIO_FROM_NUMBER?.trim()
  );

export const sendSms = async (to: string, body: string): Promise<void> => {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = env.TWILIO_AUTH_TOKEN?.trim();
  const from = env.TWILIO_FROM_NUMBER?.trim();
  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio chưa được cấu hình. Hãy đặt TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN và TWILIO_FROM_NUMBER.');
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const form = new URLSearchParams({ To: normalizeVietnamesePhoneNumber(to), From: from, Body: body });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!response.ok) {
    throw new Error(`Twilio rejected SMS with HTTP ${response.status}. Check Twilio credentials and destination.`);
  }
};

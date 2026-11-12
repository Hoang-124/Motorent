import type { ShiftType, StaffAvailabilitySlot } from '../types';

export const toLocalDateKey = (d: Date): string => {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
};

export const parseDayOfWeekToken = (token: string): number | null => {
  const clean = token
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  if (/^(t2|thu2|thuhai|mon|monday|2)$/.test(clean)) return 1;
  if (/^(t3|thu3|thuba|tue|tuesday|3)$/.test(clean)) return 2;
  if (/^(t4|thu4|thutu|wed|wednesday|4)$/.test(clean)) return 3;
  if (/^(t5|thu5|thunam|thu|thursday|5)$/.test(clean)) return 4;
  if (/^(t6|thu6|thusau|fri|friday|6)$/.test(clean)) return 5;
  if (/^(t7|thu7|thubay|sat|saturday|7)$/.test(clean)) return 6;
  if (/^(cn|chunhat|sun|sunday|8|0)$/.test(clean)) return 7;

  return null;
};

export interface ClientParsedResult {
  slots: StaffAvailabilitySlot[];
  summaryText: string;
}

export const parseClientAvailabilityMessage = (
  rawMessage: string,
  weekMonday: Date
): ClientParsedResult => {
  const mondayZero = new Date(weekMonday);
  mondayZero.setHours(0, 0, 0, 0);

  const slotsMap = new Map<number, StaffAvailabilitySlot>();
  for (let d = 1; d <= 7; d++) {
    const slotDate = new Date(mondayZero);
    slotDate.setDate(mondayZero.getDate() + (d - 1));
    slotsMap.set(d, {
      dayOfWeek: d,
      dateKey: toLocalDateKey(slotDate),
      availableShifts: ['Morning', 'Afternoon', 'Evening'],
      busyShifts: [],
      isAllDayBusy: false,
      notes: '',
    });
  }

  if (!rawMessage || !rawMessage.trim()) {
    return {
      slots: Array.from(slotsMap.values()),
      summaryText: 'Tất cả các ngày đều mở (chưa giới hạn ca cụ thể).',
    };
  }

  const rawSegments = rawMessage
    .replace(/\r\n/g, '\n')
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const matchedDays = new Set<number>();

  for (const segment of rawSegments) {
    const match = segment.match(
      /^(t[2-7]|th[uứ]\s*[2-7]|th[uứ]\s*(hai|ba|t[uư]|n[aă]m|s[aá]u|b[aả]y)|cn|ch[uủ]\s*nh[aậ]t)\s*[:=\-]?\s*(.*)$/i
    );

    if (match) {
      const dayToken = match[1];
      const content = match[3] || '';
      const dayNum = parseDayOfWeekToken(dayToken);

      if (dayNum) {
        matchedDays.add(dayNum);
        const slot = slotsMap.get(dayNum)!;
        const contentLower = content
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        if (
          /\b(ban|off|nghi|ko lam|khong lam|b|x)\b/.test(contentLower) &&
          !/\b(1|2|3)\b/.test(contentLower)
        ) {
          slot.isAllDayBusy = true;
          slot.availableShifts = [];
          slot.busyShifts = ['Morning', 'Afternoon', 'Evening'];
          slot.notes = 'Bận cả ngày';
          continue;
        }

        const declaredShifts: ShiftType[] = [];
        if (/\b1\b|sang/.test(contentLower)) declaredShifts.push('Morning');
        if (/\b2\b|chieu/.test(contentLower)) declaredShifts.push('Afternoon');
        if (/\b3\b|toi/.test(contentLower)) declaredShifts.push('Evening');

        if (/full|ca ngay/.test(contentLower)) {
          declaredShifts.length = 0;
          declaredShifts.push('Morning', 'Afternoon', 'Evening');
        }

        if (declaredShifts.length > 0) {
          slot.isAllDayBusy = false;
          slot.availableShifts = Array.from(new Set(declaredShifts));
          const allThree: ShiftType[] = ['Morning', 'Afternoon', 'Evening'];
          slot.busyShifts = allThree.filter((s) => !slot.availableShifts.includes(s));
          slot.notes = `Rảnh ca: ${declaredShifts.map((s) => (s === 'Morning' ? '1' : s === 'Afternoon' ? '2' : '3')).join(', ')}`;
        } else if (/\b(ban|off|nghi)\b/.test(contentLower)) {
          slot.isAllDayBusy = true;
          slot.availableShifts = [];
          slot.busyShifts = ['Morning', 'Afternoon', 'Evening'];
          slot.notes = 'Bận cả ngày';
        }
      }
    }
  }

  // When a staff explicitly lists days, any unmentioned day was NOT registered (Day Off / Not Available)
  if (matchedDays.size > 0) {
    for (let d = 1; d <= 7; d++) {
      if (!matchedDays.has(d)) {
        const slot = slotsMap.get(d)!;
        slot.isAllDayBusy = true;
        slot.availableShifts = [];
        slot.busyShifts = ['Morning', 'Afternoon', 'Evening'];
        slot.notes = 'Không đăng ký (Nghỉ)';
      }
    }
  }

  const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  const summaryParts: string[] = [];

  for (let d = 1; d <= 7; d++) {
    const slot = slotsMap.get(d)!;
    const dayLabel = dayLabels[d - 1];
    if (slot.isAllDayBusy) {
      summaryParts.push(`${dayLabel}: ${slot.notes?.includes('Không đăng ký') ? 'Nghỉ (không đăng ký)' : 'Bận'}`);
    } else if (slot.availableShifts.length === 3) {
      summaryParts.push(`${dayLabel}: Mở full`);
    } else if (slot.availableShifts.length > 0) {
      const shiftNums = slot.availableShifts
        .map((s) => (s === 'Morning' ? '1' : s === 'Afternoon' ? '2' : '3'))
        .join(' ');
      summaryParts.push(`${dayLabel}: Ca ${shiftNums}`);
    } else {
      summaryParts.push(`${dayLabel}: Bận`);
    }
  }

  return {
    slots: Array.from(slotsMap.values()),
    summaryText: summaryParts.join(' • '),
  };
};

/**
 * Converts structured slots back into a clean shorthand message:
 * e.g. "t2 2 3, t3 1 3, t4 1 2, t5 bận, t6 1, t7 2 3, cn 3"
 */
export const slotsToShorthandMessage = (slots: StaffAvailabilitySlot[]): string => {
  const dayTokens = ['t2', 't3', 't4', 't5', 't6', 't7', 'cn'];
  const parts: string[] = [];

  for (const slot of slots) {
    const token = dayTokens[slot.dayOfWeek - 1] || `t${slot.dayOfWeek + 1}`;
    if (slot.isAllDayBusy || slot.availableShifts.length === 0) {
      parts.push(`${token} bận`);
    } else if (slot.availableShifts.length === 3) {
      parts.push(`${token} 1 2 3`);
    } else {
      const nums = slot.availableShifts
        .map((s) => (s === 'Morning' ? '1' : s === 'Afternoon' ? '2' : '3'))
        .sort()
        .join(' ');
      parts.push(`${token} ${nums}`);
    }
  }

  return parts.join(', ');
};

export interface MultiStaffParsedResult {
  staffId: string;
  staffName: string;
  rawMessage: string;
  slots: StaffAvailabilitySlot[];
}

export const normalizeStaffMatchKey = (str: string): string => {
  return (str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const findMatchingStaffInBranch = (
  nameQuery: string,
  branchStaff: Array<{ _id: any; firstName?: string; lastName?: string; username?: string; email?: string }>
): (typeof branchStaff)[0] | null => {
  const cleanQuery = normalizeStaffMatchKey(nameQuery);
  if (!cleanQuery) return null;

  for (const s of branchStaff) {
    const fullName = normalizeStaffMatchKey(`${s.firstName || ''} ${s.lastName || ''}`);
    if (fullName === cleanQuery) return s;
  }

  for (const s of branchStaff) {
    if (s.username && normalizeStaffMatchKey(s.username) === cleanQuery) return s;
    if (s.email) {
      const emailPrefix = normalizeStaffMatchKey(s.email.split('@')[0]);
      if (emailPrefix === cleanQuery) return s;
    }
  }

  for (const s of branchStaff) {
    const lastName = normalizeStaffMatchKey(s.lastName || '');
    if (lastName && lastName === cleanQuery) return s;
  }

  const queryTokens = cleanQuery.split(' ').filter(Boolean);
  if (queryTokens.length > 0) {
    for (const s of branchStaff) {
      const fullName = normalizeStaffMatchKey(`${s.firstName || ''} ${s.lastName || ''}`);
      const nameTokens = fullName.split(' ').filter(Boolean);
      const allFound = queryTokens.every((qt) => nameTokens.includes(qt));
      if (allFound) return s;
    }
  }

  return null;
};

export const parseMultiStaffAvailabilityText = (
  multiStaffText: string,
  branchStaff: Array<{ _id: any; firstName?: string; lastName?: string; username?: string; email?: string }>,
  weekMonday: Date
): MultiStaffParsedResult[] => {
  const results: MultiStaffParsedResult[] = [];
  if (!multiStaffText || !multiStaffText.trim()) return results;

  const lines = multiStaffText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^([^:\-=]+)[:=\-](.+)$/);
    if (!match) continue;

    const nameQuery = match[1].trim();
    const shiftMsg = match[2].trim();

    const staff = findMatchingStaffInBranch(nameQuery, branchStaff);

    if (staff) {
      const parsed = parseClientAvailabilityMessage(shiftMsg, weekMonday);
      results.push({
        staffId: String(staff._id),
        staffName: `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.username || 'Nhân viên',
        rawMessage: shiftMsg,
        slots: parsed.slots,
      });
    }
  }

  return results;
};

import { ShiftType } from '../../models/StaffSchedule';
import { IStaffAvailabilitySlot } from '../../models/StaffAvailability';

/**
 * Format a Date to 'YYYY-MM-DD' in local/calendar time
 */
export const toLocalDateKey = (d: Date): string => {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
};

/**
 * Normalizes day tokens from natural Vietnamese shorthand:
 * t2, thứ 2, thu 2, thứ hai, mon -> 1 (Thứ 2)
 * t3, thứ 3, thu 3, thứ ba, tue -> 2 (Thứ 3)
 * t4, thứ 4, thu 4, thứ tư, wed -> 3 (Thứ 4)
 * t5, thứ 5, thu 5, thứ năm, thu -> 4 (Thứ 5)
 * t6, thứ 6, thu 6, thứ sáu, fri -> 5 (Thứ 6)
 * t7, thứ 7, thu 7, thứ bảy, sat -> 6 (Thứ 7)
 * cn, chủ nhật, chu nhat, sun -> 7 (Chủ Nhật)
 */
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

/**
 * Maps shift number or text to ShiftType:
 * 1 / sang -> 'Morning'
 * 2 / chieu -> 'Afternoon'
 * 3 / toi -> 'Evening'
 */
export const mapShiftToken = (val: string | number): ShiftType | null => {
  const s = String(val).trim().toLowerCase();
  if (s === '1' || s.includes('sang')) return 'Morning';
  if (s === '2' || s.includes('chieu')) return 'Afternoon';
  if (s === '3' || s.includes('toi')) return 'Evening';
  return null;
};

export interface ParsedAvailabilityResult {
  slots: IStaffAvailabilitySlot[];
  summaryText: string;
  hasErrors: boolean;
  warnings: string[];
}

/**
 * Parse staff availability text message (e.g. "t2 2 3, t3 1 3, t4 1 2, t5 bận, t6 1, t7 2 3, cn 3")
 * Produces structured 7-day schedule availability for the target week.
 */
export const parseStaffAvailabilityMessage = (
  rawMessage: string,
  weekMonday: Date
): ParsedAvailabilityResult => {
  const warnings: string[] = [];
  const mondayZero = new Date(weekMonday);
  mondayZero.setHours(0, 0, 0, 0);

  // Initialize 7 default slots for Mon (1) to Sun (7)
  const slotsMap = new Map<number, IStaffAvailabilitySlot>();
  for (let d = 1; d <= 7; d++) {
    const slotDate = new Date(mondayZero);
    slotDate.setDate(mondayZero.getDate() + (d - 1));
    slotsMap.set(d, {
      dayOfWeek: d,
      dateKey: toLocalDateKey(slotDate),
      availableShifts: ['Morning', 'Afternoon', 'Evening'], // default open unless specified
      busyShifts: [],
      isAllDayBusy: false,
      notes: '',
    });
  }

  if (!rawMessage || !rawMessage.trim()) {
    return {
      slots: Array.from(slotsMap.values()),
      summaryText: 'Tất cả các ca trong tuần đều mở (chưa đăng ký cụ thể).',
      hasErrors: false,
      warnings: [],
    };
  }

  // Tokenize segments by newline, comma, semicolon, or slash
  // Also support regex splitting on day markers: (t2|t3|t4|t5|t6|t7|cn)
  const normalizedText = rawMessage.replace(/\r\n/g, '\n');
  const rawSegments = normalizedText
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const matchedDays = new Set<number>();

  for (const segment of rawSegments) {
    // Look for day token at the start of segment e.g. "t2 2 3" or "thứ 2: ca 2 3" or "cn: bận"
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

        // Check if all-day busy (bận, off, nghỉ, ko làm)
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

        // Check for specific shift numbers: 1 (Morning), 2 (Afternoon), 3 (Evening)
        const declaredShifts: ShiftType[] = [];
        if (/\b1\b|sang/.test(contentLower)) declaredShifts.push('Morning');
        if (/\b2\b|chieu/.test(contentLower)) declaredShifts.push('Afternoon');
        if (/\b3\b|toi/.test(contentLower)) declaredShifts.push('Evening');

        // Check for "full" / "ca ngay"
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
        } else {
          warnings.push(`Không nhận diện được ca làm việc trong đoạn: "${segment}"`);
        }
      }
    } else {
      // Freeform day search if no prefix
      warnings.push(`Bỏ qua cú pháp không rõ ngày: "${segment}"`);
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

  // Build human-readable summary
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
    hasErrors: false,
    warnings,
  };
};

export interface MultiStaffParsedResult {
  staffId: string;
  staffName: string;
  rawMessage: string;
  slots: IStaffAvailabilitySlot[];
}

/**
 * Helper to normalize names and keywords for accurate matching (strips diacritics, punctuation)
 */
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

/**
 * Robustly finds the matching staff member in the branch by name, username, or email prefix
 */
export const findMatchingStaffInBranch = (
  nameQuery: string,
  branchStaff: Array<{ _id: any; firstName?: string; lastName?: string; username?: string; email?: string }>
): (typeof branchStaff)[0] | null => {
  const cleanQuery = normalizeStaffMatchKey(nameQuery);
  if (!cleanQuery) return null;

  // 1. Exact full name match (accented or unaccented)
  for (const s of branchStaff) {
    const fullName = normalizeStaffMatchKey(`${s.firstName || ''} ${s.lastName || ''}`);
    if (fullName === cleanQuery) return s;
  }

  // 2. Exact username or email prefix match
  for (const s of branchStaff) {
    if (s.username && normalizeStaffMatchKey(s.username) === cleanQuery) return s;
    if (s.email) {
      const emailPrefix = normalizeStaffMatchKey(s.email.split('@')[0]);
      if (emailPrefix === cleanQuery) return s;
    }
  }

  // 3. Exact last name match (e.g. query is single word "An", "Ca", "Bình")
  for (const s of branchStaff) {
    const lastName = normalizeStaffMatchKey(s.lastName || '');
    if (lastName && lastName === cleanQuery) return s;
  }

  // 4. Token subset match: all tokens of cleanQuery exist as distinct words in staff's full name
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

/**
 * Parse multi-line staff messages sent to Manager (e.g. from Zalo/Chat)
 * Example:
 * Nguyễn Văn An: t2 1 2, t3 1 2, t4 1 2, t5 1 2, t6 1, t7 bận, cn bận
 * Phạm Văn Ca: t2 2 3, t3 2 3, t4 2 3, t5 bận, t6 2 3, t7 2 3, cn 3
 * Trần Thị Bình: t2 1, t3 1 3, t4 1 2, t5 1 2, t6 1 2, t7 1, cn 1 2
 */
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

    // Find matching staff member in branch using robust normalized matching
    const staff = findMatchingStaffInBranch(nameQuery, branchStaff);

    if (staff) {
      const parsed = parseStaffAvailabilityMessage(shiftMsg, weekMonday);
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

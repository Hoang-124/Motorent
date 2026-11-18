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

const ALL_THREE_SHIFTS: ShiftType[] = ['Morning', 'Afternoon', 'Evening'];

const extractShiftsFromFragment = (fragment: string): ShiftType[] => {
  const found: ShiftType[] = [];
  if (/\b1\b|sang/.test(fragment)) found.push('Morning');
  if (/\b2\b|chieu/.test(fragment)) found.push('Afternoon');
  if (/\b3\b|toi/.test(fragment)) found.push('Evening');
  return Array.from(new Set(found));
};

/**
 * Converts structured 7-day slots into canonical shorthand text:
 * e.g. "t2 2 3, t3 1 3, t4 1 2, t5 bận, t6 1, t7 2 3, cn 3"
 */
export const slotsToShorthandMessage = (slots: IStaffAvailabilitySlot[]): string => {
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

/**
 * Parse staff availability text message (e.g. "t2 2 3, t3 1 3, t4 bận ca 1, t5 bận, t6 1, t7 ko làm ca 2, cn nghỉ sáng")
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

  // Tokenize segments by newline, comma, semicolon
  const normalizedText = rawMessage.replace(/\r\n/g, '\n');
  const rawSegments = normalizedText
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const matchedDays = new Set<number>();
  let hasExplicitPositiveDay = false;

  for (const segment of rawSegments) {
    // Look for day token at the start of segment e.g. "t2 2 3" or "thứ 2: ca 2 3" or "cn: bận"
    const match = segment.match(
      /^(t[2-7]|th[uứ]\s*[2-7]|th[uứ]\s*(hai|ba|t[uư]|n[aă]m|s[aá]u|b[aả]y)|cn|ch[uủ]\s*nh[aậ]t|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*[:=\-]?\s*(.*)$/i
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
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .trim();

        const hasShiftToken = /\b(1|2|3)\b|sang|chieu|toi/.test(contentLower);
        const isFullDayKeyword = /\bfull\b|ca ngay/.test(contentLower);
        const negMatch = contentLower.match(/^(.*?)\b(ban|off|nghi|ko\s*lam|khong\s*lam|ket)\b(.*)$/);

        // 1. Negation handling: all-day busy OR negated specific shift(s) e.g. "t2 bận ca 1", "t2 ko làm ca 2", "t2 nghỉ sáng"
        if (negMatch) {
          if (isFullDayKeyword || !hasShiftToken) {
            slot.isAllDayBusy = true;
            slot.availableShifts = [];
            slot.busyShifts = [...ALL_THREE_SHIFTS];
            slot.notes = 'Bận cả ngày';
            continue;
          }

          const beforeShifts = extractShiftsFromFragment(negMatch[1] || '');
          const afterShifts = extractShiftsFromFragment(negMatch[3] || '');

          let available: ShiftType[] = [];
          let busy: ShiftType[] = [];

          if (beforeShifts.length > 0 && afterShifts.length > 0) {
            // Mixed e.g. "t2 1 2 bận 3" -> available 1,2 and busy 3
            hasExplicitPositiveDay = true;
            busy = afterShifts;
            available = beforeShifts.filter((s) => !busy.includes(s));
          } else {
            // Pure negated shift(s): prefix ("t2 bận ca 1", "t2 ko làm ca 2", "t2 nghỉ sáng") or postfix ("t2 sáng nghỉ")
            const negatedShifts = afterShifts.length > 0 ? afterShifts : beforeShifts;
            busy = negatedShifts;
            available = ALL_THREE_SHIFTS.filter((s) => !busy.includes(s));
          }

          if (available.length === 0) {
            slot.isAllDayBusy = true;
            slot.availableShifts = [];
            slot.busyShifts = [...ALL_THREE_SHIFTS];
            slot.notes = 'Bận cả ngày';
          } else {
            slot.isAllDayBusy = false;
            slot.availableShifts = available;
            slot.busyShifts = ALL_THREE_SHIFTS.filter((s) => !available.includes(s));
            const busyLabels = slot.busyShifts
              .map((s) => (s === 'Morning' ? '1' : s === 'Afternoon' ? '2' : '3'))
              .join(', ');
            slot.notes = `Bận ca: ${busyLabels}`;
          }
          continue;
        }

        // Shorthand single-letter all-day busy ("t2 b", "t2 x")
        if (!hasShiftToken && !isFullDayKeyword && /\b(b|x)\b/.test(contentLower)) {
          slot.isAllDayBusy = true;
          slot.availableShifts = [];
          slot.busyShifts = [...ALL_THREE_SHIFTS];
          slot.notes = 'Bận cả ngày';
          continue;
        }

        // 2. Positive shift declaration: 1 (Morning), 2 (Afternoon), 3 (Evening), or "full" / "cả ngày"
        const declaredShifts: ShiftType[] = isFullDayKeyword
          ? [...ALL_THREE_SHIFTS]
          : extractShiftsFromFragment(contentLower);

        if (declaredShifts.length > 0) {
          hasExplicitPositiveDay = true;
          slot.isAllDayBusy = false;
          slot.availableShifts = declaredShifts;
          slot.busyShifts = ALL_THREE_SHIFTS.filter((s) => !slot.availableShifts.includes(s));
          slot.notes = `Rảnh ca: ${declaredShifts.map((s) => (s === 'Morning' ? '1' : s === 'Afternoon' ? '2' : '3')).join(', ')}`;
        } else {
          warnings.push(`Không nhận diện được ca làm việc trong đoạn: "${segment}"`);
        }
      }
    } else {
      // Freeform day search if no prefix
      warnings.push(`Bỏ qua cú pháp không rõ ngày: "${segment}"`);
    }
  }

  // When a staff explicitly lists positive working days, any unmentioned day was NOT registered (Day Off / Not Available).
  // If a staff ONLY sent busy/negated exceptions (e.g. "t2 bận ca 1"), unmentioned days remain open.
  if (matchedDays.size > 0 && hasExplicitPositiveDay) {
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
export const findMatchingStaffInBranch = <
  T extends { _id: unknown; firstName?: string; lastName?: string; username?: string; email?: string }
>(
  nameQuery: string,
  branchStaff: T[]
): T | null => {
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
  branchStaff: Array<{ _id: unknown; firstName?: string; lastName?: string; username?: string; email?: string }>,
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
    const match = line.match(/^([^:=]+)[:=](.+)$/) || line.match(/^([^-]+)-\s*(.+)$/);
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

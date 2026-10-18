export type ComplaintStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';

export const COMPLAINT_STATUSES: readonly ComplaintStatus[] = [
  'Open',
  'InProgress',
  'Resolved',
  'Closed',
] as const;

export const isManagerRole = (role?: string): boolean => {
  return role === 'BranchManager' || role === 'SystemAdmin';
};

export const isStaffOrManagerRole = (role?: string): boolean => {
  return role === 'Staff' || role === 'BranchManager' || role === 'SystemAdmin';
};

/**
 * State machine transition validator for complaints (used by UC-65 & UC-85).
 * Valid transitions by role:
 * - Open -> InProgress: Staff, Manager (BranchManager / SystemAdmin)
 * - InProgress -> Resolved: Staff, Manager (BranchManager / SystemAdmin)
 * - Resolved -> Closed: chỉ Manager (BranchManager / SystemAdmin)
 * - Closed: trạng thái cuối, không chuyển đi đâu.
 * Mọi chuyển khác -> false.
 */
export const canTransition = (
  from: ComplaintStatus | string,
  to: ComplaintStatus | string,
  role?: string
): boolean => {
  if (!from || !to || !role) {
    return false;
  }

  // Closed is terminal state
  if (from === 'Closed') {
    return false;
  }

  // No self transitions
  if (from === to) {
    return false;
  }

  // Open -> InProgress: Staff, Manager
  if (from === 'Open' && to === 'InProgress') {
    return isStaffOrManagerRole(role);
  }

  // InProgress -> Resolved: Staff, Manager
  if (from === 'InProgress' && to === 'Resolved') {
    return isStaffOrManagerRole(role);
  }

  // Resolved -> Closed: chỉ Manager
  if (from === 'Resolved' && to === 'Closed') {
    return isManagerRole(role);
  }

  return false;
};

/**
 * Returns allowed next statuses for a given complaint status and user role.
 */
export const getAllowedTransitions = (
  from: ComplaintStatus | string,
  role?: string
): ComplaintStatus[] => {
  if (!from || !role || from === 'Closed') {
    return [];
  }

  const result: ComplaintStatus[] = [];
  const candidates: ComplaintStatus[] = ['Open', 'InProgress', 'Resolved', 'Closed'];

  for (const candidate of candidates) {
    if (canTransition(from, candidate, role)) {
      result.push(candidate);
    }
  }

  return result;
};

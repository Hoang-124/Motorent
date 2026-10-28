import { api } from './api';
import type {
  Complaint,
  ComplaintListResponse,
  StaffComplaint,
  StaffComplaintQueueResponse,
  ManagerPendingComplaintsResponse,
} from '../types';

export interface ComplaintCategoryItem {
  id: string;
  name: string;
  description: string;
}

export interface ComplaintCategoriesResponse {
  success: boolean;
  data: ComplaintCategoryItem[];
  categories: string[];
}

export interface SubmitComplaintPayload {
  bookingId: string;
  category: string;
  description: string;
  title?: string;
  attachments?: File[];
}

/**
 * UC-42: Fetch complaint categories for dropdown
 */
export const getComplaintCategories = async (): Promise<ComplaintCategoriesResponse> => {
  const response = await api.get('/complaints/categories');
  return response.data;
};

/**
 * UC-42: Submit a complaint with optional attachments (multipart/form-data)
 */
export const submitComplaint = async (
  payload: SubmitComplaintPayload
): Promise<{ success: boolean; message: string; data: Complaint; code: string }> => {
  const formData = new FormData();
  formData.append('bookingId', payload.bookingId);
  formData.append('category', payload.category);
  formData.append('description', payload.description);
  if (payload.title) {
    formData.append('title', payload.title);
  }
  if (payload.attachments && payload.attachments.length > 0) {
    for (const file of payload.attachments) {
      formData.append('attachments', file);
    }
  }

  const response = await api.post('/complaints', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// ==========================================
// UC-43: Customer Complaint Tracking API
// ==========================================

/**
 * UC-43: Fetch customer's complaints list
 */
export const getMyComplaints = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<ComplaintListResponse> => {
  const response = await api.get('/me/complaints', { params });
  return response.data;
};

/**
 * UC-43: Fetch detailed complaint info with timeline
 */
export const getComplaintDetail = async (
  id: string
): Promise<{ success: boolean; data: Complaint }> => {
  const response = await api.get(`/me/complaints/${id}`);
  return response.data;
};

// ==========================================
// UC-65: Staff Complaints API
// ==========================================

export interface GetStaffComplaintsParams {
  status?: string;
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
}

/**
 * UC-65: Fetch staff complaints queue
 */
export const getStaffComplaints = async (
  params?: GetStaffComplaintsParams
): Promise<StaffComplaintQueueResponse> => {
  const response = await api.get('/staff/complaints', { params });
  return response.data;
};

/**
 * UC-65: Fetch full complaint details for Staff / Manager with timeline and allowedTransitions
 */
export const getStaffComplaintById = async (
  id: string
): Promise<{ success: boolean; data: StaffComplaint }> => {
  const response = await api.get(`/staff/complaints/${id}`);
  return response.data;
};

/**
 * UC-65: Staff sends response message
 */
export const addStaffComplaintResponse = async (
  id: string,
  message: string
): Promise<{ success: boolean; message: string; data: unknown }> => {
  const response = await api.post(`/staff/complaints/${id}/responses`, { message });
  return response.data;
};

/**
 * UC-65: Update complaint status using state machine
 */
export const updateComplaintStatus = async (
  id: string,
  toStatus: string,
  note?: string
): Promise<{ success: boolean; message: string; data: StaffComplaint }> => {
  const response = await api.patch(`/staff/complaints/${id}/status`, { toStatus, note });
  return response.data;
};

// ==========================================
// UC-85: Manager Complaints Resolution & Close API
// ==========================================

export interface GetPendingComplaintsParams {
  page?: number;
  limit?: number;
  includeOpen?: boolean;
}

/**
 * UC-85: Manager retrieves complaints needing resolution (status InProgress or Resolved, not Closed)
 */
export const getPendingComplaints = async (
  params?: GetPendingComplaintsParams
): Promise<ManagerPendingComplaintsResponse> => {
  const response = await api.get('/manager/complaints/pending', { params });
  return response.data;
};

/**
 * UC-85: Manager resolves complaint with final resolution conclusion (10-3000 chars)
 */
export const resolveComplaint = async (
  id: string,
  finalResolution: string
): Promise<{ success: boolean; message: string; data: StaffComplaint }> => {
  const response = await api.post(`/manager/complaints/${id}/resolve`, { finalResolution });
  return response.data;
};

/**
 * UC-85: Manager closes complaint permanently (irreversible)
 */
export const closeComplaint = async (
  id: string
): Promise<{ success: boolean; message: string; data: StaffComplaint }> => {
  const response = await api.post(`/manager/complaints/${id}/close`);
  return response.data;
};

/**
 * UC-85: Get Manager complaint details
 */
export const getManagerComplaintById = async (
  id: string
): Promise<{ success: boolean; data: StaffComplaint }> => {
  const response = await api.get(`/manager/complaints/${id}`);
  return response.data;
};

import { api } from './api';
import type {
  Complaint,
  ComplaintListResponse,
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


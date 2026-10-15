import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getActiveAuthToken = (): string | null => {
  const sessionToken = sessionStorage.getItem('motorent_token');
  if (sessionToken) return sessionToken;
  const localToken = localStorage.getItem('motorent_token');
  if (localToken) {
    sessionStorage.setItem('motorent_token', localToken);
    return localToken;
  }
  return null;
};

export const setActiveAuthToken = (token: string): void => {
  sessionStorage.setItem('motorent_token', token);
  localStorage.setItem('motorent_token', token);
};

export const clearActiveAuthToken = (): void => {
  const sessionToken = sessionStorage.getItem('motorent_token');
  const localToken = localStorage.getItem('motorent_token');
  sessionStorage.removeItem('motorent_token');
  if (!sessionToken || sessionToken === localToken) {
    localStorage.removeItem('motorent_token');
  }
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getActiveAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const token = getActiveAuthToken();
      if (token) {
        clearActiveAuthToken();
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          window.location.href = `/login?returnTo=${encodeURIComponent(currentPath)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};


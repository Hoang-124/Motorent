import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let cachedCsrfToken: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;

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

export const ensureCsrfToken = async (): Promise<string | null> => {
  if (cachedCsrfToken) return cachedCsrfToken;
  if (csrfTokenPromise) return csrfTokenPromise;

  csrfTokenPromise = axios
    .get(`${API_BASE_URL}/security/csrf-token`, { withCredentials: true })
    .then((res) => {
      const token = res.data?.data?.csrfToken;
      if (typeof token === 'string' && token.length > 0) {
        cachedCsrfToken = token;
        return token;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      csrfTokenPromise = null;
    });

  return csrfTokenPromise;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

const MUTATING_METHODS = new Set<string>(['post', 'put', 'patch', 'delete']);

api.interceptors.request.use(async (config) => {
  const token = getActiveAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const activeLocale = localStorage.getItem('motorent_locale') === 'en' ? 'en' : 'vi';
  config.headers['Accept-Language'] = activeLocale;

  const method = (config.method || 'get').toLowerCase();
  if (MUTATING_METHODS.has(method)) {
    const csrf = cachedCsrfToken || (await ensureCsrfToken());
    if (csrf) {
      config.headers['X-CSRF-Token'] = csrf;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 403 && error.response.data?.code === 'CSRF_TOKEN_INVALID') {
      cachedCsrfToken = null;
      const originalConfig = error.config;
      if (originalConfig && !originalConfig._csrfRetried) {
        originalConfig._csrfRetried = true;
        const freshCsrf = await ensureCsrfToken();
        if (freshCsrf) {
          originalConfig.headers['X-CSRF-Token'] = freshCsrf;
          return api(originalConfig);
        }
      }
    }

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

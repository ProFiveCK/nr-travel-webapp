import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Token storage helpers
let refreshTokenPromise: Promise<string> | null = null;

const getStoredTokens = () => {
  try {
    const stored = localStorage.getItem('authTokens');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const setStoredTokens = (tokens: { accessToken: string; refreshToken: string }) => {
  localStorage.setItem('authTokens', JSON.stringify(tokens));
};

const clearStoredTokens = () => {
  localStorage.removeItem('authTokens');
};

// Refresh token function
const refreshAccessToken = async (): Promise<string> => {
  if (refreshTokenPromise) {
    return refreshTokenPromise;
  }

  refreshTokenPromise = (async () => {
    try {
      const tokens = getStoredTokens();
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token');
      }

      // Use axios directly to avoid interceptor loop
      const apiBase = baseURL === '/' ? '/api' : `${baseURL}/api`;
      const { data } = await axios.post(`${apiBase}/auth/refresh`, {
        refreshToken: tokens.refreshToken,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const newTokens = {
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
      };
      setStoredTokens(newTokens);

      // Update the default header for future requests
      api.defaults.headers.common.Authorization = `Bearer ${newTokens.accessToken}`;

      return newTokens.accessToken;
    } catch (error) {
      clearStoredTokens();
      throw error;
    } finally {
      refreshTokenPromise = null;
    }
  })();

  return refreshTokenPromise;
};

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    // Always get fresh tokens from localStorage to ensure we have the latest
    const tokens = getStoredTokens();
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      // Also update the default header for consistency
      api.defaults.headers.common.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens but don't redirect immediately
        clearStoredTokens();
        // Only redirect if it's not already a login/refresh endpoint
        if (!originalRequest.url?.includes('/auth/login') && !originalRequest.url?.includes('/auth/refresh')) {
          // Delay redirect to avoid loops
          setTimeout(() => {
            if (window.location.pathname !== '/') {
              window.location.href = '/';
            }
          }, 100);
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

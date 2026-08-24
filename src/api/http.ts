import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const TOKEN_KEY = 'pmb_access_token';
const REFRESH_KEY = 'pmb_refresh_token';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (accessToken: string, refreshToken?: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;
export const registerUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh-token`, {
      refreshToken,
    });
    const newAccessToken: string = response.data.data.accessToken;
    tokenStorage.setTokens(newAccessToken);
    return newAccessToken;
  } catch {
    return null;
  }
};

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh-token'];
const isAuthEndpoint = (url?: string) => !!url && AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;

      if (newToken) {
        originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
        return http(originalRequest);
      }

      tokenStorage.clear();
      onUnauthorized?.();
    }

    return Promise.reject(error);
  }
);

export interface ApiErrorPayload {
  success: false;
  message: string;
}

export const extractErrorMessage = (error: unknown, fallback = 'Terjadi kesalahan, silakan coba lagi'): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    if (payload?.message) return payload.message;
  }
  return fallback;
};

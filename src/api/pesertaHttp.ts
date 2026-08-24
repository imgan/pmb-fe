import axios, { type InternalAxiosRequestConfig } from 'axios';

const TOKEN_KEY = 'pmb_peserta_access_token';

export const pesertaTokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const pesertaHttp = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

pesertaHttp.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = pesertaTokenStorage.get();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;
export const registerPesertaUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

pesertaHttp.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = !!error.config?.url?.includes('/peserta/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      pesertaTokenStorage.clear();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

import axios, { type InternalAxiosRequestConfig } from 'axios';

// Portal Dosen punya token terpisah dari admin (pmb_access_token) dan peserta
// (pmb_peserta_access_token) supaya ketiganya bisa login berbarengan di browser yang sama
// tanpa saling menimpa sesi.
const TOKEN_KEY = 'pmb_dosen_access_token';

export const dosenTokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const dosenHttp = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

dosenHttp.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = dosenTokenStorage.get();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;
export const registerDosenUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

dosenHttp.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = !!error.config?.url?.includes('/dosen-portal/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      dosenTokenStorage.clear();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

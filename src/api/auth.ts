import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { LoginResult, MeResult, ProdiOption, TahunAkademikOption, User } from '@/types/entities';

export interface UpdateProfilePayload {
  name?: string;
  photo?: string | null;
}

export interface LoginContextPayload {
  tahunAjaranId?: number | null;
  module?: string;
  kodeProdi?: string | null;
}

export const authApi = {
  async login(username: string, password: string, context: LoginContextPayload = {}): Promise<LoginResult> {
    const { data } = await http.post<ApiResponse<LoginResult>>('/auth/login', { username, password, ...context });
    return data.data;
  },
  /**
   * Pilihan Tahun Akademik & Prodi di form login (publik, tanpa token). `bawaan` = tahun default form login modul
   * PMB / Keuangan (padanan Tahun Ajaran PMB / Keuangan aktif).
   */
  async loginOptions(): Promise<{ tahunAkademik: TahunAkademikOption[]; prodi: ProdiOption[]; bawaan?: { pmb: number | null; keuangan: number | null } }> {
    const { data } = await http.get<ApiResponse<{ tahunAkademik: TahunAkademikOption[]; prodi: ProdiOption[]; bawaan?: { pmb: number | null; keuangan: number | null } }>>(
      '/public/login-options'
    );
    return data.data;
  },
  async me(): Promise<MeResult> {
    const { data } = await http.get<ApiResponse<MeResult>>('/auth/me');
    return data.data;
  },
  async forgotPassword(email: string): Promise<string> {
    const { data } = await http.post<ApiResponse<null>>('/auth/forgot-password', { email });
    return data.message;
  },
  async resetPassword(token: string, password: string): Promise<string> {
    const { data } = await http.post<ApiResponse<null>>('/auth/reset-password', { token, password });
    return data.message;
  },
  async changePassword(oldPassword: string, newPassword: string): Promise<string> {
    const { data } = await http.put<ApiResponse<null>>('/auth/change-password', { oldPassword, newPassword });
    return data.message;
  },
  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    const { data } = await http.put<ApiResponse<{ user: User }>>('/auth/profile', payload);
    return data.data.user;
  },
};

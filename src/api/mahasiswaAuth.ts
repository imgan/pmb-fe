import { mahasiswaHttp } from './mahasiswaHttp';
import type { ApiResponse } from '@/types/common';
import type { Mahasiswa } from '@/types/entities';

export interface MahasiswaLoginPayload {
  nim?: string;
  email?: string;
  password: string;
}

export interface MahasiswaLoginResult {
  mahasiswa: Mahasiswa;
  accessToken: string;
}

export const mahasiswaAuthApi = {
  async login(payload: MahasiswaLoginPayload): Promise<MahasiswaLoginResult> {
    const { data } = await mahasiswaHttp.post<ApiResponse<MahasiswaLoginResult>>('/mahasiswa-portal/login', payload);
    return data.data;
  },
  async me(): Promise<Mahasiswa> {
    const { data } = await mahasiswaHttp.get<ApiResponse<Mahasiswa>>('/mahasiswa-portal/me');
    return data.data;
  },
  async updateProfile(payload: { photo?: string | null }): Promise<Mahasiswa> {
    const { data } = await mahasiswaHttp.put<ApiResponse<Mahasiswa>>('/mahasiswa-portal/profile', payload);
    return data.data;
  },
  async changePassword(oldPassword: string, newPassword: string): Promise<string> {
    const { data } = await mahasiswaHttp.put<ApiResponse<null>>('/mahasiswa-portal/change-password', {
      oldPassword,
      newPassword,
    });
    return data.message;
  },
};

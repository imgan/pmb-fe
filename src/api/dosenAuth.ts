import { dosenHttp } from './dosenHttp';
import type { ApiResponse } from '@/types/common';
import type { Dosen } from '@/types/entities';

export interface DosenLoginPayload {
  nip?: string;
  nidn?: string;
  email?: string;
  password: string;
}

export interface DosenLoginResult {
  dosen: Dosen;
  accessToken: string;
}

export const dosenAuthApi = {
  async login(payload: DosenLoginPayload): Promise<DosenLoginResult> {
    const { data } = await dosenHttp.post<ApiResponse<DosenLoginResult>>('/dosen-portal/login', payload);
    return data.data;
  },
  async me(): Promise<Dosen> {
    const { data } = await dosenHttp.get<ApiResponse<Dosen>>('/dosen-portal/me');
    return data.data;
  },
  /** Foto profil (data URL base64); null = hapus foto. */
  async listTahunAkademik(): Promise<{ id: number; label: string; isActive: boolean }[]> {
    const { data } = await dosenHttp.get<ApiResponse<{ id: number; label: string; isActive: boolean }[]>>('/dosen-portal/tahun-akademik');
    return data.data;
  },
  async updatePhoto(photo: string | null): Promise<Dosen> {
    const { data } = await dosenHttp.put<ApiResponse<Dosen>>('/dosen-portal/profile/photo', { photo });
    return data.data;
  },
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await dosenHttp.put('/dosen-portal/profile/password', { oldPassword, newPassword });
  },
};

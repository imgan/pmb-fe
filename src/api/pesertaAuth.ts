import { pesertaHttp } from './pesertaHttp';
import type { ApiResponse } from '@/types/common';
import type { Peserta, PesertaBiodata, PesertaDokumenStatus } from '@/types/entities';

export interface PesertaRegisterPayload {
  namaLengkap: string;
  asalSekolah: string;
  golonganKelasId: number;
  jurusanId: number;
  noTelepon: string;
  email: string;
}

export type PesertaUpdateMePayload = Partial<PesertaRegisterPayload>;

export type PesertaBiodataPayload = Omit<PesertaBiodata, 'id' | 'pesertaId'>;

export interface PesertaLoginResult {
  peserta: Peserta;
  accessToken: string;
}

export const pesertaAuthApi = {
  async register(payload: PesertaRegisterPayload): Promise<Peserta> {
    const { data } = await pesertaHttp.post<ApiResponse<Peserta>>('/peserta/register', payload);
    return data.data;
  },
  async login(email: string, password: string): Promise<PesertaLoginResult> {
    const { data } = await pesertaHttp.post<ApiResponse<PesertaLoginResult>>('/peserta/login', { email, password });
    return data.data;
  },
  async me(): Promise<Peserta> {
    const { data } = await pesertaHttp.get<ApiResponse<Peserta>>('/peserta/me');
    return data.data;
  },
  async forgotPassword(email: string): Promise<string> {
    const { data } = await pesertaHttp.post<ApiResponse<null>>('/peserta/forgot-password', { email });
    return data.message;
  },
  async resetPassword(token: string, password: string): Promise<string> {
    const { data } = await pesertaHttp.post<ApiResponse<null>>('/peserta/reset-password', { token, password });
    return data.message;
  },
  async updateMe(payload: PesertaUpdateMePayload): Promise<Peserta> {
    const { data } = await pesertaHttp.put<ApiResponse<Peserta>>('/peserta/me', payload);
    return data.data;
  },
  async saveBiodata(payload: PesertaBiodataPayload): Promise<Peserta> {
    const { data } = await pesertaHttp.put<ApiResponse<Peserta>>('/peserta/me/biodata', payload);
    return data.data;
  },
  async listMyDokumen(): Promise<PesertaDokumenStatus[]> {
    const { data } = await pesertaHttp.get<ApiResponse<PesertaDokumenStatus[]>>('/peserta/me/dokumen');
    return data.data;
  },
  async uploadMyDokumen(dokumenKelengkapanId: number, fileName: string, file: string): Promise<void> {
    await pesertaHttp.put(`/peserta/me/dokumen/${dokumenKelengkapanId}`, { fileName, file });
  },
  async removeMyDokumen(dokumenKelengkapanId: number): Promise<void> {
    await pesertaHttp.delete(`/peserta/me/dokumen/${dokumenKelengkapanId}`);
  },
};

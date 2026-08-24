import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { Kampus } from '@/types/entities';

export interface KampusPayload {
  namaKampus?: string;
  alamat?: string | null;
  telepon?: string | null;
  kodePos?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  websiteTitle?: string | null;
}

export const kampusApi = {
  async get(): Promise<Kampus | null> {
    const { data } = await http.get<ApiResponse<Kampus | null>>('/kampus');
    return data.data;
  },
  async update(payload: KampusPayload): Promise<Kampus> {
    const { data } = await http.put<ApiResponse<Kampus>>('/kampus', payload);
    return data.data;
  },
};

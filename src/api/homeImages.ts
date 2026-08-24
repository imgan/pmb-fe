import { http } from './http';
import type { ApiResponse } from '@/types/common';
import type { HomeImage } from '@/types/entities';

export interface HomeImagePayload {
  heroImage?: string | null;
  programStudiImage?: string | null;
  kehidupanKampusImage?: string | null;
  fasilitasLabImage?: string | null;
  fasilitasGedungImage?: string | null;
  fasilitasAulaImage?: string | null;
  beasiswaSlide1Image?: string | null;
  beasiswaSlide2Image?: string | null;
}

export const homeImagesApi = {
  async get(): Promise<HomeImage | null> {
    const { data } = await http.get<ApiResponse<HomeImage | null>>('/home-images');
    return data.data;
  },
  async update(payload: HomeImagePayload): Promise<HomeImage> {
    const { data } = await http.put<ApiResponse<HomeImage>>('/home-images', payload);
    return data.data;
  },
};

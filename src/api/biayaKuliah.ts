import { createCrudApi } from './crudFactory';
import type { BiayaKuliah } from '@/types/entities';

export interface BiayaKuliahPayload {
  judul: string;
  slug: string;
  ringkasan?: string | null;
  konten?: string | null;
  orderNumber?: number;
  isActive?: boolean;
}

export const biayaKuliahApi = createCrudApi<BiayaKuliah, BiayaKuliahPayload, Partial<BiayaKuliahPayload>>(
  'biaya-kuliah'
);

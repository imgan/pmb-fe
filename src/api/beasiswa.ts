import { createCrudApi } from './crudFactory';
import type { Beasiswa } from '@/types/entities';

export interface BeasiswaPayload {
  namaBeasiswa: string;
  slug: string;
  ringkasan?: string | null;
  konten?: string | null;
  orderNumber?: number;
  isActive?: boolean;
}

export const beasiswaApi = createCrudApi<Beasiswa, BeasiswaPayload, Partial<BeasiswaPayload>>('beasiswa');

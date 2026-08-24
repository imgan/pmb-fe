import { createCrudApi } from './crudFactory';
import type { SumberInformasi } from '@/types/entities';

export interface SumberInformasiPayload {
  namaInformasi: string;
}

export const sumberInformasiApi = createCrudApi<
  SumberInformasi,
  SumberInformasiPayload,
  Partial<SumberInformasiPayload>
>('sumber-informasi');

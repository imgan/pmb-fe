import { createCrudApi } from './crudFactory';
import type { UkuranAlmamater } from '@/types/entities';

export interface UkuranAlmamaterPayload {
  ukuran: string;
}

export const ukuranAlmamaterApi = createCrudApi<
  UkuranAlmamater,
  UkuranAlmamaterPayload,
  Partial<UkuranAlmamaterPayload>
>('ukuran-almamater');

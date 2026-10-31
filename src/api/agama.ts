import { createCrudApi } from './crudFactory';
import type { Agama } from '@/types/entities';

export interface AgamaPayload {
  kodeAgama: string;
  namaAgama: string;
}

export const agamaApi = createCrudApi<Agama, AgamaPayload, Partial<AgamaPayload>>('agama');

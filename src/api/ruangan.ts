import { createCrudApi } from './crudFactory';
import type { Ruangan } from '@/types/entities';

export interface RuanganPayload {
  namaRuang: string;
  kampus?: string | null;
  lantai?: number | null;
  projector?: boolean;
  keterangan?: string | null;
  fungsi?: string | null;
  kursi?: number | null;
}

export const ruanganApi = createCrudApi<Ruangan, RuanganPayload, Partial<RuanganPayload>>('ruangan');

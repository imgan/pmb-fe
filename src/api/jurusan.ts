import { createCrudApi } from './crudFactory';
import type { Jurusan } from '@/types/entities';

export interface JurusanPayload {
  golonganKelasId: number;
  namaJurusan: string;
  foto?: string | null;
  prospekKarir?: string | null;
  jenjangPendidikan?: string | null;
  gelarSingkat?: string | null;
  gelarLengkap?: string | null;
  namaFakultas?: string | null;
}

export const jurusanApi = createCrudApi<Jurusan, JurusanPayload, Partial<JurusanPayload>>('jurusan');

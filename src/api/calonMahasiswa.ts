import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { CalonMahasiswa, CalonMahasiswaStats, SkemaPembiayaan, StatusBeasiswa, StatusKuliah } from '@/types/entities';

export interface CalonMahasiswaPayload {
  nama: string;
  asalSekolah: string;
  prodi: string;
  gelombangId?: number | null;
  pesertaId?: number | null;
  noTelepon?: string | null;
  skemaPembiayaan?: SkemaPembiayaan;
  formulirPendaftaran?: boolean;
  lulusTesMasuk?: boolean;
  akunBeasiswa?: boolean | null;
  kelengkapanPersyaratan?: boolean;
  statusBeasiswa?: StatusBeasiswa | null;
  statusKuliah?: StatusKuliah;
}

export const calonMahasiswaApi = {
  ...createCrudApi<CalonMahasiswa, CalonMahasiswaPayload, Partial<CalonMahasiswaPayload>>('calon-mahasiswa'),
  async stats(gelombangId?: number | ''): Promise<CalonMahasiswaStats> {
    const { data } = await http.get<ApiResponse<CalonMahasiswaStats>>('/calon-mahasiswa/stats', {
      params: gelombangId ? { gelombangId } : undefined,
    });
    return data.data;
  },
};

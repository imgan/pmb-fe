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

/** Popup Data Pendidikan: isian selain asal sekolah hanya bila peserta tertaut sudah punya biodata. */
export interface PendidikanPayload {
  asalSekolah: string;
  jurusanSekolah?: string | null;
  tahunLulus?: string | null;
  jenisPengelolaanSekolah?: string | null;
  alamatSekolah?: string | null;
  nisn?: string | null;
}

/** Popup Sumber Informasi 2: beasiswaId kosong = Pembiayaan Mandiri. */
export interface DataPmbPayload {
  golonganKelasId: number | null;
  beasiswaId: number | null;
  ukuranAlmamater: string | null;
  gelombangId: number | null;
  jurusan1Id: number | null;
  jurusan2Id: number | null;
  jurusan3Id: number | null;
}

export const calonMahasiswaApi = {
  ...createCrudApi<CalonMahasiswa, CalonMahasiswaPayload, Partial<CalonMahasiswaPayload>>('calon-mahasiswa'),
  async savePendidikan(id: number, payload: PendidikanPayload): Promise<CalonMahasiswa> {
    const { data } = await http.put<ApiResponse<CalonMahasiswa>>(`/calon-mahasiswa/${id}/pendidikan`, payload);
    return data.data;
  },
  async saveSumberInformasi(id: number, payload: { sumberInformasiId: number | null; keteranganSumber: string | null; kodeUnik: string | null }): Promise<CalonMahasiswa> {
    const { data } = await http.put<ApiResponse<CalonMahasiswa>>(`/calon-mahasiswa/${id}/sumber-informasi`, payload);
    return data.data;
  },
  async kunciSumber(id: number, terkunci: boolean): Promise<CalonMahasiswa> {
    const { data } = await http.patch<ApiResponse<CalonMahasiswa>>(`/calon-mahasiswa/${id}/sumber-informasi/kunci`, { terkunci });
    return data.data;
  },
  async saveDataPmb(id: number, payload: DataPmbPayload): Promise<CalonMahasiswa> {
    const { data } = await http.put<ApiResponse<CalonMahasiswa>>(`/calon-mahasiswa/${id}/data-pmb`, payload);
    return data.data;
  },
  async kunciDataPmb(id: number, terkunci: boolean): Promise<CalonMahasiswa> {
    const { data } = await http.patch<ApiResponse<CalonMahasiswa>>(`/calon-mahasiswa/${id}/data-pmb/kunci`, { terkunci });
    return data.data;
  },
  async stats(gelombangId?: number | ''): Promise<CalonMahasiswaStats> {
    const { data } = await http.get<ApiResponse<CalonMahasiswaStats>>('/calon-mahasiswa/stats', {
      params: gelombangId ? { gelombangId } : undefined,
    });
    return data.data;
  },
};

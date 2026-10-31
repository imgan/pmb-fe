import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { Dosen, Mahasiswa } from '@/types/entities';

export interface NilaiMagang {
  id: number;
  mahasiswaId: number;
  mahasiswa?: (Pick<Mahasiswa, 'id' | 'nim' | 'namaLengkap'> & { jurusan?: { id: number; namaJurusan: string } | null }) | null;
  tahunAjaranId: number | null;
  tahunAjaran?: { id: number; nama: string } | null;
  semester: number | null;
  judul: string;
  lokasi: string;
  alamatLokasi: string | null;
  emailPerusahaan: string | null;
  teleponPerusahaan: string | null;
  pembimbingLapangan: string | null;
  pembimbingMagangId: number | null;
  pembimbingMagang?: { id: number; dosen?: Pick<Dosen, 'id' | 'namaLengkap' | 'nidn'> | null } | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  nilai: number | null;
  grade: string | null;
  keterangan: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface NilaiMagangPayload {
  mahasiswaId: number;
  tahunAjaranId?: number | null;
  semester?: number | null;
  judul: string;
  lokasi: string;
  alamatLokasi?: string | null;
  emailPerusahaan?: string | null;
  teleponPerusahaan?: string | null;
  pembimbingLapangan?: string | null;
  pembimbingMagangId?: number | null;
  tanggalMulai?: string | null;
  tanggalSelesai?: string | null;
  nilai?: number | null;
  keterangan?: string | null;
}

const baseApi = createCrudApi<NilaiMagang, NilaiMagangPayload, Partial<NilaiMagangPayload>>('prodi/nilai-magang');

export const nilaiMagangApi = {
  ...baseApi,
  /** Judul & dosen pembimbing dari Bimbingan Magang untuk mengisi form otomatis. */
  async prefill(mahasiswaId: number): Promise<{ judul: string | null; pembimbingMagangId: number | null }> {
    const { data } = await http.get<ApiResponse<{ judul: string | null; pembimbingMagangId: number | null }>>(
      `/prodi/nilai-magang/prefill/${mahasiswaId}`
    );
    return data.data;
  },
};

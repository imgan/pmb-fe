import { http } from './http';
import type { ApiResponse } from '@/types/common';

/** Setting Program Studi per periode — KRS & Validasi, KHS & Nilai, Ujian, Lain-lain. */
export interface SettingProdiIsian {
  kurikulumMahasiswaBaruId: number | null;
  // KRS & Validasi
  bukaKrs: boolean;
  tanggalAwalKrs: string | null;
  tanggalAkhirKrs: string | null;
  tanggalAwalPerubahanKrs: string | null;
  tanggalAkhirPerubahanKrs: string | null;
  wajibValidasiPa: boolean;
  cekTagihanKrs: boolean;
  maksSks: number | null;
  // KHS & Nilai
  bukaKhs: boolean;
  tanggalAwalKhs: string | null;
  tanggalAkhirKhs: string | null;
  tanggalCetakKhs: string | null;
  bukaPengisianNilai: boolean;
  dosenIsiPersentaseKomponen: boolean;
  tanggalAwalPengisianNilai: string | null;
  tanggalAkhirPengisianNilai: string | null;
  // Ujian
  bukaCetakKartuUjian: boolean;
  cekTagihanUjian: boolean;
  minKehadiranUts: number | null;
  minKehadiranUas: number | null;
  // Lain-lain
  keterangan: string | null;
}

export interface SettingProdi extends SettingProdiIsian {
  id: number;
  jurusanId: number;
  tahunAjaranId: number;
  jurusan: { id: number; namaJurusan: string; kodeProdi: string | null; jenjangPendidikan: string | null } | null;
  tahunAjaran: { id: number; nama: string; jenisSemester: string; tahunMulai: number; isActive: boolean } | null;
  kurikulumMahasiswaBaru: { id: number; nama: string; tahunKurikulum: number | null } | null;
  updatedAt: string;
}

export interface SettingProdiDetail extends SettingProdi {
  kurikulumOptions: { id: number; nama: string; tahunKurikulum: number | null; isActive: boolean }[];
}

export const settingProdiApi = {
  async list(): Promise<SettingProdi[]> {
    const { data } = await http.get<ApiResponse<SettingProdi[]>>('/prodi/setting');
    return data.data;
  },
  async detail(id: number | string): Promise<SettingProdiDetail> {
    const { data } = await http.get<ApiResponse<SettingProdiDetail>>(`/prodi/setting/${id}`);
    return data.data;
  },
  async create(payload: { jurusanId: number; tahunAjaranId: number }): Promise<SettingProdi> {
    const { data } = await http.post<ApiResponse<SettingProdi>>('/prodi/setting', payload);
    return data.data;
  },
  async update(id: number, payload: SettingProdiIsian): Promise<string> {
    const { data } = await http.put<ApiResponse<SettingProdi>>(`/prodi/setting/${id}`, payload);
    return data.message;
  },
  async remove(id: number) {
    await http.delete(`/prodi/setting/${id}`);
  },
};

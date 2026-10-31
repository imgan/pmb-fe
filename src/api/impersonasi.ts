import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { AcademicContext, Dosen, Mahasiswa, User } from '@/types/entities';

export type ImpersonasiTipe = 'staff' | 'dosen' | 'mahasiswa';

export interface ImpersonasiAkun {
  id: number;
  isActive: boolean;
  email?: string | null;
  // staff
  name?: string;
  username?: string;
  kodeProdi?: string | null;
  lastLoginAt?: string | null;
  role?: { id: number; code: string; name: string } | null;
  // dosen
  nik?: string | null;
  nidn?: string;
  gelar?: string | null;
  // mahasiswa
  nim?: string;
  namaLengkap?: string;
  tahunMasuk?: number;
  jurusan?: { id: number; namaJurusan: string } | null;
}

export interface ImpersonasiStaffResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  context: AcademicContext;
}
export interface ImpersonasiDosenResult {
  dosen: Dosen;
  accessToken: string;
}
export interface ImpersonasiMahasiswaResult {
  mahasiswa: Mahasiswa;
  accessToken: string;
}

export const impersonasiApi = {
  async list(tipe: ImpersonasiTipe, query: ListQuery = {}): Promise<ListResult<ImpersonasiAkun>> {
    const { data } = await http.get<ApiResponse<ImpersonasiAkun[]> & { meta: ListResult<ImpersonasiAkun>['meta'] }>(`/impersonasi/${tipe}`, {
      params: query,
    });
    return { data: data.data, meta: data.meta };
  },
  async staff(id: number): Promise<ImpersonasiStaffResult> {
    const { data } = await http.post<ApiResponse<ImpersonasiStaffResult>>(`/impersonasi/staff/${id}`);
    return data.data;
  },
  async dosen(id: number): Promise<ImpersonasiDosenResult> {
    const { data } = await http.post<ApiResponse<ImpersonasiDosenResult>>(`/impersonasi/dosen/${id}`);
    return data.data;
  },
  async mahasiswa(id: number): Promise<ImpersonasiMahasiswaResult> {
    const { data } = await http.post<ApiResponse<ImpersonasiMahasiswaResult>>(`/impersonasi/mahasiswa/${id}`);
    return data.data;
  },
};

import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type {
  Beasiswa,
  BiayaKuliah,
  CalonMahasiswa,
  CalonMahasiswaStats,
  Gelombang,
  GolonganKelas,
  HomeImage,
  Jurusan,
  Kampus,
  Menu,
  SumberInformasi,
} from '@/types/entities';

export const publicApi = {
  async golonganKelas(): Promise<GolonganKelas[]> {
    const { data } = await http.get<ApiResponse<GolonganKelas[]>>('/public/golongan-kelas');
    return data.data;
  },
  async jurusan(golonganKelasId?: number): Promise<Jurusan[]> {
    const { data } = await http.get<ApiResponse<Jurusan[]>>('/public/jurusan', { params: { golonganKelasId } });
    return data.data;
  },
  async activeGelombang(): Promise<Gelombang | null> {
    const { data } = await http.get<ApiResponse<Gelombang | null>>('/public/gelombang/active');
    return data.data;
  },
  async menus(): Promise<Menu[]> {
    const { data } = await http.get<ApiResponse<Menu[]>>('/public/menus');
    return data.data;
  },
  async kampus(): Promise<Kampus | null> {
    const { data } = await http.get<ApiResponse<Kampus | null>>('/public/kampus');
    return data.data;
  },
  async beasiswaList(): Promise<Beasiswa[]> {
    const { data } = await http.get<ApiResponse<Beasiswa[]>>('/public/beasiswa');
    return data.data;
  },
  async sumberInformasi(): Promise<SumberInformasi[]> {
    const { data } = await http.get<ApiResponse<SumberInformasi[]>>('/public/sumber-informasi');
    return data.data;
  },
  async beasiswaDetail(slug: string): Promise<Beasiswa> {
    const { data } = await http.get<ApiResponse<Beasiswa>>(`/public/beasiswa/${slug}`);
    return data.data;
  },
  async biayaKuliahList(): Promise<BiayaKuliah[]> {
    const { data } = await http.get<ApiResponse<BiayaKuliah[]>>('/public/biaya-kuliah');
    return data.data;
  },
  async biayaKuliahDetail(slug: string): Promise<BiayaKuliah> {
    const { data } = await http.get<ApiResponse<BiayaKuliah>>(`/public/biaya-kuliah/${slug}`);
    return data.data;
  },
  async calonMahasiswa(query?: ListQuery): Promise<ListResult<CalonMahasiswa>> {
    const { data } = await http.get<ApiResponse<CalonMahasiswa[]> & { meta: ListResult<CalonMahasiswa>['meta'] }>(
      '/public/calon-mahasiswa',
      { params: query }
    );
    return { data: data.data, meta: data.meta };
  },
  async calonMahasiswaStats(): Promise<CalonMahasiswaStats> {
    const { data } = await http.get<ApiResponse<CalonMahasiswaStats>>('/public/calon-mahasiswa/stats');
    return data.data;
  },
  async homeImages(): Promise<HomeImage | null> {
    const { data } = await http.get<ApiResponse<HomeImage | null>>('/public/home-images');
    return data.data;
  },
};

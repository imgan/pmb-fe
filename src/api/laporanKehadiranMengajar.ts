import { http } from './http';

export const laporanKehadiranMengajarApi = {
  async templateKehadiranPdf(jadwalKuliahId: number | string): Promise<Blob> {
    const { data } = await http.get(`/laporan/kehadiran-mengajar/${jadwalKuliahId}/template-kehadiran/pdf`, {
      responseType: 'blob',
    });
    return data;
  },
  async templateRealisasiPdf(jadwalKuliahId: number | string): Promise<Blob> {
    const { data } = await http.get(`/laporan/kehadiran-mengajar/${jadwalKuliahId}/template-realisasi/pdf`, {
      responseType: 'blob',
    });
    return data;
  },
};

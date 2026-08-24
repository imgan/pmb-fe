import { http } from './http';

export type ShiftKerja = 'SHIFT_1' | 'SHIFT_2' | 'SHIFT_3';

export interface ReportFingerQuery {
  karyawanId: number | string;
  periodeAwal: string;
  periodeAkhir: string;
  shift: ShiftKerja;
}

export const reportFingerApi = {
  async cetakPdf(query: ReportFingerQuery): Promise<Blob> {
    const { data } = await http.get('/report-finger/pdf', { params: query, responseType: 'blob' });
    return data;
  },
};

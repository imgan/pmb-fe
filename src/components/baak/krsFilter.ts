/** Model & helper panel filter KRS Mahasiswa (lihat KrsFilterPanel.vue). */
export interface KrsFilter {
  tahunAjaranId: number | '';
  kodeProdi: string;
  statusPa: '' | 'ADA' | 'BELUM';
  status: string;
  tahunMasuk: number | '';
  golonganKelasId: number | '';
  semester: number | '';
  statusData: '' | 'AKTIF' | 'CUTI' | 'TIDAK_AKTIF';
}

export const emptyKrsFilter = (): KrsFilter => ({
  tahunAjaranId: '',
  kodeProdi: '',
  statusPa: '',
  status: '',
  tahunMasuk: '',
  golonganKelasId: '',
  semester: '',
  statusData: '',
});

/** Query API dari filter (nilai kosong dibuang). */
export const krsFilterQuery = (f: KrsFilter) => ({
  tahunAjaranId: f.tahunAjaranId || undefined,
  kodeProdi: f.kodeProdi || undefined,
  statusPa: f.statusPa || undefined,
  status: f.status || undefined,
  // Semua Status mencakup mahasiswa yang belum mengisi KRS.
  sertakanBelumIsi: f.status ? undefined : true,
  tahunMasuk: f.tahunMasuk || undefined,
  golonganKelasId: f.golonganKelasId || undefined,
  semester: f.semester || undefined,
  statusData: f.statusData || undefined,
});

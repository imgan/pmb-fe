import type { SelectOption } from '@/components/ui/SelectInput.vue';

type TahunAjaranLike = { nama: string; jenisSemester?: string | null };

/** Label tahun ajaran lengkap dengan semesternya, mis. "2026/2027 GANJIL". */
export const formatTahunAjaran = (
  tahunAjaran: TahunAjaranLike | null | undefined,
  jenisSemester: string | null | undefined = tahunAjaran?.jenisSemester
): string => {
  if (!tahunAjaran?.nama) return '-';
  return jenisSemester ? `${tahunAjaran.nama} ${jenisSemester}` : tahunAjaran.nama;
};

/**
 * Combo box tahun ajaran hanya berisi tahun ajaran AKTIF. Saat mengubah data lama yang tahun
 * ajarannya sudah nonaktif, tahun ajaran itu tetap ditambahkan (bertanda "nonaktif") supaya
 * nilainya tidak tampil kosong dan tidak hilang tanpa sengaja.
 */
export const withCurrentTahunAjaran = (
  activeOptions: SelectOption[],
  current: ({ id: number } & TahunAjaranLike) | null | undefined
): SelectOption[] => {
  if (!current || activeOptions.some((o) => `${o.value}` === `${current.id}`)) return activeOptions;
  return [...activeOptions, { value: current.id, label: `${formatTahunAjaran(current)} (nonaktif)` }];
};

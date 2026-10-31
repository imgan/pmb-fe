import type { SelectOption } from '@/components/ui/SelectInput.vue';

export const UKURAN_ALMAMATER = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

/** Pilihan ukuran almamater; nilai lama yang bukan ukuran tetap ditampilkan supaya tidak hilang diam-diam. */
export const ukuranAlmamaterOptions = (current?: string | null): SelectOption[] => {
  const options: SelectOption[] = UKURAN_ALMAMATER.map((u) => ({ value: u, label: u }));
  const nilai = (current ?? '').trim();
  if (nilai && !UKURAN_ALMAMATER.includes(nilai.toUpperCase() as (typeof UKURAN_ALMAMATER)[number])) {
    options.push({ value: nilai, label: `${nilai} (data lama — pilih ukuran)` });
  }
  return options;
};

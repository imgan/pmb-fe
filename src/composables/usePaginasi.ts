import { computed, ref, watch, type Ref } from 'vue';
import type { PagingMeta } from '@/types/common';

/**
 * Paginasi sisi klien untuk daftar yang sudah dimuat utuh (halaman konsol LMS): `halaman` = baris halaman aktif,
 * `meta` untuk <Pagination>. Kembali ke halaman 1 saat data (filter/pencarian) atau jumlah baris per halaman berubah.
 */
export function usePaginasi<T>(rows: Ref<T[]>, awal = 10) {
  const page = ref(1);
  const limit = ref(awal);
  const meta = computed<PagingMeta>(() => {
    const total = rows.value.length;
    return { page: page.value, limit: limit.value, total, totalPages: Math.max(1, Math.ceil(total / limit.value)) };
  });
  const halaman = computed(() => rows.value.slice((page.value - 1) * limit.value, page.value * limit.value));
  watch([rows, limit], () => {
    page.value = 1;
  });
  return { page, limit, meta, halaman };
}

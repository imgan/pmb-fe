import { reactive, ref, watch, type Ref } from 'vue';
import { lmsConsoleApi, type LmsFilter, type LmsOpsi } from '@/api/lmsConsole';
import { extractErrorMessage } from '@/api/http';

/**
 * Filter bersama halaman konsol LMS: tahun akademik (default tahun ajaran aktif) & prodi. Disimpan di level modul
 * supaya pilihan tetap sama saat berpindah menu LMS.
 */
const opsi = ref<LmsOpsi | null>(null);
const filter = reactive<{ tahunAjaranId: number | ''; kodeProdi: string }>({ tahunAjaranId: '', kodeProdi: '' });
let memuat: Promise<void> | null = null;

export function useLmsFilter() {
  if (!memuat) {
    memuat = lmsConsoleApi
      .opsi()
      .then((o) => {
        opsi.value = o;
        if (!filter.tahunAjaranId) filter.tahunAjaranId = o.tahunAkademik.find((t) => t.isActive)?.id ?? o.tahunAkademik[0]?.id ?? '';
      })
      .catch(() => {
        memuat = null;
      });
  }
  return { opsi, filter, siap: memuat ?? Promise.resolve() };
}

/**
 * Data halaman LMS yang dimuat ulang saat filter (tahun akademik, prodi) atau filter tambahan halaman berubah.
 * `tambahan()` = nilai filter lain (search, status, ...); perubahan search ditunda 300 ms.
 */
export function useLmsData<T>(ambil: (f: LmsFilter) => Promise<T>, tambahan: () => LmsFilter = () => ({}), pesanGagal = 'Gagal memuat data') {
  const { filter, siap } = useLmsFilter();
  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(false);
  const error = ref<string | null>(null);
  const muat = async () => {
    loading.value = true;
    error.value = null;
    try {
      data.value = await ambil({ tahunAjaranId: filter.tahunAjaranId, kodeProdi: filter.kodeProdi, ...tambahan() });
    } catch (err) {
      error.value = extractErrorMessage(err, pesanGagal);
    } finally {
      loading.value = false;
    }
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(
    () => [filter.tahunAjaranId, filter.kodeProdi, JSON.stringify(tambahan())],
    (baru, lama) => {
      clearTimeout(timer);
      const hanyaCari = baru[0] === lama?.[0] && baru[1] === lama?.[1];
      timer = setTimeout(muat, hanyaCari ? 300 : 0);
    }
  );
  siap.then(() => {
    if (!data.value && !loading.value) muat();
  });
  return { data, loading, error, muat, filter };
}

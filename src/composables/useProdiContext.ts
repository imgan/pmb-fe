import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

/**
 * Konteks sesi untuk halaman modul Prodi. Bila prodi sudah dipilih saat login (atau akun terkunci
 * ke prodinya), filter prodi di halaman dikunci — backend membatasi data lewat header
 * X-Kode-Prodi. Ganti prodi/tahun lewat kartu konteks di sidebar.
 */
export function useProdiContext() {
  const authStore = useAuthStore();
  const prodi = computed(() => authStore.context.prodi);
  const prodiLocked = computed(() => !!authStore.context.prodi);
  const prodiPlaceholder = (fallback: string) => authStore.context.prodi?.nama ?? fallback;
  /** Tahun akademik acuan sesi, untuk nilai awal filter tahun ajaran. */
  const tahunAjaranId = authStore.context.tahunAkademik?.id ?? null;
  /** Id jurusan awal untuk form tambah data (mis. kurikulum) saat prodi sudah dipilih. */
  const defaultJurusanId = authStore.context.prodi?.jurusanIds[0] ?? null;
  return { prodi, prodiLocked, prodiPlaceholder, tahunAjaranId, defaultJurusanId, isProdiScoped: computed(() => authStore.isProdiScoped) };
}

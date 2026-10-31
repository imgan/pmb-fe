<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import ElearningShell from '@/components/elearning/ElearningShell.vue';
import AppButton from '@/components/ui/AppButton.vue';
import MataKuliahIlustrasi from '@/components/elearning/MataKuliahIlustrasi.vue';
import { dosenElearningApi, type ElearningKelas, type LaporanTugasKelas } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import { downloadBlob } from '@/utils/download';
import { formatDateTime } from '@/utils/format';
import { toastError } from '@/utils/swal';

/**
 * Portal Dosen → E-learning → Laporan Tugas: pilih kelas, lihat ringkasan pengumpulan tiap tugas, lalu unduh Excel
 * (semua tugas: sheet Rekap Nilai + detail per tugas; atau satu tugas saja).
 */
const route = useRoute();
const router = useRouter();
const kelas = ref<ElearningKelas[]>([]);
const kelasId = ref<number | ''>('');
const data = ref<LaporanTugasKelas | null>(null);
const loadingKelas = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
// Tombol yang sedang mengunduh: 'semua' atau id tugas.
const mengunduh = ref<'semua' | number | null>(null);

const kelasTerpilih = computed(() => kelas.value.find((k) => k.id === kelasId.value) ?? null);

onMounted(async () => {
  loadingKelas.value = true;
  try {
    kelas.value = await dosenElearningApi.kelas();
    const dariQuery = Number(route.query.kelas);
    kelasId.value = kelas.value.some((k) => k.id === dariQuery) ? dariQuery : (kelas.value[0]?.id ?? '');
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kelas');
  } finally {
    loadingKelas.value = false;
  }
});

watch(kelasId, async (id) => {
  data.value = null;
  if (!id) return;
  router.replace({ query: { ...route.query, kelas: String(id) } });
  loading.value = true;
  error.value = null;
  try {
    data.value = await dosenElearningApi.laporanTugas(id);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat laporan tugas');
  } finally {
    loading.value = false;
  }
});

const aman = (t: string) => t.replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
const unduh = async (kontenId: number | null = null, judul = '') => {
  if (!data.value) return;
  const k = data.value.kelas;
  mengunduh.value = kontenId ?? 'semua';
  try {
    const blob = await dosenElearningApi.exportLaporanTugas(k.id, kontenId);
    const dasar = `${aman(k.kodeMataKuliah)}-${aman(k.kelas)}`;
    downloadBlob(blob, kontenId ? `laporan-tugas-${aman(judul).slice(0, 40)}-${dasar}.xlsx` : `laporan-tugas-${dasar}.xlsx`);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengunduh laporan'));
  } finally {
    mengunduh.value = null;
  }
};

const total = computed(() => {
  const t = data.value?.tugas ?? [];
  return { tugas: t.length, dikumpulkan: t.reduce((s, x) => s + x.dikumpulkan, 0), penerima: t.reduce((s, x) => s + x.penerima, 0), dinilai: t.reduce((s, x) => s + x.dinilai, 0) };
});
const persen = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
</script>

<template>
  <div>
    <PageHeader title="Laporan Tugas" subtitle="Rekap pengumpulan & nilai tugas per kelas — unduh dalam format Excel." />
    <ElearningShell>
      <div class="space-y-4">
        <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

        <!-- Pilih kelas -->
        <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 flex flex-wrap items-center gap-4">
          <MataKuliahIlustrasi v-if="kelasTerpilih" :nama="kelasTerpilih.namaMataKuliah" :kode="kelasTerpilih.kodeMataKuliah" :ikon="kelasTerpilih.ikon" ukuran="sm" />
          <label class="flex-1 min-w-[16rem]">
            <span class="block text-label-md font-medium text-on-surface mb-1">Kelas</span>
            <select
              v-model="kelasId"
              class="w-full px-3 py-2 border border-outline-variant rounded-md text-body-sm bg-surface-container-lowest"
              :disabled="loadingKelas || !kelas.length"
            >
              <option v-if="!kelas.length" value="">{{ loadingKelas ? 'Memuat...' : 'Belum ada kelas yang diampu' }}</option>
              <option v-for="k in kelas" :key="k.id" :value="k.id">{{ k.namaMataKuliah }} ({{ k.kodeMataKuliah }}) · Kelas {{ k.kelas }}</option>
            </select>
          </label>
          <AppButton icon="download" :disabled="!data || !data.tugas.length || mengunduh !== null" @click="unduh()">
            {{ mengunduh === 'semua' ? 'Mengunduh...' : 'Download Semua Tugas (Excel)' }}
          </AppButton>
        </div>

        <!-- Ringkasan -->
        <div v-if="data && data.tugas.length" class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
            <p class="text-label-sm text-on-surface-variant">Jumlah tugas</p>
            <p class="text-headline-sm font-bold text-on-surface">{{ total.tugas }}</p>
          </div>
          <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
            <p class="text-label-sm text-on-surface-variant">Pengumpulan</p>
            <p class="text-headline-sm font-bold text-on-surface">{{ total.dikumpulkan }}<span class="text-body-sm font-normal text-on-surface-variant"> / {{ total.penerima }}</span></p>
          </div>
          <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
            <p class="text-label-sm text-on-surface-variant">Sudah dinilai</p>
            <p class="text-headline-sm font-bold text-on-surface">{{ total.dinilai }}<span class="text-body-sm font-normal text-on-surface-variant"> / {{ total.dikumpulkan }}</span></p>
          </div>
          <div class="rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
            <p class="text-label-sm text-on-surface-variant">Tingkat pengumpulan</p>
            <p class="text-headline-sm font-bold text-on-surface">{{ persen(total.dikumpulkan, total.penerima) }}%</p>
          </div>
        </div>

        <!-- Daftar tugas -->
        <div class="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
          <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat...</div>
          <div v-else-if="!data" class="p-8 text-center text-body-sm text-on-surface-variant">Pilih kelas untuk melihat laporan tugas.</div>
          <div v-else-if="!data.tugas.length" class="p-10 flex flex-col items-center gap-2 text-center text-on-surface-variant">
            <span class="material-symbols-outlined text-primary" style="font-size: 40px">assignment</span>
            <p class="text-body-sm">Belum ada tugas di kelas ini.</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-body-sm">
              <thead class="bg-surface-container text-on-surface-variant text-label-md">
                <tr>
                  <th class="p-2.5 text-left w-10">#</th>
                  <th class="p-2.5 text-left">Tugas</th>
                  <th class="p-2.5 text-left whitespace-nowrap">Tenggat</th>
                  <th class="p-2.5 text-center">Dikumpulkan</th>
                  <th class="p-2.5 text-center">Terlambat</th>
                  <th class="p-2.5 text-center">Dinilai</th>
                  <th class="p-2.5 text-center whitespace-nowrap">Rata-rata</th>
                  <th class="p-2.5 text-right">Excel</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                <tr v-for="(t, i) in data.tugas" :key="t.id" class="hover:bg-surface-container/50">
                  <td class="p-2.5 text-on-surface-variant">T{{ i + 1 }}</td>
                  <td class="p-2.5">
                    <p class="font-medium text-on-surface">{{ t.judul }}</p>
                    <div class="flex flex-wrap gap-1.5 mt-0.5 text-label-sm">
                      <span v-if="t.pertemuanKe" class="text-on-surface-variant">Pertemuan {{ t.pertemuanKe }}</span>
                      <span v-if="t.target === 'GRUP'" class="px-1.5 rounded bg-[#7c3aed]/12 text-[#5b21b6]">Grup</span>
                      <span v-if="t.target === 'KAMPUS'" class="px-1.5 rounded bg-[#0284c7]/12 text-[#075985]">Kampus</span>
                      <span v-if="!t.isPublished" class="px-1.5 rounded bg-surface-container text-on-surface-variant">Draf</span>
                    </div>
                  </td>
                  <td class="p-2.5 whitespace-nowrap text-on-surface-variant">{{ t.tenggat ? formatDateTime(t.tenggat) : '-' }}</td>
                  <td class="p-2.5 text-center">
                    <span class="font-semibold">{{ t.dikumpulkan }}</span><span class="text-on-surface-variant"> / {{ t.penerima }}</span>
                    <div class="mt-1 h-1 rounded-full bg-surface-container overflow-hidden w-20 mx-auto">
                      <div class="h-full bg-primary" :style="{ width: `${persen(t.dikumpulkan, t.penerima)}%` }" />
                    </div>
                  </td>
                  <td class="p-2.5 text-center" :class="t.terlambat ? 'text-[#7a5200] font-medium' : 'text-on-surface-variant'">{{ t.terlambat }}</td>
                  <td class="p-2.5 text-center">{{ t.dinilai }}</td>
                  <td class="p-2.5 text-center font-semibold">{{ t.rataNilai ?? '-' }}</td>
                  <td class="p-2.5 text-right">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-outline-variant text-label-md text-primary hover:bg-primary-container/40 disabled:opacity-50"
                      :disabled="mengunduh !== null"
                      :title="`Unduh laporan ${t.judul}`"
                      @click="unduh(t.id, t.judul)"
                    >
                      <span class="material-symbols-outlined" style="font-size: 18px">download</span>
                      {{ mengunduh === t.id ? '...' : 'Download' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <p v-if="data && data.tugas.length" class="text-label-sm text-on-surface-variant">
          File Excel "semua tugas" berisi sheet <strong>Rekap Nilai</strong> (mahasiswa × tugas) dan satu sheet detail per tugas: status, waktu kumpul, jawaban, file,
          nilai & catatan (tugas grup: nama grup & siapa yang mengunggah).
        </p>
      </div>
    </ElearningShell>
  </div>
</template>

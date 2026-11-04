<script setup lang="ts">
import { onMounted, ref } from 'vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import HorizontalBarChart from '@/components/charts/HorizontalBarChart.vue';
import DonutChart from '@/components/charts/DonutChart.vue';
import LineChart from '@/components/charts/LineChart.vue';
import VerticalBarChart from '@/components/charts/VerticalBarChart.vue';
import StatistikAkmPanel from '@/components/baak/StatistikAkmPanel.vue';
import { mahasiswaApi } from '@/api/mahasiswa';
import { statistikAkmApi } from '@/api/statistikAkm';
import { dosenApi } from '@/api/dosen';
import { nilaiMahasiswaApi } from '@/api/nilaiMahasiswa';
import { kehadiranDosenApi } from '@/api/kehadiranDosen';
import { formatDate } from '@/utils/format';
import type {
  DosenStatItem,
  EligibleSummaryItem,
  KehadiranStatusSummaryItem,
  Mahasiswa,
  SemesterSummaryItem,
} from '@/types/entities';

const loading = ref(true);
const totalMahasiswa = ref(0);
const totalAktif = ref(0);
const eligibleSummary = ref<EligibleSummaryItem[]>([]);
const recentMahasiswa = ref<Mahasiswa[]>([]);
const dosenStats = ref<DosenStatItem[]>([]);
const semesterSummary = ref<SemesterSummaryItem[]>([]);
const kehadiranSummary = ref<KehadiranStatusSummaryItem[]>([]);

const KELOMPOK_LABEL: Record<string, string> = { FKF: 'FKF', FTID: 'FTID', FIP: 'FIP', NON_BASE: 'Non Base' };
const STATUS_LABEL: Record<string, string> = { HADIR: 'Hadir', TIDAK_HADIR: 'Tidak Hadir', IZIN: 'Izin', SAKIT: 'Sakit' };

const columns: DataTableColumn[] = [
  { key: 'nim', label: 'NIM' },
  { key: 'namaLengkap', label: 'Nama' },
  { key: 'jurusan', label: 'Jurusan' },
  { key: 'createdAt', label: 'Terdaftar', align: 'right' },
  { key: 'status', label: 'Status', align: 'center' },
];

const totalEligible = () => eligibleSummary.value.reduce((sum, row) => sum + row.total, 0);

const loadDashboard = async () => {
  loading.value = true;
  try {
    const [mahasiswaResult, summary, dosenStatsResult, semesterResult, kehadiranResult] = await Promise.all([
      mahasiswaApi.list({ limit: 5 }),
      mahasiswaApi.eligibleSummary(),
      dosenApi.stats(),
      nilaiMahasiswaApi.semesterSummary(),
      kehadiranDosenApi.statusSummary(),
    ]);
    totalMahasiswa.value = mahasiswaResult.meta.total;
    recentMahasiswa.value = mahasiswaResult.data;
    eligibleSummary.value = summary;
    dosenStats.value = dosenStatsResult;
    semesterSummary.value = semesterResult;
    kehadiranSummary.value = kehadiranResult;

    // Sama dengan Statistik Mahasiswa di bawahnya: yang belum isi KRS tidak dihitung aktif.
    const { total } = await statistikAkmApi.get();
    totalAktif.value = total.aktif + total.doubleDegree + total.kampusMerdeka;
  } finally {
    loading.value = false;
  }
};

onMounted(loadDashboard);
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Overview BAAK</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Ringkasan data mahasiswa aktif & antrean peserta siap digenerate.</p>
    </header>

    <section class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(27,54,93,0.05)] transition-shadow">
        <div class="flex items-start justify-between mb-4">
          <span class="material-symbols-outlined text-primary filled">school</span>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant mb-1">Total Mahasiswa</p>
          <p class="font-bold text-display-lg text-primary">{{ totalMahasiswa }}</p>
        </div>
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(27,54,93,0.05)] transition-shadow">
        <div class="flex items-start justify-between mb-4">
          <span class="material-symbols-outlined text-[#059669] filled">check_circle</span>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant mb-1">Mahasiswa Aktif</p>
          <p class="font-bold text-display-lg text-primary">{{ totalAktif }}</p>
        </div>
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(27,54,93,0.05)] transition-shadow">
        <div class="flex items-start justify-between mb-4">
          <span class="material-symbols-outlined text-[#d97706] filled">hourglass_top</span>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant mb-1">Peserta Siap Digenerate</p>
          <p class="font-bold text-display-lg text-primary">{{ totalEligible() }}</p>
        </div>
      </div>
    </section>

    <StatistikAkmPanel />

    <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <h2 class="font-semibold text-headline-md text-on-surface mb-1">Peserta Lulus per Jurusan</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">Belum digenerate menjadi mahasiswa (NIM).</p>
        <div v-if="loading" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Memuat grafik...
        </div>
        <div v-else-if="eligibleSummary.length === 0" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Tidak ada antrean peserta
        </div>
        <HorizontalBarChart
          v-else
          :data="eligibleSummary.map((row) => ({ label: row.namaJurusan, value: row.total }))"
        />
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden lg:col-span-1">
        <div class="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
          <h2 class="font-semibold text-headline-md text-on-surface">Mahasiswa Terbaru</h2>
        </div>
        <DataTable :columns="columns" :items="recentMahasiswa" :loading="loading" :show-actions="false" empty-message="Belum ada mahasiswa">
          <template #cell-jurusan="{ item }">{{ item.jurusan?.namaJurusan ?? '-' }}</template>
          <template #cell-createdAt="{ item }">
            <span class="tabular-nums">{{ formatDate(item.createdAt) }}</span>
          </template>
          <template #cell-status="{ item }">
            <StatusBadge :variant="item.isActive ? 'success' : 'neutral'" :label="item.isActive ? 'Aktif' : 'Non-aktif'" />
          </template>
        </DataTable>
      </div>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <h2 class="font-semibold text-headline-md text-on-surface mb-1">Dosen per Kelompok Fakultas</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">Distribusi dosen aktif berdasarkan kelompok.</p>
        <div v-if="loading" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Memuat grafik...
        </div>
        <div v-else-if="dosenStats.length === 0" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Belum ada data dosen
        </div>
        <DonutChart
          v-else
          :data="dosenStats.map((row) => ({ label: KELOMPOK_LABEL[row.kelompokFakultas] ?? row.kelompokFakultas, value: row.total }))"
        />
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <h2 class="font-semibold text-headline-md text-on-surface mb-1">Rata-rata Nilai per Semester</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">Tren nilai akhir seluruh mahasiswa.</p>
        <div v-if="loading" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Memuat grafik...
        </div>
        <div v-else-if="semesterSummary.length === 0" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Belum ada data nilai
        </div>
        <LineChart
          v-else
          :data="semesterSummary.map((row) => ({ label: `Sem ${row.semester}`, value: row.rataRata }))"
        />
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <h2 class="font-semibold text-headline-md text-on-surface mb-1">Kehadiran Dosen per Status</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">Realisasi mengajar berdasarkan status.</p>
        <div v-if="loading" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Memuat grafik...
        </div>
        <div v-else-if="kehadiranSummary.length === 0" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Belum ada data kehadiran
        </div>
        <VerticalBarChart
          v-else
          :data="kehadiranSummary.map((row) => ({ label: STATUS_LABEL[row.status] ?? row.status, value: row.total }))"
          color="#1baf7a"
        />
      </div>
    </section>
  </div>
</template>

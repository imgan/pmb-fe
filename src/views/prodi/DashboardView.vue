<script setup lang="ts">
import { onMounted, ref } from 'vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import DonutChart from '@/components/charts/DonutChart.vue';
import LineChart from '@/components/charts/LineChart.vue';
import { mahasiswaApi } from '@/api/mahasiswa';
import { dosenApi } from '@/api/dosen';
import { nilaiMahasiswaApi } from '@/api/nilaiMahasiswa';
import { yudisiumApi } from '@/api/yudisium';
import { jadwalSidangApi } from '@/api/jadwalSidang';
import { formatDate } from '@/utils/format';
import type { DosenStatItem, JadwalSidang, SemesterSummaryItem, Yudisium } from '@/types/entities';

const loading = ref(true);
const totalMahasiswaAktif = ref(0);
const totalMahasiswaCuti = ref(0);
const totalDosen = ref(0);
const totalYudisium = ref(0);
const dosenStats = ref<DosenStatItem[]>([]);
const semesterSummary = ref<SemesterSummaryItem[]>([]);
const jadwalSidangTerdekat = ref<JadwalSidang[]>([]);
const yudisiumTerbaru = ref<Yudisium[]>([]);

const KELOMPOK_LABEL: Record<string, string> = { FKF: 'FKF', FTID: 'FTID', FIP: 'FIP', NON_BASE: 'Non Base' };

const jadwalSidangColumns: DataTableColumn[] = [
  { key: 'tanggal', label: 'Tanggal' },
  { key: 'jam', label: 'Jam' },
  { key: 'jurusan', label: 'Jurusan' },
  { key: 'ruangan', label: 'Ruangan' },
];

const yudisiumColumns: DataTableColumn[] = [
  { key: 'mahasiswa', label: 'Mahasiswa' },
  { key: 'tanggalYudisium', label: 'Tanggal Yudisium' },
  { key: 'pin', label: 'PIN' },
];

const loadDashboard = async () => {
  loading.value = true;
  try {
    const [aktifResult, cutiResult, dosenResult, yudisiumResult, dosenStatsResult, semesterResult, jadwalResult, yudisiumRecentResult] =
      await Promise.all([
        mahasiswaApi.list({ limit: 1, isActive: true }),
        mahasiswaApi.list({ limit: 1, statusKeluar: 'CUTI' }),
        dosenApi.list({ limit: 1 }),
        yudisiumApi.list({ limit: 1 }),
        dosenApi.stats(),
        nilaiMahasiswaApi.semesterSummary(),
        jadwalSidangApi.list({ limit: 5 }),
        yudisiumApi.list({ limit: 5, sortBy: 'tanggalYudisium', sortDir: 'desc' }),
      ]);
    totalMahasiswaAktif.value = aktifResult.meta.total;
    totalMahasiswaCuti.value = cutiResult.meta.total;
    totalDosen.value = dosenResult.meta.total;
    totalYudisium.value = yudisiumResult.meta.total;
    dosenStats.value = dosenStatsResult;
    semesterSummary.value = semesterResult;
    jadwalSidangTerdekat.value = jadwalResult.data;
    yudisiumTerbaru.value = yudisiumRecentResult.data;
  } finally {
    loading.value = false;
  }
};

onMounted(loadDashboard);
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Overview Prodi</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Ringkasan data akademik Program Studi.</p>
    </header>

    <section class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(27,54,93,0.05)] transition-shadow">
        <div class="flex items-start justify-between mb-4">
          <span class="material-symbols-outlined text-primary filled">school</span>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant mb-1">Mahasiswa Aktif</p>
          <p class="font-bold text-display-lg text-primary">{{ totalMahasiswaAktif }}</p>
        </div>
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(27,54,93,0.05)] transition-shadow">
        <div class="flex items-start justify-between mb-4">
          <span class="material-symbols-outlined text-[#d97706] filled">pause_circle</span>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant mb-1">Mahasiswa Cuti</p>
          <p class="font-bold text-display-lg text-primary">{{ totalMahasiswaCuti }}</p>
        </div>
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(27,54,93,0.05)] transition-shadow">
        <div class="flex items-start justify-between mb-4">
          <span class="material-symbols-outlined text-[#2563eb] filled">groups</span>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant mb-1">Total Dosen</p>
          <p class="font-bold text-display-lg text-primary">{{ totalDosen }}</p>
        </div>
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(27,54,93,0.05)] transition-shadow">
        <div class="flex items-start justify-between mb-4">
          <span class="material-symbols-outlined text-[#059669] filled">workspace_premium</span>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant mb-1">Mahasiswa Lulus</p>
          <p class="font-bold text-display-lg text-primary">{{ totalYudisium }}</p>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
        <LineChart v-else :data="semesterSummary.map((row) => ({ label: `Sem ${row.semester}`, value: row.rataRata }))" />
      </div>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
          <h2 class="font-semibold text-headline-md text-on-surface">Jadwal Sidang Terbaru</h2>
        </div>
        <DataTable
          :columns="jadwalSidangColumns"
          :items="jadwalSidangTerdekat"
          :loading="loading"
          :show-actions="false"
          empty-message="Belum ada jadwal sidang"
        >
          <template #cell-tanggal="{ item }">{{ formatDate(item.tanggal) }}</template>
          <template #cell-jurusan="{ item }">{{ item.jurusan?.namaJurusan ?? '-' }}</template>
          <template #cell-ruangan="{ item }">{{ item.ruangan ?? '-' }}</template>
        </DataTable>
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
          <h2 class="font-semibold text-headline-md text-on-surface">Yudisium Terbaru</h2>
        </div>
        <DataTable
          :columns="yudisiumColumns"
          :items="yudisiumTerbaru"
          :loading="loading"
          :show-actions="false"
          empty-message="Belum ada data yudisium"
        >
          <template #cell-mahasiswa="{ item }">{{ item.mahasiswa?.namaLengkap ?? '-' }}</template>
          <template #cell-tanggalYudisium="{ item }">{{ item.tanggalYudisium ? formatDate(item.tanggalYudisium) : '-' }}</template>
          <template #cell-pin="{ item }">{{ item.pin ?? '-' }}</template>
        </DataTable>
      </div>
    </section>
  </div>
</template>

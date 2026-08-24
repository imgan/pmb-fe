<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { pesertaApi } from '@/api/peserta';
import { jurusanApi } from '@/api/jurusan';
import { gelombangApi } from '@/api/gelombang';
import { calonMahasiswaApi } from '@/api/calonMahasiswa';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import VerticalBarChart, { type BarDatum } from '@/components/charts/VerticalBarChart.vue';
import HorizontalBarChart from '@/components/charts/HorizontalBarChart.vue';
import DonutChart, { type DonutDatum } from '@/components/charts/DonutChart.vue';
import { formatDate } from '@/utils/format';
import type { Peserta } from '@/types/entities';

const loading = ref(true);
const chartsLoading = ref(true);
const totalPeserta = ref(0);
const totalJurusan = ref(0);
const gelombangAktif = ref(0);
const recentPeserta = ref<Peserta[]>([]);

const trendData = ref<BarDatum[]>([]);
const jurusanData = ref<BarDatum[]>([]);
const golonganKelasData = ref<DonutDatum[]>([]);
const kelulusanData = ref<DonutDatum[]>([]);
const kelulusanLoading = ref(true);

const columns: DataTableColumn[] = [
  { key: 'namaLengkap', label: 'Nama' },
  { key: 'email', label: 'Email' },
  { key: 'jurusan', label: 'Jurusan' },
  { key: 'createdAt', label: 'Tanggal Daftar', align: 'right' },
  { key: 'status', label: 'Status', align: 'center' },
];

const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'short' });

const buildTrend = (peserta: Peserta[]): BarDatum[] => {
  const now = new Date();
  const buckets: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthLabel.format(d) });
  }
  const counts = new Map(buckets.map((b) => [b.key, 0]));
  peserta.forEach((p) => {
    if (!p.createdAt) return;
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return buckets.map((b) => ({ label: b.label, value: counts.get(b.key) ?? 0 }));
};

const buildJurusanRanking = (peserta: Peserta[]): BarDatum[] => {
  const counts = new Map<string, number>();
  peserta.forEach((p) => {
    const name = p.jurusan?.namaJurusan ?? 'Lainnya';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
};

const buildGolonganKelas = (peserta: Peserta[]): DonutDatum[] => {
  const counts = new Map<string, number>();
  peserta.forEach((p) => {
    const name = p.golonganKelas?.namaKelas ?? 'Lainnya';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
};

const loadDashboard = async () => {
  loading.value = true;
  try {
    const [pesertaResult, jurusanResult, gelombangResult] = await Promise.all([
      pesertaApi.list({ limit: 5 }),
      jurusanApi.list({ limit: 1 }),
      gelombangApi.list({ limit: 100 }),
    ]);

    totalPeserta.value = pesertaResult.meta.total;
    recentPeserta.value = pesertaResult.data;
    totalJurusan.value = jurusanResult.meta.total;

    const today = new Date().toISOString().slice(0, 10);
    gelombangAktif.value = gelombangResult.data.filter((g) => g.startDate <= today && g.endDate >= today).length;
  } finally {
    loading.value = false;
  }
};

const loadCharts = async () => {
  chartsLoading.value = true;
  try {
    const allPeserta = await pesertaApi.list({ limit: 500 });
    trendData.value = buildTrend(allPeserta.data);
    jurusanData.value = buildJurusanRanking(allPeserta.data);
    golonganKelasData.value = buildGolonganKelas(allPeserta.data);
  } finally {
    chartsLoading.value = false;
  }
};

const loadKelulusan = async () => {
  kelulusanLoading.value = true;
  try {
    const stats = await calonMahasiswaApi.stats();
    const sedangProses = Math.max(stats.totalPendaftar - stats.diterimaKuliah - stats.ditolak, 0);
    kelulusanData.value = [
      { label: 'Lulus', value: stats.diterimaKuliah, color: '#059669' },
      { label: 'Sedang Proses', value: sedangProses, color: '#d97706' },
      { label: 'Ditolak', value: stats.ditolak, color: '#991b1b' },
    ];
  } finally {
    kelulusanLoading.value = false;
  }
};

onMounted(() => {
  loadDashboard();
  loadCharts();
  loadKelulusan();
});
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Overview</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Statistik siklus pendaftaran & aktivitas terbaru.</p>
    </header>

    <section class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div
        class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(27,54,93,0.05)] transition-shadow"
      >
        <div class="flex items-start justify-between mb-4">
          <span class="material-symbols-outlined text-primary filled">group</span>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant mb-1">Total Peserta</p>
          <p class="font-bold text-display-lg text-primary">{{ totalPeserta }}</p>
        </div>
      </div>

      <div
        class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(27,54,93,0.05)] transition-shadow"
      >
        <div class="flex items-start justify-between mb-4">
          <span class="material-symbols-outlined text-primary filled">school</span>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant mb-1">Total Jurusan</p>
          <p class="font-bold text-display-lg text-primary">{{ totalJurusan }}</p>
        </div>
      </div>

      <div
        class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg flex flex-col justify-between hover:shadow-[0px_4px_12px_rgba(27,54,93,0.05)] transition-shadow"
      >
        <div class="flex items-start justify-between mb-4">
          <span class="material-symbols-outlined text-[#059669] filled">event_available</span>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant mb-1">Gelombang Aktif</p>
          <p class="font-bold text-display-lg text-primary">{{ gelombangAktif }}</p>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <h2 class="font-semibold text-headline-md text-on-surface mb-1">Pendaftaran per Bulan</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">Jumlah peserta baru, 6 bulan terakhir.</p>
        <div v-if="chartsLoading" class="h-[260px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Memuat grafik...
        </div>
        <VerticalBarChart v-else :data="trendData" />
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <h2 class="font-semibold text-headline-md text-on-surface mb-1">Peserta per Kelas Perkuliahan</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">Distribusi peserta terdaftar per golongan kelas.</p>
        <div v-if="chartsLoading" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Memuat grafik...
        </div>
        <div v-else-if="golonganKelasData.length === 0" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Belum ada data peserta
        </div>
        <DonutChart v-else :data="golonganKelasData" />
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <h2 class="font-semibold text-headline-md text-on-surface mb-1">Status Kelulusan Calon Mahasiswa</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">Proporsi Lulus, Sedang Proses, dan Ditolak dari seluruh calon mahasiswa.</p>
        <div v-if="kelulusanLoading" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Memuat grafik...
        </div>
        <div v-else-if="kelulusanData.every((d) => d.value === 0)" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Belum ada data calon mahasiswa
        </div>
        <DonutChart v-else :data="kelulusanData" />
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 lg:col-span-2">
        <h2 class="font-semibold text-headline-md text-on-surface mb-1">Peserta per Program Studi</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">Jurusan dengan jumlah pendaftar terbanyak.</p>
        <div v-if="chartsLoading" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Memuat grafik...
        </div>
        <div v-else-if="jurusanData.length === 0" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Belum ada data peserta
        </div>
        <HorizontalBarChart v-else :data="jurusanData" />
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
        <h2 class="font-semibold text-headline-md text-on-surface">Peserta Terbaru</h2>
      </div>

      <DataTable :columns="columns" :items="recentPeserta" :loading="loading" :show-actions="false">
        <template #cell-jurusan="{ item }">{{ item.jurusan?.namaJurusan ?? '-' }}</template>
        <template #cell-createdAt="{ item }">
          <span class="tabular-nums">{{ formatDate(item.createdAt) }}</span>
        </template>
        <template #cell-status="{ item }">
          <StatusBadge
            :variant="item.isActive ? 'success' : 'danger'"
            :label="item.isActive ? 'Aktif' : 'Nonaktif'"
          />
        </template>
      </DataTable>
    </section>
  </div>
</template>

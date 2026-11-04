<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import StackedBarChart, { type StackedSeries } from '@/components/charts/StackedBarChart.vue';
import { statistikAkmApi, type AkmRow, type StatistikAkm } from '@/api/statistikAkm';
import { extractErrorMessage } from '@/api/http';
import { downloadBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';

/**
 * Statistik AKM (Aktivitas Kuliah Mahasiswa) tahun akademik aktif: tab per angkatan & per prodi,
 * grafik batang bertumpuk + tabel angka (tabel juga jadi alternatif aksesibel grafik).
 * Dipakai di dashboard BAAK & Prodi (`modul="prodi"` = hanya prodi sesi).
 */
const props = withDefaults(defineProps<{ modul?: 'baak' | 'prodi' }>(), { modul: 'baak' });
type KategoriKey = 'aktif' | 'cuti' | 'doubleDegree' | 'kampusMerdeka' | 'nonAktif' | 'tanpaAkm';
// Urutan & warna kategori tetap (palet kategorikal tervalidasi CVD); "Tidak Memiliki AKM" = abu netral (data belum ada).
const SERIES: (StackedSeries & { key: KategoriKey })[] = [
  { key: 'aktif', label: 'Aktif', color: '#2a78d6' },
  { key: 'cuti', label: 'Cuti', color: '#eb6834' },
  { key: 'doubleDegree', label: 'Sedang Double Degree', color: '#1baf7a' },
  { key: 'kampusMerdeka', label: 'Kampus Merdeka', color: '#eda100' },
  { key: 'nonAktif', label: 'Non Aktif', color: '#e87ba4' },
  { key: 'tanpaAkm', label: 'Tidak Memiliki AKM', color: '#a3a29c' },
];
const TABS = [
  { key: 'angkatan', label: 'AKM Angkatan' },
  { key: 'prodi', label: 'AKM Unit/Prodi' },
] as const;

const tab = ref<'angkatan' | 'prodi'>('angkatan');
const data = ref<StatistikAkm | null>(null);
const loading = ref(false);
const exporting = ref(false);
const error = ref<string | null>(null);

const muat = async () => {
  loading.value = true;
  error.value = null;
  try {
    data.value = await statistikAkmApi.get(undefined, props.modul);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat statistik AKM');
  } finally {
    loading.value = false;
  }
};

onMounted(muat);

const rows = computed<AkmRow[]>(() => (data.value ? data.value[tab.value] : []));
const chartRows = computed(() =>
  rows.value.map((r) => ({ label: r.label, values: Object.fromEntries(SERIES.map((s) => [s.key, r[s.key]])) }))
);
const judulTab = computed(() => (tab.value === 'angkatan' ? 'Angkatan' : 'Prodi'));
const angka = (n: number) => n.toLocaleString('id-ID');

const handleExport = async () => {
  exporting.value = true;
  try {
    downloadBlob(await statistikAkmApi.exportExcel(undefined, props.modul), `statistik-akm-${data.value?.periode ?? 'periode'}.xlsx`);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengunduh Excel'));
  } finally {
    exporting.value = false;
  }
};
</script>

<template>
  <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 mb-8">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-4">
      <div>
        <h2 class="font-semibold text-headline-md text-on-surface">
          Statistik Mahasiswa<span v-if="data"> · Periode {{ data.tahunAjaran }}</span>
        </h2>
        <p class="text-body-sm text-on-surface-variant">
          Status Aktivitas Kuliah Mahasiswa (AKM) Feeder PDDIKTI. Bila belum ada AKM: Aktif = sudah isi KRS,
          Non Aktif = belum isi KRS atau sudah diberi tagihan tanpa KRS.
        </p>
      </div>
      <div class="flex flex-wrap items-end gap-2">
        <AppButton variant="secondary" icon="download" :disabled="exporting || !data" @click="handleExport">
          {{ exporting ? 'Mengunduh...' : 'Download Excel' }}
        </AppButton>
      </div>
    </div>

    <div class="flex gap-1 border-b border-outline-variant mb-4" role="tablist">
      <button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        role="tab"
        :aria-selected="tab === t.key"
        class="px-4 py-2 text-label-md rounded-t-md -mb-px border"
        :class="tab === t.key ? 'bg-primary text-on-primary border-primary' : 'border-transparent text-on-surface-variant hover:bg-surface-container'"
        @click="tab = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <div v-if="error" class="p-3 rounded-md text-body-sm text-error bg-error-container">{{ error }}</div>
    <div v-else-if="loading" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">Memuat grafik...</div>
    <div v-else-if="!rows.length" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
      Belum ada data mahasiswa untuk periode ini
    </div>
    <template v-else-if="data">
      <p v-if="data.total.tanpaAkm > data.total.total / 2" class="mb-3 px-3 py-2 rounded-md bg-surface-container text-body-sm text-on-surface">
        {{ angka(data.total.tanpaAkm) }} dari {{ angka(data.total.total) }} mahasiswa belum memiliki AKM periode {{ data.periode }}.
        Generate/import AKM di menu Feeder PDDIKTI agar statusnya tercatat.
      </p>
      <p class="text-label-md font-medium text-on-surface text-center mb-1">AKM per {{ judulTab }}</p>
      <StackedBarChart :rows="chartRows" :series="SERIES" :aria-label="`AKM per ${judulTab}`" />

      <div class="mt-6 overflow-x-auto">
        <table class="w-full text-body-sm border-collapse">
          <thead class="bg-primary text-on-primary text-label-md">
            <tr>
              <th class="p-2 text-left">{{ judulTab }}</th>
              <th v-for="s in SERIES" :key="s.key" class="p-2 text-right">{{ s.label }}</th>
              <th class="p-2 text-right">AKM Tidak Sesuai</th>
              <th class="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="r in rows" :key="r.label" class="hover:bg-surface-container">
              <td class="p-2">{{ r.label }}</td>
              <td v-for="s in SERIES" :key="s.key" class="p-2 text-right tabular-nums">{{ angka(r[s.key]) }}</td>
              <td class="p-2 text-right tabular-nums">{{ angka(r.akmTidakSesuai) }}</td>
              <td class="p-2 text-right tabular-nums font-medium">{{ angka(r.total) }}</td>
            </tr>
            <tr class="font-semibold bg-surface-container-low">
              <td class="p-2">TOTAL</td>
              <td v-for="s in SERIES" :key="s.key" class="p-2 text-right tabular-nums">{{ angka(data.total[s.key]) }}</td>
              <td class="p-2 text-right tabular-nums">{{ angka(data.total.akmTidakSesuai) }}</td>
              <td class="p-2 text-right tabular-nums">{{ angka(data.total.total) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

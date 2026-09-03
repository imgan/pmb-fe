<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import LineChart, { type LineDatum } from '@/components/charts/LineChart.vue';
import DonutChart, { type DonutDatum } from '@/components/charts/DonutChart.vue';
import HorizontalBarChart, { type BarDatum } from '@/components/charts/HorizontalBarChart.vue';
import { kasirDashboardApi } from '@/api/kasirDashboard';
import { formatCurrencyCompactIdr, formatCurrencyIdr, formatDate } from '@/utils/format';
import type { KasirDashboard, KasirTransaksi } from '@/types/entities';

const loading = ref(true);
const error = ref<string | null>(null);
const dashboard = ref<KasirDashboard | null>(null);

const JENIS_BADGE: Record<KasirTransaksi['jenis'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  KULIAH: 'neutral',
  SERTIFIKASI: 'success',
  WISUDA: 'warning',
  PERPANJANGAN_TA: 'danger',
};

const trendData = computed<LineDatum[]>(
  () => dashboard.value?.trend14Hari.map((t) => ({ label: t.label, value: t.value })) ?? []
);
const jenisData = computed<DonutDatum[]>(() => dashboard.value?.breakdownJenis.filter((d) => d.value > 0) ?? []);
const bankData = computed<BarDatum[]>(() => dashboard.value?.breakdownBank ?? []);
const transaksiRows = computed(() => (dashboard.value?.transaksiTerbaru ?? []).map((t, i) => ({ ...t, id: i })));

const columns: DataTableColumn[] = [
  { key: 'jenisLabel', label: 'Jenis' },
  { key: 'tanggalBayar', label: 'Tanggal' },
  { key: 'nim', label: 'NIM' },
  { key: 'namaLengkap', label: 'Nama' },
  { key: 'noBukti', label: 'No Bukti' },
  { key: 'nominal', label: 'Nominal', align: 'right' },
  { key: 'kodeBank', label: 'Bank' },
  { key: 'kasir', label: 'Kasir' },
];

const loadDashboard = async () => {
  loading.value = true;
  error.value = null;
  try {
    dashboard.value = await kasirDashboardApi.get();
  } catch {
    error.value = 'Gagal memuat dashboard kasir';
  } finally {
    loading.value = false;
  }
};

onMounted(loadDashboard);
</script>

<template>
  <div>
    <header class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Dashboard Kasir</h1>
        <p class="text-body-md text-on-surface-variant mt-1">
          Ringkasan transaksi pembayaran kuliah, sertifikasi, wisuda & perpanjangan TA/Skripsi.
        </p>
      </div>
      <button
        class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-outline-variant text-label-md text-on-surface-variant hover:bg-surface-container transition-colors"
        :disabled="loading"
        @click="loadDashboard"
      >
        <span class="material-symbols-outlined text-[18px]">refresh</span>
        Muat Ulang
      </button>
    </header>

    <div v-if="error" class="mb-6 px-4 py-3 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ error }}
    </div>

    <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      <div class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg flex flex-col justify-between">
        <div class="flex items-start justify-between mb-4">
          <span class="material-symbols-outlined text-primary filled">payments</span>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant mb-1">Transaksi Hari Ini</p>
          <p class="font-bold text-display-lg text-primary">{{ loading ? '-' : dashboard?.hariIni.jumlahTransaksi ?? 0 }}</p>
          <p class="text-body-sm text-on-surface-variant mt-1">
            {{ loading ? 'Memuat...' : formatCurrencyIdr(dashboard?.hariIni.totalNominal ?? 0) }}
          </p>
        </div>
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg flex flex-col justify-between">
        <div class="flex items-start justify-between mb-4">
          <span class="material-symbols-outlined text-[#059669] filled">calendar_month</span>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant mb-1">Transaksi Bulan Ini</p>
          <p class="font-bold text-display-lg text-primary">{{ loading ? '-' : dashboard?.bulanIni.jumlahTransaksi ?? 0 }}</p>
          <p class="text-body-sm text-on-surface-variant mt-1">
            {{ loading ? 'Memuat...' : formatCurrencyIdr(dashboard?.bulanIni.totalNominal ?? 0) }}
          </p>
        </div>
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg flex flex-col justify-between">
        <div class="flex items-start justify-between mb-4">
          <span class="material-symbols-outlined text-error filled">error</span>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant mb-1">Total Tunggakan</p>
          <p class="font-bold text-headline-lg-mobile md:text-headline-lg text-error truncate" :title="formatCurrencyIdr(dashboard?.tunggakan.totalTunggakan ?? 0)">
            {{ loading ? '-' : formatCurrencyIdr(dashboard?.tunggakan.totalTunggakan ?? 0) }}
          </p>
          <p class="text-body-sm text-on-surface-variant mt-1">
            {{ loading ? 'Memuat...' : `${dashboard?.tunggakan.jumlahMahasiswaMenunggak ?? 0} mahasiswa menunggak` }}
          </p>
        </div>
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant p-6 rounded-lg flex flex-col justify-between">
        <div class="flex items-start justify-between mb-4">
          <span class="material-symbols-outlined text-[#d97706] filled">receipt_long</span>
        </div>
        <div>
          <p class="text-body-sm text-on-surface-variant mb-1">Rata-rata Nominal / Transaksi (Bulan Ini)</p>
          <p
            class="font-bold text-headline-lg-mobile md:text-headline-lg text-primary truncate"
            :title="
              formatCurrencyIdr(
                dashboard?.bulanIni.jumlahTransaksi ? Math.round(dashboard.bulanIni.totalNominal / dashboard.bulanIni.jumlahTransaksi) : 0
              )
            "
          >
            {{
              loading
                ? '-'
                : formatCurrencyIdr(
                    dashboard?.bulanIni.jumlahTransaksi ? Math.round(dashboard.bulanIni.totalNominal / dashboard.bulanIni.jumlahTransaksi) : 0
                  )
            }}
          </p>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 lg:col-span-2">
        <h2 class="font-semibold text-headline-md text-on-surface mb-1">Tren Transaksi 14 Hari Terakhir</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">Total nominal pembayaran kasir per hari.</p>
        <div v-if="loading" class="h-[260px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Memuat grafik...
        </div>
        <LineChart v-else :data="trendData" :format-value="formatCurrencyIdr" :format-axis-value="formatCurrencyCompactIdr" />
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <h2 class="font-semibold text-headline-md text-on-surface mb-1">Komposisi Jenis Pembayaran</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">Proporsi nominal per jenis transaksi, bulan berjalan.</p>
        <div v-if="loading" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Memuat grafik...
        </div>
        <div v-else-if="jenisData.length === 0" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Belum ada transaksi bulan ini
        </div>
        <DonutChart v-else :data="jenisData" :format-value="formatCurrencyCompactIdr" />
      </div>

      <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
        <h2 class="font-semibold text-headline-md text-on-surface mb-1">Pembayaran per Bank</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">Total nominal per metode/bank, bulan berjalan.</p>
        <div v-if="loading" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Memuat grafik...
        </div>
        <div v-else-if="bankData.length === 0" class="h-[200px] flex items-center justify-center text-on-surface-variant text-body-sm">
          Belum ada transaksi bulan ini
        </div>
        <HorizontalBarChart v-else :data="bankData" :format-value="formatCurrencyIdr" :format-bar-label="formatCurrencyCompactIdr" />
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
        <h2 class="font-semibold text-headline-md text-on-surface">Transaksi Terbaru</h2>
      </div>

      <DataTable :columns="columns" :items="transaksiRows" :loading="loading" :show-actions="false" empty-message="Belum ada transaksi">
        <template #cell-jenisLabel="{ item }">
          <StatusBadge :variant="JENIS_BADGE[item.jenis as KasirTransaksi['jenis']]" :label="item.jenisLabel" />
        </template>
        <template #cell-tanggalBayar="{ item }">{{ formatDate(item.tanggalBayar) }}</template>
        <template #cell-nominal="{ item }">{{ formatCurrencyIdr(item.nominal) }}</template>
        <template #cell-kodeBank="{ item }">{{ item.kodeBank || '-' }}</template>
      </DataTable>
    </section>
  </div>
</template>

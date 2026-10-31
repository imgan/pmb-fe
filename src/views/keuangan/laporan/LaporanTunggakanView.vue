<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { laporanKeuanganApi } from '@/api/laporanKeuangan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr } from '@/utils/format';
import { downloadBlob } from '@/utils/download';
import type { LaporanTunggakanJurusanRow } from '@/types/entities';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';

interface Option {
  value: string | number;
  label: string;
}

const tahunAjaranOptions = ref<Option[]>([]);
const selectedTahunAjaran = ref<number | ''>('');

const rows = ref<LaporanTunggakanJurusanRow[]>([]);
const grandTotal = ref<Omit<LaporanTunggakanJurusanRow, 'prodi'>>({
  jumlahMahasiswa: 0,
  tagihanSisa: 0,
  tagihanTaSkripsisSisa: 0,
  tagihanBiayaLainSisa: 0,
  tunggakanManual: 0,
  totalTunggakan: 0,
});
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);
const exporting = ref(false);

onMounted(async () => {
  try {
    const { data } = await tahunAjaranApi.list({ limit: 200, isActive: true });
    tahunAjaranOptions.value = data
      .slice()
      .sort((a, b) => b.tahunMulai - a.tahunMulai)
      .map((ta) => ({ value: ta.id, label: `${formatTahunAjaran(ta)}` }));
    const active = data.find((ta) => ta.isActive);
    if (active) selectedTahunAjaran.value = active.id;
  } catch {
    tahunAjaranOptions.value = [];
  }
  handleTampilkan();
});

const handleTampilkan = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await laporanKeuanganApi.tunggakan({ tahunAjaranId: selectedTahunAjaran.value || undefined });
    rows.value = result.data;
    grandTotal.value = result.grandTotal;
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data laporan tunggakan');
  } finally {
    loading.value = false;
  }
};

const handleExport = async () => {
  exporting.value = true;
  try {
    const blob = await laporanKeuanganApi.exportTunggakan({ tahunAjaranId: selectedTahunAjaran.value || undefined });
    downloadBlob(blob, 'laporan-tunggakan.xlsx');
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal mengekspor laporan tunggakan');
  } finally {
    exporting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Laporan Tunggakan" subtitle="Rekap tunggakan pembayaran seluruh mahasiswa per program studi." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-3 md:items-end">
        <div class="w-full md:w-72">
          <SelectInput v-model="selectedTahunAjaran" label="Tahun Ajaran" placeholder="-- Semua Tahun Ajaran --" :options="tahunAjaranOptions" />
        </div>
        <AppButton icon="search" :disabled="loading" @click="handleTampilkan">{{ loading ? 'Memuat...' : 'Tampilkan' }}</AppButton>
        <div class="flex-1"></div>
        <AppButton variant="secondary" icon="download" :disabled="exporting" @click="handleExport">
          {{ exporting ? 'Mengekspor...' : 'Export Excel' }}
        </AppButton>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Rekap Tunggakan per Program Studi</div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <p v-else-if="loaded && !rows.length" class="p-8 text-center text-body-sm text-on-surface-variant">
        Tidak ada mahasiswa yang menunggak untuk filter ini.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 border border-outline-variant">Program Studi</th>
              <th class="p-3 border border-outline-variant text-center">Jumlah Mahasiswa</th>
              <th class="p-3 border border-outline-variant text-right">Sisa Tagihan Kuliah</th>
              <th class="p-3 border border-outline-variant text-right">Sisa TA/Skripsi</th>
              <th class="p-3 border border-outline-variant text-right">Sisa Biaya Lain</th>
              <th class="p-3 border border-outline-variant text-right">Tunggakan Lain</th>
              <th class="p-3 border border-outline-variant text-right">Total Tunggakan</th>
            </tr>
          </thead>
          <tbody class="text-on-surface">
            <tr v-for="row in rows" :key="row.prodi" class="hover:bg-surface-container transition-colors">
              <td class="p-2 border border-outline-variant">{{ row.prodi }}</td>
              <td class="p-2 border border-outline-variant text-center">{{ row.jumlahMahasiswa }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(row.tagihanSisa) }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(row.tagihanTaSkripsisSisa) }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(row.tagihanBiayaLainSisa) }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(row.tunggakanManual) }}</td>
              <td class="p-2 border border-outline-variant text-right font-medium text-error">{{ formatCurrencyIdr(row.totalTunggakan) }}</td>
            </tr>
            <tr v-if="rows.length" class="bg-surface-container-low font-semibold">
              <td class="p-2 border border-outline-variant">Grand Total</td>
              <td class="p-2 border border-outline-variant text-center">{{ grandTotal.jumlahMahasiswa }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(grandTotal.tagihanSisa) }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(grandTotal.tagihanTaSkripsisSisa) }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(grandTotal.tagihanBiayaLainSisa) }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(grandTotal.tunggakanManual) }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(grandTotal.totalTunggakan) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

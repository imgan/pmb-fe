<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { laporanKeuanganApi } from '@/api/laporanKeuangan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr } from '@/utils/format';
import type { LaporanUangKuliahRow } from '@/types/entities';

interface Option {
  value: string | number;
  label: string;
}

const tahunAjaranOptions = ref<Option[]>([]);
const selectedTahunAjaran = ref<number | ''>('');

const rows = ref<LaporanUangKuliahRow[]>([]);
const grandTotal = ref<Omit<LaporanUangKuliahRow, 'prodi'>>({ jumlahMahasiswa: 0, totalTagihan: 0, totalDibayar: 0, totalTunggakan: 0 });
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const { data } = await tahunAjaranApi.list({ limit: 200 });
    tahunAjaranOptions.value = data
      .slice()
      .sort((a, b) => b.tahunMulai - a.tahunMulai)
      .map((ta) => ({ value: ta.id, label: `${ta.nama} - ${ta.jenisSemester}` }));
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
    const result = await laporanKeuanganApi.uangKuliah({ tahunAjaranId: selectedTahunAjaran.value || undefined });
    rows.value = result.data;
    grandTotal.value = result.grandTotal;
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data laporan uang kuliah');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Laporan Uang Kuliah" subtitle="Rekap tagihan, pembayaran, dan tunggakan uang kuliah per program studi." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-3 md:items-end">
        <div class="w-full md:w-72">
          <SelectInput v-model="selectedTahunAjaran" label="Tahun Ajaran" placeholder="-- Semua Tahun Ajaran --" :options="tahunAjaranOptions" />
        </div>
        <AppButton icon="search" :disabled="loading" @click="handleTampilkan">{{ loading ? 'Memuat...' : 'Tampilkan' }}</AppButton>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Rekap Uang Kuliah per Program Studi</div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <p v-else-if="loaded && !rows.length" class="p-8 text-center text-body-sm text-on-surface-variant">
        Belum ada data tagihan untuk filter ini.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 border border-outline-variant">Program Studi</th>
              <th class="p-3 border border-outline-variant text-center">Jumlah Mahasiswa</th>
              <th class="p-3 border border-outline-variant text-right">Total Tagihan</th>
              <th class="p-3 border border-outline-variant text-right">Total Dibayar</th>
              <th class="p-3 border border-outline-variant text-right">Total Tunggakan</th>
            </tr>
          </thead>
          <tbody class="text-on-surface">
            <tr v-for="row in rows" :key="row.prodi" class="hover:bg-surface-container transition-colors">
              <td class="p-2 border border-outline-variant">{{ row.prodi }}</td>
              <td class="p-2 border border-outline-variant text-center">{{ row.jumlahMahasiswa }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(row.totalTagihan) }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(row.totalDibayar) }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(row.totalTunggakan) }}</td>
            </tr>
            <tr v-if="rows.length" class="bg-surface-container-low font-semibold">
              <td class="p-2 border border-outline-variant">Grand Total</td>
              <td class="p-2 border border-outline-variant text-center">{{ grandTotal.jumlahMahasiswa }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(grandTotal.totalTagihan) }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(grandTotal.totalDibayar) }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(grandTotal.totalTunggakan) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

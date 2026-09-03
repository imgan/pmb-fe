<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import { laporanKeuanganApi } from '@/api/laporanKeuangan';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr } from '@/utils/format';
import type { LaporanSertifikasiRow, StatusSertifikasi } from '@/types/entities';

const STATUS_OPTIONS = [
  { value: 'MENUNGGU', label: 'Menunggu' },
  { value: 'LULUS', label: 'Lulus' },
  { value: 'TIDAK_LULUS', label: 'Tidak Lulus' },
];

const dateFrom = ref('');
const dateTo = ref('');
const statusSertifikasi = ref<StatusSertifikasi | ''>('');

const rows = ref<LaporanSertifikasiRow[]>([]);
const grandTotal = ref<Omit<LaporanSertifikasiRow, 'jenisPembayaran'>>({ jumlahTransaksi: 0, totalNominal: 0 });
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);

const handleTampilkan = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await laporanKeuanganApi.sertifikasi({
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
      statusSertifikasi: statusSertifikasi.value || undefined,
    });
    rows.value = result.data;
    grandTotal.value = result.grandTotal;
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data laporan sertifikasi');
  } finally {
    loading.value = false;
  }
};

handleTampilkan();
</script>

<template>
  <div>
    <PageHeader title="Laporan Sertifikasi" subtitle="Rekap pembayaran sertifikasi mahasiswa per jenis pembayaran." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-3 md:items-end">
        <div class="w-full md:w-48">
          <DateInput v-model="dateFrom" label="Tanggal Bayar Dari" />
        </div>
        <div class="w-full md:w-48">
          <DateInput v-model="dateTo" label="Tanggal Bayar Sampai" />
        </div>
        <div class="w-full md:w-56">
          <SelectInput v-model="statusSertifikasi" label="Status Sertifikasi" placeholder="-- Semua Status --" :options="STATUS_OPTIONS" />
        </div>
        <AppButton icon="search" :disabled="loading" @click="handleTampilkan">{{ loading ? 'Memuat...' : 'Tampilkan' }}</AppButton>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Rekap Pembayaran Sertifikasi per Jenis Pembayaran</div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <p v-else-if="loaded && !rows.length" class="p-8 text-center text-body-sm text-on-surface-variant">
        Belum ada data pembayaran sertifikasi untuk filter ini.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 border border-outline-variant">Jenis Pembayaran</th>
              <th class="p-3 border border-outline-variant text-center">Jumlah Transaksi</th>
              <th class="p-3 border border-outline-variant text-right">Total Nominal</th>
            </tr>
          </thead>
          <tbody class="text-on-surface">
            <tr v-for="row in rows" :key="row.jenisPembayaran" class="hover:bg-surface-container transition-colors">
              <td class="p-2 border border-outline-variant">{{ row.jenisPembayaran }}</td>
              <td class="p-2 border border-outline-variant text-center">{{ row.jumlahTransaksi }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(row.totalNominal) }}</td>
            </tr>
            <tr v-if="rows.length" class="bg-surface-container-low font-semibold">
              <td class="p-2 border border-outline-variant">Grand Total</td>
              <td class="p-2 border border-outline-variant text-center">{{ grandTotal.jumlahTransaksi }}</td>
              <td class="p-2 border border-outline-variant text-right">{{ formatCurrencyIdr(grandTotal.totalNominal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

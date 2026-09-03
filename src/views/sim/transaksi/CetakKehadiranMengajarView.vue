<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { simKehadiranMengajarApi } from '@/api/simKehadiranMengajar';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import type { KehadiranMengajarRow, StatusKehadiranDosen } from '@/types/entities';

interface Option {
  value: string | number;
  label: string;
}

const STATUS_LABELS: Record<StatusKehadiranDosen, string> = {
  HADIR: 'Hadir',
  TIDAK_HADIR: 'Tidak Hadir',
  IZIN: 'Izin',
  SAKIT: 'Sakit',
};
const STATUS_VARIANTS: Record<StatusKehadiranDosen, 'success' | 'warning' | 'danger' | 'neutral'> = {
  HADIR: 'success',
  TIDAK_HADIR: 'danger',
  IZIN: 'warning',
  SAKIT: 'warning',
};

const tahunAjaranOptions = ref<Option[]>([]);
const selectedTahunAjaran = ref<number | ''>('');

const rows = ref<KehadiranMengajarRow[]>([]);
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
  } catch {
    tahunAjaranOptions.value = [];
  }
});

const handlePeriksa = async () => {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await simKehadiranMengajarApi.list({ tahunAjaranId: selectedTahunAjaran.value || undefined });
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data kehadiran mengajar');
  } finally {
    loading.value = false;
  }
};

handlePeriksa();

const handleCetak = () => window.print();
</script>

<template>
  <div>
    <PageHeader title="Cetak Kehadiran Mengajar" subtitle="Daftar realisasi kehadiran mengajar dosen.">
      <template #actions>
        <AppButton icon="print" variant="secondary" :disabled="!rows.length" @click="handleCetak">Cetak</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4 print:hidden">
      <div class="flex flex-col md:flex-row gap-3 md:items-end">
        <div class="w-full md:w-64">
          <SelectInput v-model="selectedTahunAjaran" label="Tahun Ajaran" placeholder="-- Pilih Tahun Ajaran --" :options="tahunAjaranOptions" />
        </div>
        <AppButton icon="search" :disabled="loading" @click="handlePeriksa">{{ loading ? 'Memeriksa...' : 'Periksa' }}</AppButton>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <p v-else-if="loaded && !rows.length" class="p-8 text-center text-body-sm text-on-surface-variant">
        Belum ada data kehadiran mengajar untuk filter ini.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 border border-outline-variant">Tanggal</th>
              <th class="p-3 border border-outline-variant">Dosen</th>
              <th class="p-3 border border-outline-variant">Mata Kuliah</th>
              <th class="p-3 border border-outline-variant">Kelas</th>
              <th class="p-3 border border-outline-variant text-center">Pertemuan Ke</th>
              <th class="p-3 border border-outline-variant">Jam</th>
              <th class="p-3 border border-outline-variant text-center">Status</th>
            </tr>
          </thead>
          <tbody class="text-on-surface">
            <tr v-for="row in rows" :key="row.id" class="hover:bg-surface-container transition-colors">
              <td class="p-2 border border-outline-variant">{{ formatDate(row.tanggalRealisasi) }}</td>
              <td class="p-2 border border-outline-variant">{{ row.dosen.namaLengkap }}</td>
              <td class="p-2 border border-outline-variant">
                [{{ row.jadwalKuliah.kodeMataKuliah }}] {{ row.jadwalKuliah.namaMataKuliah }}
              </td>
              <td class="p-2 border border-outline-variant">{{ row.jadwalKuliah.kelas }}</td>
              <td class="p-2 border border-outline-variant text-center">{{ row.pertemuanKe ?? '-' }}</td>
              <td class="p-2 border border-outline-variant">
                {{ row.jamMasuk ?? '-' }} - {{ row.jamKeluar ?? '-' }}
              </td>
              <td class="p-2 border border-outline-variant text-center">
                <StatusBadge :label="STATUS_LABELS[row.status]" :variant="STATUS_VARIANTS[row.status]" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

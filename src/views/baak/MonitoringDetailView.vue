<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { jadwalKuliahApi } from '@/api/jadwalKuliah';
import { extractErrorMessage } from '@/api/http';
import type { JadwalKuliah } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const props = defineProps<{ id: string }>();

const jadwal = ref<JadwalKuliah | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const search = ref('');
const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const pageSize = ref(10);
const page = ref(1);

/**
 * Kehadiran per mahasiswa belum punya data model tersendiri di sistem ini,
 * jadi tabel selalu tampil kosong (konsisten dengan kondisi "No data available
 * in table" pada sumber acuannya) sampai fitur presensi dibangun.
 */
const kehadiranMeta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'shift', label: 'Shift/Non' },
  { key: 'status', label: 'STATUS' },
  { key: 'waktuKuliah', label: 'Waktu Kuliah' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'kehadiran', label: 'Kehadiran' },
];

const loadJadwal = async () => {
  loading.value = true;
  error.value = null;
  try {
    jadwal.value = await jadwalKuliahApi.get(props.id);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data monitoring');
  } finally {
    loading.value = false;
  }
};

onMounted(loadJadwal);
</script>

<template>
  <div>
    <PageHeader title="Master Detail Monitoring" :back-to="{ name: 'baak-monitoring' }" back-label="Kembali ke Monitoring" />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        Semua Data Master Detail Monitoring
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div v-else-if="loading" class="p-4 text-body-sm text-on-surface-variant">Memuat data...</div>

      <div v-else-if="jadwal" class="p-4 border-b border-outline-variant grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm">
        <span class="text-on-surface-variant">Mata Kuliah</span>
        <span class="text-on-surface">: [{{ jadwal.kodeMataKuliah }}] {{ jadwal.namaMataKuliah }}</span>
        <span class="text-on-surface-variant">Kelas</span>
        <span class="text-on-surface">: {{ jadwal.kelas }}</span>
        <span class="text-on-surface-variant">Dosen</span>
        <span class="text-on-surface">: {{ jadwal.dosenKordinator?.namaLengkap ?? '-' }}</span>
      </div>

      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <span>Show</span>
          <div class="w-20">
            <SelectInput v-model="pageSize" :options="pageSizeOptions" />
          </div>
          <span>entries</span>
        </div>
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Search..." />
        </div>
      </div>

      <DataTable
        :columns="columns"
        :items="[]"
        :loading="false"
        :show-actions="false"
        empty-message="No data available in table"
      />

      <Pagination v-model="page" :meta="kehadiranMeta" />
    </section>
  </div>
</template>

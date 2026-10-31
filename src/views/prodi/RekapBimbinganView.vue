<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { pendaftarSidangApi } from '@/api/pendaftarSidang';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { downloadBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';
import type { PendaftarSidang } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const search = ref('');
const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const pageSize = ref(10);

const items = ref<PendaftarSidang[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(true);
const error = ref<string | null>(null);

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * pageSize.value + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'NAMA' },
  { key: 'noTelp', label: 'No. Telp' },
  { key: 'judul', label: 'Judul' },
  { key: 'pembimbing', label: 'Pembimbing' },
  { key: 'sidang', label: 'Sidang' },
];

const pembimbingLine = (item: PendaftarSidang) => {
  const names = [item.pembimbing1?.namaLengkap, item.pembimbing2?.namaLengkap].filter(Boolean);
  return names.length ? names.join(' & ') : '-';
};

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await pendaftarSidangApi.list({ page: page.value, limit: pageSize.value, search: search.value || undefined });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data rekap bimbingan');
  } finally {
    loading.value = false;
  }
};

watch(page, fetchItems);
watch(pageSize, () => {
  page.value = 1;
  fetchItems();
});

let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    page.value = 1;
    fetchItems();
  }, 350);
});

onMounted(fetchItems);

const exporting = ref(false);
const handleExport = async () => {
  exporting.value = true;
  try {
    const blob = await pendaftarSidangApi.exportExcel();
    downloadBlob(blob, 'rekap-bimbingan.xlsx');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengunduh rekap bimbingan'));
  } finally {
    exporting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Rekap Bimbingan" subtitle="Rekap data bimbingan skripsi/tugas akhir mahasiswa." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Rekap Bimbingan</div>

      <div class="p-4 border-b border-outline-variant">
        <AppButton icon="download" :disabled="exporting" @click="handleExport">
          {{ exporting ? 'Menyiapkan file...' : 'Export Data' }}
        </AppButton>
      </div>

      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <span>Show</span>
          <div class="w-20">
            <SelectInput v-model="pageSize" :options="pageSizeOptions" :clearable="false" />
          </div>
          <span>entries</span>
        </div>
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Search..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="rows" :loading="loading" :show-actions="false" empty-message="Belum ada data bimbingan">
        <template #cell-nim="{ item }">{{ item.mahasiswa?.nim ?? '-' }}</template>
        <template #cell-nama="{ item }">{{ item.mahasiswa?.namaLengkap?.toUpperCase() ?? '-' }}</template>
        <template #cell-noTelp="{ item }">{{ item.mahasiswa?.noTelepon ?? '-' }}</template>
        <template #cell-pembimbing="{ item }">{{ pembimbingLine(item) }}</template>
        <template #cell-sidang="{ item }">
          <span v-if="item.jadwalSidang">
            {{ formatDate(item.jadwalSidang.tanggal) }} &middot; {{ item.jadwalSidang.jam }}
            <span class="block text-label-sm text-on-surface-variant">{{ item.jadwalSidang.ruangan ?? 'Ruang belum ditentukan' }}</span>
          </span>
          <span v-else class="text-on-surface-variant">Belum Dijadwalkan</span>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>

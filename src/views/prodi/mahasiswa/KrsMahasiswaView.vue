<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import KrsFilterPanel from '@/components/baak/KrsFilterPanel.vue';
import { emptyKrsFilter, krsFilterQuery } from '@/components/baak/krsFilter';
import { krsProdiApi } from '@/api/krs';
import { extractErrorMessage } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import type { Krs, StatusKrs } from '@/types/entities';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';

// KRS Mahasiswa modul Prodi: daftar KRS (hanya lihat) dengan filter yang sama seperti BAAK.
// Data dibatasi backend ke prodi sesi login (/prodi/krs + prodiScope).
const authStore = useAuthStore();

const STATUS_LABEL: Record<StatusKrs, string> = { DRAFT: 'Draft', DIAJUKAN: 'Diajukan', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak', BELUM_ISI: 'Belum Isi' };
const STATUS_VARIANT: Record<StatusKrs, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  DIAJUKAN: 'warning',
  DISETUJUI: 'success',
  DITOLAK: 'danger',
  BELUM_ISI: 'danger',
};

const columns: DataTableColumn[] = [
  { key: 'mahasiswa', label: 'Mahasiswa' },
  { key: 'prodi', label: 'Program Studi' },
  { key: 'semester', label: 'Semester', align: 'center' },
  { key: 'tahunAjaran', label: 'Tahun Ajaran' },
  { key: 'totalSks', label: 'Total SKS', align: 'center' },
  { key: 'status', label: 'Status', align: 'center' },
];

const filter = ref(emptyKrsFilter());
const search = ref('');
const items = ref<Krs[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const page = ref(1);
const limit = ref(20);
const meta = ref({ total: 0, page: 1, limit: 20, totalPages: 1 });

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await krsProdiApi.list({ page: page.value, limit: limit.value, search: search.value || undefined, ...krsFilterQuery(filter.value) });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data KRS');
  } finally {
    loading.value = false;
  }
};

const reload = () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
};
let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(reload, 350);
});
watch(page, fetchItems);
watch(limit, reload);
onMounted(fetchItems);
</script>

<template>
  <div>
    <PageHeader title="KRS Mahasiswa" subtitle="Kartu Rencana Studi mahasiswa prodi — status pengisian & persetujuan per semester." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col gap-4 bg-surface-bright">
        <KrsFilterPanel v-model="filter" :unit-kerja-tetap="authStore.context.prodi?.nama ?? null" @change="reload" />
        <SearchInput v-model="search" placeholder="Cari NIM atau nama mahasiswa..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable :columns="columns" :items="items" :loading="loading" :show-actions="false" empty-message="Belum ada data KRS">
        <template #cell-mahasiswa="{ item }">
          <p class="font-medium text-on-surface">{{ item.mahasiswa?.nim }}</p>
          <p class="text-label-sm text-on-surface-variant">{{ item.mahasiswa?.namaLengkap }}</p>
        </template>
        <template #cell-prodi="{ item }">{{ item.mahasiswa?.jurusan?.namaJurusan ?? '-' }}</template>
        <template #cell-semester="{ item }">{{ item.semester ?? '-' }}</template>
        <template #cell-tahunAjaran="{ item }">{{ formatTahunAjaran(item.tahunAjaran) }}</template>
        <template #cell-status="{ item }">
          <StatusBadge :label="STATUS_LABEL[item.status]" :variant="STATUS_VARIANT[item.status]" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>

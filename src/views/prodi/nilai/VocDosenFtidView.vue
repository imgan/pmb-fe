<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { vocDosenFtidApi } from '@/api/vocDosenFtid';
import { extractErrorMessage } from '@/api/http';
import { openBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';
import type { Dosen } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const router = useRouter();

const items = ref<Dosen[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const search = ref('');
const loading = ref(true);
const error = ref<string | null>(null);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await vocDosenFtidApi.list({ page: page.value, limit: 10, search: search.value || undefined });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data voc dosen');
  } finally {
    loading.value = false;
  }
};

watch(page, fetchItems);
let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    page.value = 1;
    fetchItems();
  }, 350);
});

onMounted(fetchItems);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nidn', label: 'Kode Dosen' },
  { key: 'namaLengkap', label: 'Dosen Kordinator' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const goToDetail = (item: Dosen) => {
  router.push({ name: 'prodi-voc-dosen-ftid-detail', params: { dosenId: item.id } });
};

const printingId = ref<number | null>(null);
const handlePrint = async (item: Dosen) => {
  printingId.value = item.id;
  try {
    const blob = await vocDosenFtidApi.cetakPdf(item.id);
    openBlob(blob);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka voucher'));
  } finally {
    if (printingId.value === item.id) printingId.value = null;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Voc Dosen Kuliah" subtitle="Voucher pembuatan soal, koreksi, dan pengawasan UAS untuk dosen FTID." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Voc Dosen Kuliah</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari nama atau NIDN..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="rows" :loading="loading" empty-message="Belum ada data dosen FTID">
        <template #cell-nidn="{ item }">{{ item.nidn || '-' }}</template>
        <template #actions="{ item }">
          <div class="flex justify-end gap-3">
            <button type="button" class="text-primary hover:opacity-80" title="Edit" @click="goToDetail(item)">
              <span class="material-symbols-outlined" style="font-size: 20px">edit</span>
            </button>
            <button
              type="button"
              class="text-primary hover:opacity-80 disabled:opacity-50"
              title="Print"
              :disabled="printingId === item.id"
              @click="handlePrint(item)"
            >
              <span class="material-symbols-outlined" style="font-size: 20px">print</span>
            </button>
          </div>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>

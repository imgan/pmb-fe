<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { laporanKhsApi } from '@/api/laporanKhs';
import { extractErrorMessage } from '@/api/http';
import { openBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';
import type { KhsMahasiswaItem } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const nimInput = ref('');
const namaInput = ref('');
const appliedNim = ref('');
const appliedNama = ref('');
const search = ref('');

const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const pageSize = ref(10);

const items = ref<KhsMahasiswaItem[]>([]);
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
  { key: 'namaLengkap', label: 'Nama' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'khs', label: 'KHS' },
  { key: 'nilaiSemester', label: 'Nilai Semester' },
];

const selectedSemester = reactive<Record<number, number | ''>>({});
const semesterOptionsFor = (item: KhsMahasiswaItem) => item.semesterOptions.map((s) => ({ value: s, label: String(s) }));

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await laporanKhsApi.list({
      page: page.value,
      limit: pageSize.value,
      search: search.value || undefined,
      nim: appliedNim.value || undefined,
      nama: appliedNama.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
    result.data.forEach((item) => {
      if (selectedSemester[item.id] === undefined) {
        selectedSemester[item.id] = item.semesterOptions[0] ?? '';
      }
    });
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data mahasiswa');
  } finally {
    loading.value = false;
  }
};

const handlePeriksa = () => {
  appliedNim.value = nimInput.value.trim();
  appliedNama.value = namaInput.value.trim();
  page.value = 1;
  fetchItems();
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

const printingId = ref<number | null>(null);
const handleCetak = async (item: KhsMahasiswaItem) => {
  const semester = selectedSemester[item.id];
  if (!semester) {
    toastError('Pilih semester terlebih dahulu');
    return;
  }
  printingId.value = item.id;
  try {
    const blob = await laporanKhsApi.cetakPdf(item.id, Number(semester));
    openBlob(blob);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka dokumen KHS'));
  } finally {
    if (printingId.value === item.id) printingId.value = null;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Laporan Cetak KHS" subtitle="Cetak Kartu Hasil Studi (KHS) mahasiswa per semester." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-64">
          <TextInput v-model="nimInput" placeholder="Nomor Induk Mahasiswa" @keyup.enter="handlePeriksa" />
        </div>
        <div class="w-full md:w-64">
          <TextInput v-model="namaInput" placeholder="Nama Mahasiswa" @keyup.enter="handlePeriksa" />
        </div>
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
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

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="rows" :loading="loading" :show-actions="false" empty-message="Belum ada data mahasiswa">
        <template #cell-khs="{ item }">
          <button
            type="button"
            class="text-primary hover:underline disabled:opacity-50 disabled:no-underline text-label-sm"
            :disabled="printingId === item.id"
            @click="handleCetak(item)"
          >
            {{ printingId === item.id ? 'Memuat...' : 'Cetak KHS' }}
          </button>
        </template>
        <template #cell-nilaiSemester="{ item }">
          <div class="flex items-center gap-2">
            <div class="w-24">
              <SelectInput v-model="selectedSemester[item.id]" :options="semesterOptionsFor(item)" placeholder="-" />
            </div>
            <AppButton :disabled="printingId === item.id" @click="handleCetak(item)">
              {{ printingId === item.id ? 'Memuat...' : 'Cetak' }}
            </AppButton>
          </div>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>

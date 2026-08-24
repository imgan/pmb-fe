<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import { matakuliahAktifApi } from '@/api/kurikulum';
import { jurusanApi } from '@/api/jurusan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import type { Kurikulum } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const jurusanOptions = ref<SelectOption[]>([]);
const tahunAjaranOptions = ref<SelectOption[]>([]);
const loadingOptions = ref(true);
onMounted(async () => {
  try {
    const [jurusanResult, tahunAjaranResult] = await Promise.all([
      jurusanApi.list({ limit: 200 }),
      tahunAjaranApi.list({ limit: 100 }),
    ]);
    jurusanOptions.value = jurusanResult.data.map((j) => ({ value: j.id, label: j.namaJurusan }));
    tahunAjaranOptions.value = tahunAjaranResult.data.map((t) => ({ value: t.id, label: t.nama }));
  } finally {
    loadingOptions.value = false;
  }
});

const SEMESTER_OPTIONS: SelectOption[] = Array.from({ length: 14 }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1}` }));

const jurusanFilter = ref<number | ''>('');
const tahunKurikulumFilter = ref<number | ''>('');
const semesterKurikulumFilter = ref<number | ''>('');
const aktifTahunAjaranFilter = ref<number | ''>('');
const aktifSemesterFilter = ref<number | ''>('');
const search = ref('');

const items = ref<Kurikulum[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(false);
const error = ref<string | null>(null);
const hasSearched = ref(false);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await matakuliahAktifApi.list({
      page: page.value,
      limit: 10,
      search: search.value || undefined,
      jurusanId: jurusanFilter.value || undefined,
      tahunAjaranId: tahunKurikulumFilter.value || undefined,
      semester: semesterKurikulumFilter.value || undefined,
      aktifTahunAjaranId: aktifTahunAjaranFilter.value || undefined,
      aktifSemester: aktifSemesterFilter.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data matakuliah aktif');
  } finally {
    loading.value = false;
  }
};

const handlePeriksa = () => {
  hasSearched.value = true;
  page.value = 1;
  fetchItems();
};

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'kode', label: 'Kode Matakuliah' },
  { key: 'mataKuliah', label: 'Nama Matakuliah' },
  { key: 'sksTeori', label: 'SKS Teori', align: 'center' },
  { key: 'sksPraktek', label: 'SKS Praktek', align: 'center' },
  { key: 'sksLab', label: 'SKS Lab', align: 'center' },
  { key: 'sksTotal', label: 'SKS Total', align: 'center' },
  { key: 'semester', label: 'Semester', align: 'center' },
];

const detailItem = ref<Kurikulum | null>(null);
const openDetail = (item: Kurikulum) => {
  detailItem.value = item;
};
const closeDetail = () => {
  detailItem.value = null;
};
</script>

<template>
  <div>
    <PageHeader title="Master Matakuliah Aktif" subtitle="Mata kuliah dari kurikulum yang aktif dijadwalkan pada tahun akademik & semester tertentu." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface-bright">
        <SelectInput v-model="jurusanFilter" label="Prodi" placeholder="-- Pilih Program --" :disabled="loadingOptions" :options="jurusanOptions" />
        <SelectInput v-model="tahunKurikulumFilter" label="Tahun Kurikulum" placeholder="-- Tahun --" :disabled="loadingOptions" :options="tahunAjaranOptions" />
        <SelectInput v-model="semesterKurikulumFilter" label="Semester Kurikulum" placeholder="-- Semester --" :options="SEMESTER_OPTIONS" />
      </div>
      <div class="p-4 border-b border-outline-variant grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-surface-bright">
        <SelectInput v-model="aktifTahunAjaranFilter" label="Aktif Tahun Akademik" placeholder="-- Pilih Tahun Akademik --" :disabled="loadingOptions" :options="tahunAjaranOptions" />
        <SelectInput v-model="aktifSemesterFilter" label="Aktif Semester" placeholder="-- Semester --" :options="SEMESTER_OPTIONS" />
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Matakuliah Aktif</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari kode atau nama matakuliah..." @keyup.enter="handlePeriksa" />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        :empty-message="hasSearched ? 'Belum ada data matakuliah aktif' : 'Pilih filter lalu klik Periksa'"
      >
        <template #actions="{ item }">
          <button type="button" class="text-primary hover:opacity-80" title="Lihat Detail" @click="openDetail(item)">
            <span class="material-symbols-outlined" style="font-size: 20px">visibility</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-if="hasSearched" v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="!!detailItem" title="Detail Matakuliah" size="md" @update:model-value="closeDetail">
      <div v-if="detailItem" class="space-y-2 text-body-sm">
        <p><span class="text-on-surface-variant">Kode:</span> {{ detailItem.kode }}</p>
        <p><span class="text-on-surface-variant">Mata Kuliah:</span> {{ detailItem.mataKuliah }}</p>
        <p><span class="text-on-surface-variant">Semester:</span> {{ detailItem.semester ?? '-' }}</p>
        <p>
          <span class="text-on-surface-variant">SKS (Teori/Praktek/Lab/Simulasi/Total):</span>
          {{ detailItem.sksTeori }} / {{ detailItem.sksPraktek }} / {{ detailItem.sksLab }} / {{ detailItem.sksSimulasi }} /
          {{ detailItem.sksTotal }}
        </p>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeDetail">Tutup</AppButton>
      </template>
    </Modal>
  </div>
</template>

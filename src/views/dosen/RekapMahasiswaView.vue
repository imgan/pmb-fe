<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { dosenJadwalApi, dosenRekapMahasiswaApi } from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import type { PagingMeta } from '@/types/common';
import type { RekapMahasiswaRow } from '@/types/entities';

const jadwalOptions = ref<{ value: number; label: string }[]>([]);
const selectedJadwalId = ref<number | ''>('');
const appliedJadwalId = ref<number | ''>('');

const items = ref<RekapMahasiswaRow[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const search = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No' },
  { key: 'nim', label: 'NIM' },
  { key: 'namaLengkap', label: 'Nama Mahasiswa' },
];

const fetchMahasiswa = async () => {
  if (!appliedJadwalId.value) {
    items.value = [];
    meta.value = { total: 0, page: 1, limit: 10, totalPages: 1 };
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const result = await dosenRekapMahasiswaApi.list({
      jadwalKuliahId: Number(appliedJadwalId.value),
      page: page.value,
      limit: 10,
      search: search.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat rekap mahasiswa');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const jadwalList = await dosenJadwalApi.listMine();
    jadwalOptions.value = jadwalList.map((j) => ({
      value: j.id,
      label: `[${j.kodeMataKuliah}]${j.namaMataKuliah}-${j.kelas}`,
    }));
  } catch {
    jadwalOptions.value = [];
  }
});

const handleTampilkan = () => {
  appliedJadwalId.value = selectedJadwalId.value;
  page.value = 1;
  fetchMahasiswa();
};

let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    page.value = 1;
    fetchMahasiswa();
  }, 350);
});

watch(page, fetchMahasiswa);
</script>

<template>
  <div>
    <PageHeader title="Rekap Mahasiswa" subtitle="Dosen / Harian / Rekap Mahasiswa" />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-96">
          <SelectInput
            v-model="selectedJadwalId"
            placeholder="-- Pilih Matakuliah --"
            :options="jadwalOptions"
          />
        </div>
        <AppButton icon="search" @click="handleTampilkan">Tampilkan</AppButton>
      </div>

      <div v-if="appliedJadwalId" class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-72">
          <SearchInput v-model="search" placeholder="Cari NIM atau nama..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="items.map((it, idx) => ({ ...it, no: (meta.page - 1) * meta.limit + idx + 1 }))"
        :loading="loading"
        :show-actions="false"
        :empty-message="appliedJadwalId ? 'Belum ada mahasiswa pada mata kuliah ini' : 'Pilih matakuliah lalu klik Tampilkan'"
      >
        <template #cell-no="{ item }">{{ item.no }}</template>
        <template #cell-nim="{ item }">{{ item.nim ?? '-' }}</template>
        <template #cell-namaLengkap="{ item }">{{ item.namaLengkap ?? '-' }}</template>
      </DataTable>

      <Pagination v-if="appliedJadwalId" v-model="page" :meta="meta" />
    </section>
  </div>
</template>

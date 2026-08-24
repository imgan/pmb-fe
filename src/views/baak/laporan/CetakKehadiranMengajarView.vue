<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { jadwalKuliahApi } from '@/api/jadwalKuliah';
import { laporanKehadiranMengajarApi } from '@/api/laporanKehadiranMengajar';
import { extractErrorMessage } from '@/api/http';
import { openBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';
import type { HariKuliah, JadwalKuliah } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const HARI_LABEL: Record<HariKuliah, string> = {
  SENIN: 'Senin', SELASA: 'Selasa', RABU: 'Rabu', KAMIS: 'Kamis', JUMAT: 'Jumat', SABTU: 'Sabtu',
};

const programOptions = ref<{ value: string; label: string }[]>([]);
const selectedProgram = ref('');
const appliedProgram = ref('');
const search = ref('');

const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const pageSize = ref(10);

const items = ref<JadwalKuliah[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(true);
const error = ref<string | null>(null);

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * pageSize.value + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'hari', label: 'Hari' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'kodeMataKuliah', label: 'Kode MK' },
  { key: 'namaMataKuliah', label: 'Mata Kuliah' },
  { key: 'dosenKordinator', label: 'Dosen' },
  { key: 'jam', label: 'Jam', align: 'center' },
  { key: 'ruangan', label: 'Ruang' },
  { key: 'templateKehadiran', label: 'Template Kehadiran', align: 'center' },
  { key: 'templateRealisasi', label: 'Template Realisasi', align: 'center' },
];

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await jadwalKuliahApi.list({
      page: page.value,
      limit: pageSize.value,
      search: search.value || undefined,
      kelas: appliedProgram.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data template kehadiran');
  } finally {
    loading.value = false;
  }
};

const handlePeriksa = () => {
  appliedProgram.value = selectedProgram.value;
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

onMounted(async () => {
  try {
    const kelasList = await jadwalKuliahApi.kelasOptions();
    programOptions.value = kelasList.map((k) => ({ value: k, label: k }));
  } catch {
    programOptions.value = [];
  }
  fetchItems();
});

const printingKey = ref<string | null>(null);
const handleCetak = async (jadwalKuliahId: number, jenis: 'kehadiran' | 'realisasi') => {
  const key = `${jadwalKuliahId}-${jenis}`;
  printingKey.value = key;
  try {
    const blob = jenis === 'kehadiran'
      ? await laporanKehadiranMengajarApi.templateKehadiranPdf(jadwalKuliahId)
      : await laporanKehadiranMengajarApi.templateRealisasiPdf(jadwalKuliahId);
    openBlob(blob);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka dokumen'));
  } finally {
    if (printingKey.value === key) printingKey.value = null;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Template Kehadiran" subtitle="Cetak daftar hadir mengajar & rekap realisasi per jadwal kuliah." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-64">
          <SelectInput v-model="selectedProgram" placeholder="-- Pilih Program --" :options="programOptions" />
        </div>
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        {{ appliedProgram ? `Data Template Kehadiran - Kelas ${appliedProgram}` : 'Semua Data Template Kehadiran' }}
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

      <DataTable :columns="columns" :items="rows" :loading="loading" :show-actions="false" empty-message="Belum ada data jadwal kuliah">
        <template #cell-hari="{ item }">{{ item.hari && item.hari.length ? item.hari.map((h: HariKuliah) => HARI_LABEL[h]).join(', ') : '-' }}</template>
        <template #cell-dosenKordinator="{ item }">{{ item.dosenKordinator?.namaLengkap ?? '-' }}</template>
        <template #cell-jam="{ item }">{{ item.jam ?? '-' }}</template>
        <template #cell-ruangan="{ item }">{{ item.ruangan ?? '-' }}</template>
        <template #cell-templateKehadiran="{ item }">
          <button
            type="button"
            class="text-primary hover:underline disabled:opacity-50 disabled:no-underline text-label-sm"
            :disabled="printingKey === `${item.id}-kehadiran`"
            @click="handleCetak(item.id, 'kehadiran')"
          >
            {{ printingKey === `${item.id}-kehadiran` ? 'Memuat...' : '[ Cetak ]' }}
          </button>
        </template>
        <template #cell-templateRealisasi="{ item }">
          <button
            type="button"
            class="text-primary hover:underline disabled:opacity-50 disabled:no-underline text-label-sm"
            :disabled="printingKey === `${item.id}-realisasi`"
            @click="handleCetak(item.id, 'realisasi')"
          >
            {{ printingKey === `${item.id}-realisasi` ? 'Memuat...' : '[ Cetak ]' }}
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>

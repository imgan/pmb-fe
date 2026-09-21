<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { laporanIjazahApi } from '@/api/laporanIjazah';
import { jurusanApi } from '@/api/jurusan';
import { extractErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/format';
import { openBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';
import type { JenisCetakIjazah, LulusanItem } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const jurusanOptions = ref<{ value: number; label: string }[]>([]);
const selectedJurusan = ref<number | ''>('');
const appliedJurusan = ref<number | ''>('');

const tahunOptions = ref<{ value: number; label: string }[]>([]);
const selectedTahun = ref<number | ''>('');
const appliedTahun = ref<number | ''>('');

const nimInput = ref('');
const appliedNim = ref('');
const search = ref('');

const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const pageSize = ref(10);

const items = ref<LulusanItem[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(true);
const error = ref<string | null>(null);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nama', label: 'Nama' },
  { key: 'lahir', label: 'Tmp/Tgl Lahir' },
  { key: 'totalSks', label: 'Total SKS', align: 'center' },
  { key: 'ipk', label: 'IPK', align: 'center' },
  { key: 'predikat', label: 'Predikat', align: 'center' },
  { key: 'skYudisium', label: 'No. SK Yudisium' },
  { key: 'cetak', label: 'Cetak' },
];

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * pageSize.value + index + 1 }))
);

const CETAK_OPTIONS: { jenis: JenisCetakIjazah; label: string }[] = [
  { jenis: 'ijazah', label: 'Ijazah' },
  { jenis: 'ijazah-duplikat', label: 'Ijazah Duplikat' },
  { jenis: 'transkrip', label: 'Transkrip' },
  { jenis: 'surat-keterangan-lulus', label: 'Surat Ket. Lulus' },
  { jenis: 'skpi', label: 'SKPI' },
];

const printingKey = ref<string | null>(null);
const handleCetak = async (mahasiswaId: number, jenis: JenisCetakIjazah) => {
  const key = `${mahasiswaId}-${jenis}`;
  printingKey.value = key;
  try {
    const blob = await laporanIjazahApi.cetakPdf(mahasiswaId, jenis);
    openBlob(blob);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka dokumen'));
  } finally {
    if (printingKey.value === key) printingKey.value = null;
  }
};

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await laporanIjazahApi.list({
      page: page.value,
      limit: pageSize.value,
      search: search.value || undefined,
      jurusanId: appliedJurusan.value || undefined,
      tahunLulus: appliedTahun.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data laporan ijazah & transkrip');
  } finally {
    loading.value = false;
  }
};

const handlePeriksaProgram = () => {
  appliedJurusan.value = selectedJurusan.value;
  page.value = 1;
  fetchItems();
};

const handlePeriksaTahun = () => {
  appliedTahun.value = selectedTahun.value;
  page.value = 1;
  fetchItems();
};

const handlePeriksaNim = () => {
  appliedNim.value = nimInput.value.trim();
  search.value = appliedNim.value;
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
    const [jurusanResult, tahunResult] = await Promise.all([
      jurusanApi.list({ limit: 100 }),
      laporanIjazahApi.tahunLulusOptions(),
    ]);
    jurusanOptions.value = jurusanResult.data.map((j) => ({ value: j.id, label: j.namaJurusan.toUpperCase() }));
    tahunOptions.value = tahunResult.map((t) => ({ value: t, label: String(t) }));
  } catch {
    jurusanOptions.value = [];
    tahunOptions.value = [];
  }
  fetchItems();
});
</script>

<template>
  <div>
    <PageHeader title="Ijazah dan Transkip Nilai" subtitle="Cetak ijazah, transkrip, dan dokumen kelulusan mahasiswa." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row flex-wrap gap-3 bg-surface-bright">
        <div class="w-full md:w-56">
          <SelectInput v-model="selectedJurusan" placeholder="Program Studi" :options="jurusanOptions" />
        </div>
        <AppButton icon="search" @click="handlePeriksaProgram">Periksa</AppButton>

        <div class="w-full md:w-40">
          <SelectInput v-model="selectedTahun" placeholder="Tahun Lulus" :options="tahunOptions" />
        </div>
        <AppButton icon="search" @click="handlePeriksaTahun">Periksa</AppButton>
      </div>
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-64">
          <TextInput v-model="nimInput" placeholder="Nomor Induk Mahasiswa" @keyup.enter="handlePeriksaNim" />
        </div>
        <AppButton icon="search" @click="handlePeriksaNim">Periksa</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        Semua Data Laporan Ijazah dan Transkrip
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

      <DataTable :columns="columns" :items="rows" :loading="loading" :show-actions="false" empty-message="Belum ada mahasiswa yang yudisium">
        <template #cell-nama="{ item }">
          <p class="font-medium text-on-surface">[{{ item.nim }}] {{ item.namaLengkap?.toUpperCase() }}</p>
          <p class="text-label-sm text-on-surface-variant">{{ item.namaJurusan ?? '-' }}</p>
        </template>
        <template #cell-lahir="{ item }">{{ item.tempatLahir ?? '-' }}, {{ item.tanggalLahir ? formatDate(item.tanggalLahir) : '-' }}</template>
        <template #cell-skYudisium="{ item }">{{ item.noSk ?? '-' }} / {{ item.tanggalYudisium ? formatDate(item.tanggalYudisium) : '-' }}</template>
        <template #cell-cetak="{ item }">
          <div class="flex flex-wrap gap-x-1 gap-y-1 text-label-sm">
            <button
              v-for="opt in CETAK_OPTIONS"
              :key="opt.jenis"
              type="button"
              class="text-primary hover:underline whitespace-nowrap disabled:opacity-50 disabled:no-underline"
              :disabled="printingKey === `${item.mahasiswaId}-${opt.jenis}`"
              @click="handleCetak(item.mahasiswaId, opt.jenis)"
            >
              [ {{ printingKey === `${item.mahasiswaId}-${opt.jenis}` ? 'Memuat...' : opt.label }} ]
            </button>
          </div>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { tagihanKuliahApi } from '@/api/tagihanKuliah';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr } from '@/utils/format';
import { toastSuccess, toastError } from '@/utils/swal';
import type { TagihanKuliah } from '@/types/entities';

interface Option {
  value: string | number;
  label: string;
}

const tahunAjaranOptions = ref<Option[]>([]);
const selectedTahunAjaran = ref<number | ''>('');

const items = ref<TagihanKuliah[]>([]);
const meta = ref({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(false);
const generating = ref(false);
const error = ref<string | null>(null);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await tagihanKuliahApi.list({
      page: page.value,
      limit: 10,
      tahunAjaranId: selectedTahunAjaran.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data tagihan kuliah');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const { data } = await tahunAjaranApi.list({ limit: 200 });
    tahunAjaranOptions.value = data
      .slice()
      .sort((a, b) => b.tahunMulai - a.tahunMulai)
      .map((ta) => ({ value: ta.id, label: `${ta.nama} - ${ta.jenisSemester}` }));
    const active = data.find((ta) => ta.isActive);
    if (active) selectedTahunAjaran.value = active.id;
  } catch {
    tahunAjaranOptions.value = [];
  }
  fetchItems();
});

watch(page, fetchItems);

const handleGenerate = async () => {
  if (!selectedTahunAjaran.value) {
    toastError('Pilih tahun ajaran terlebih dahulu');
    return;
  }
  generating.value = true;
  try {
    const result = await tagihanKuliahApi.generate(Number(selectedTahunAjaran.value));
    toastSuccess(
      `${result.generated} tagihan baru dibuat, ${result.updated} tagihan diperbarui` +
        (result.skippedCount ? `, ${result.skippedCount} mahasiswa dilewati (tarif belum terdaftar)` : '')
    );
    page.value = 1;
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal generate tagihan'));
  } finally {
    generating.value = false;
  }
};

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'prodi', label: 'Prodi' },
  { key: 'semester', label: 'Semester', align: 'center' },
  { key: 'sksDiambil', label: 'SKS Diambil', align: 'center' },
  { key: 'hargaPerSks', label: 'Harga/SKS', align: 'right' },
  { key: 'biayaSks', label: 'Biaya SKS', align: 'right' },
  { key: 'biayaLain', label: 'Biaya Lain-lain', align: 'right' },
  { key: 'totalTagihan', label: 'Total Tagihan', align: 'right' },
  { key: 'totalDibayar', label: 'Dibayar', align: 'right' },
  { key: 'sisaTagihan', label: 'Sisa', align: 'right' },
];
</script>

<template>
  <div>
    <PageHeader title="Generate Tagihan" subtitle="Generate tagihan biaya kuliah mahasiswa per periode." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-3 md:items-end">
        <div class="w-full md:w-72">
          <SelectInput
            v-model="selectedTahunAjaran"
            label="Tahun Ajaran"
            placeholder="-- Pilih Tahun Ajaran --"
            :options="tahunAjaranOptions"
          />
        </div>
        <AppButton icon="search" variant="secondary" :disabled="loading" @click="fetchItems">Tampilkan</AppButton>
        <AppButton icon="bolt" :disabled="generating" @click="handleGenerate">
          {{ generating ? 'Generating...' : 'Generate Tagihan' }}
        </AppButton>
      </div>
      <p class="mt-3 text-body-sm text-on-surface-variant">
        Generate hanya membuat tagihan untuk mahasiswa yang belum punya tagihan di tahun ajaran ini (aman dijalankan
        berulang). Mahasiswa yang tarif kuliahnya belum ada di Master Tarif Kuliah akan dilewati.
      </p>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Daftar Tagihan Kuliah</div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="rows" :loading="loading" :show-actions="false" empty-message="Belum ada tagihan untuk tahun ajaran ini">
        <template #cell-nim="{ item }">{{ item.mahasiswa?.nim ?? '-' }}</template>
        <template #cell-nama="{ item }">{{ item.mahasiswa?.namaLengkap ?? '-' }}</template>
        <template #cell-prodi="{ item }">{{ item.mahasiswa?.jurusan?.namaJurusan ?? '-' }}</template>
        <template #cell-sksDiambil="{ item }">{{ item.sksDiambil }}</template>
        <template #cell-hargaPerSks="{ item }">{{ formatCurrencyIdr(item.hargaPerSks) }}</template>
        <template #cell-biayaSks="{ item }">{{ formatCurrencyIdr(item.biayaSks) }}</template>
        <template #cell-biayaLain="{ item }">{{ formatCurrencyIdr(item.biayaBpp + item.biayaSpp) }}</template>
        <template #cell-totalTagihan="{ item }">{{ formatCurrencyIdr(item.totalTagihan) }}</template>
        <template #cell-totalDibayar="{ item }">{{ formatCurrencyIdr(item.totalDibayar) }}</template>
        <template #cell-sisaTagihan="{ item }">
          <span :class="item.sisaTagihan > 0 ? 'text-error font-medium' : 'text-on-surface'">
            {{ formatCurrencyIdr(item.sisaTagihan) }}
          </span>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>

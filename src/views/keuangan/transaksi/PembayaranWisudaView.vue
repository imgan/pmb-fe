<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import TextInput from '@/components/ui/TextInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { mahasiswaApi } from '@/api/mahasiswa';
import { extractErrorMessage } from '@/api/http';
import type { Mahasiswa } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const router = useRouter();

const nimInput = ref('');
const namaInput = ref('');
const appliedKeyword = ref('');
const searched = ref(false);

const items = ref<Mahasiswa[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const error = ref<string | null>(null);

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'namaLengkap', label: 'Nama' },
  { key: 'jurusan', label: 'Kelas' },
  { key: 'tahunMasuk', label: 'Tahun Masuk', align: 'center' },
];

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await mahasiswaApi.list({ page: page.value, limit: pageSize.value, search: appliedKeyword.value || undefined });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data mahasiswa');
  } finally {
    loading.value = false;
  }
};

const handlePeriksa = () => {
  appliedKeyword.value = nimInput.value.trim() || namaInput.value.trim();
  page.value = 1;
  searched.value = true;
  fetchItems();
};

const openDetail = (id: number) => {
  router.push({ name: 'keuangan-pembayaran-wisuda-detail', params: { mahasiswaId: id } });
};

watch(page, fetchItems);
watch(pageSize, () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
});

fetchItems();
</script>

<template>
  <div>
    <PageHeader title="Pembayaran Wisuda" subtitle="Transaksi pembayaran biaya wisuda mahasiswa." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-72">
          <TextInput v-model="nimInput" placeholder="Nomor Induk Mahasiswa" @keyup.enter="handlePeriksa" />
        </div>
        <div class="w-full md:w-72">
          <TextInput v-model="namaInput" placeholder="Nama Mahasiswa" @keyup.enter="handlePeriksa" />
        </div>
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        {{ appliedKeyword ? `Hasil Pencarian "${appliedKeyword}"` : 'Semua Data Master Pembayaran Wisuda' }}
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="pageSize" />
      </div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        :empty-message="searched ? 'Mahasiswa tidak ditemukan' : 'Belum ada data mahasiswa'"
      >
        <template #cell-jurusan="{ item }">{{ item.jurusan?.namaJurusan ?? '-' }}</template>
        <template #actions="{ item }">
          <AppButton icon="payments" @click="openDetail(item.id)">Pembayaran</AppButton>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>

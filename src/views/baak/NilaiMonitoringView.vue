<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import TextInput from '@/components/ui/TextInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { nilaiMahasiswaApi } from '@/api/nilaiMahasiswa';
import { extractErrorMessage } from '@/api/http';
import type { NilaiMahasiswaMahasiswa } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const router = useRouter();

const keyword = ref('');
const appliedKeyword = ref('');

const items = ref<NilaiMahasiswaMahasiswa[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(false);
const error = ref<string | null>(null);
const searched = ref(false);

const columns: DataTableColumn[] = [
  { key: 'nim', label: 'NIM' },
  { key: 'namaLengkap', label: 'Nama' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'detail', label: 'Detail', align: 'center' },
];

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await nilaiMahasiswaApi.searchMahasiswa({
      page: page.value,
      limit: 10,
      search: appliedKeyword.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data monitoring nilai');
  } finally {
    loading.value = false;
  }
};

const handlePeriksa = () => {
  appliedKeyword.value = keyword.value.trim();
  page.value = 1;
  searched.value = true;
  fetchItems();
};

const openDetail = (id: number) => {
  router.push({ name: 'baak-monitoring-nilai-detail', params: { mahasiswaId: id } });
};

watch(page, fetchItems);
</script>

<template>
  <div>
    <PageHeader title="Master Monitoring Nilai" subtitle="Pantau nilai akhir mahasiswa per mata kuliah." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-72">
          <TextInput v-model="keyword" placeholder="NIM atau Nama Mahasiswa" @keyup.enter="handlePeriksa" />
        </div>
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        {{ appliedKeyword ? `Hasil Pencarian "${appliedKeyword}"` : 'Semua Data Master Monitoring Nilai' }}
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        :show-actions="false"
        :empty-message="searched ? 'Mahasiswa tidak ditemukan' : 'Masukkan NIM atau nama lalu klik Periksa'"
      >
        <template #cell-detail="{ item }">
          <button
            type="button"
            class="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary text-on-primary hover:opacity-90 transition-opacity"
            title="Lihat Detail Nilai"
            @click="openDetail(item.id)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">description</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>

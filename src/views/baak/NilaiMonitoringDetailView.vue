<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { nilaiMahasiswaApi } from '@/api/nilaiMahasiswa';
import { extractErrorMessage } from '@/api/http';
import type { Grade, NilaiMahasiswaMahasiswa, NilaiMahasiswaEntry } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const props = defineProps<{ mahasiswaId: string }>();

const mahasiswa = ref<NilaiMahasiswaMahasiswa | null>(null);
const items = ref<NilaiMahasiswaEntry[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const loading = ref(true);
const error = ref<string | null>(null);

const sortBy = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('asc');

const columns: DataTableColumn[] = [
  { key: 'kodeMataKuliah', label: 'Kode Matakuliah', sortable: true },
  { key: 'namaMataKuliah', label: 'Nama Matakuliah', sortable: true },
  { key: 'sks', label: 'SKS', align: 'center', sortable: true },
  { key: 'semester', label: 'Semester', align: 'center', sortable: true },
  { key: 'partisipatif', label: 'Partisipatif', align: 'center', sortable: true },
  { key: 'proyek', label: 'Proyek', align: 'center', sortable: true },
  { key: 'quiz', label: 'Quiz', align: 'center', sortable: true },
  { key: 'tugas', label: 'Tugas', align: 'center', sortable: true },
  { key: 'uts', label: 'UTS', align: 'center', sortable: true },
  { key: 'uas', label: 'UAS', align: 'center', sortable: true },
  { key: 'nilai', label: 'Nilai', align: 'center', sortable: true },
  { key: 'grade', label: 'Grade', align: 'center', sortable: true },
];

const gradeVariant = (grade: Grade): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (grade === 'A') return 'success';
  if (grade === 'B' || grade === 'C') return 'warning';
  return 'danger';
};

const fetchNilai = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await nilaiMahasiswaApi.getNilaiByMahasiswa(props.mahasiswaId, {
      page: page.value,
      limit: 10,
      sortBy: sortBy.value || undefined,
      sortDir: sortBy.value ? sortDir.value : undefined,
    });
    mahasiswa.value = result.mahasiswa;
    items.value = result.nilai;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data nilai mahasiswa');
  } finally {
    loading.value = false;
  }
};

const handleSort = (key: string) => {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    sortDir.value = 'asc';
  }
  page.value = 1;
  fetchNilai();
};

watch(page, fetchNilai);

onMounted(fetchNilai);
</script>

<template>
  <div>
    <PageHeader
      title="Master Detail Monitoring Nilai"
      :back-to="{ name: 'baak-monitoring-nilai' }"
      back-label="Kembali ke Monitoring Nilai"
    />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        Semua Data Master Detail Monitoring Nilai
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div v-else-if="loading && !mahasiswa" class="p-4 text-body-sm text-on-surface-variant">Memuat data...</div>

      <div
        v-else-if="mahasiswa"
        class="p-4 border-b border-outline-variant grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm"
      >
        <span class="text-on-surface-variant">NIM</span>
        <span class="text-on-surface">: {{ mahasiswa.nim }}</span>
        <span class="text-on-surface-variant">Nama</span>
        <span class="text-on-surface">: {{ mahasiswa.namaLengkap }}</span>
        <span class="text-on-surface-variant">Program Studi</span>
        <span class="text-on-surface">: {{ mahasiswa.programStudi ?? '-' }}</span>
      </div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        :show-actions="false"
        empty-message="Belum ada data nilai"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-partisipatif="{ item }">{{ item.partisipatif.toFixed(2) }}</template>
        <template #cell-proyek="{ item }">{{ item.proyek.toFixed(2) }}</template>
        <template #cell-quiz="{ item }">{{ item.quiz.toFixed(2) }}</template>
        <template #cell-tugas="{ item }">{{ item.tugas.toFixed(2) }}</template>
        <template #cell-uts="{ item }">{{ item.uts.toFixed(2) }}</template>
        <template #cell-uas="{ item }">{{ item.uas.toFixed(2) }}</template>
        <template #cell-nilai="{ item }">{{ item.nilai.toFixed(2) }}</template>
        <template #cell-grade="{ item }">
          <StatusBadge :label="item.grade" :variant="gradeVariant(item.grade)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>

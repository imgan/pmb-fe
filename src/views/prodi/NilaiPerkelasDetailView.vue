<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import { nilaiPerkelasApi } from '@/api/nilaiPerkelas';
import { extractErrorMessage } from '@/api/http';
import type { NilaiPerkelasDetail } from '@/types/entities';

const props = defineProps<{ id: string }>();

const detail = ref<NilaiPerkelasDetail | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'namaLengkap', label: 'Nama' },
  { key: 'uts', label: 'UTS', align: 'center' },
  { key: 'uas', label: 'UAS', align: 'center' },
  { key: 'nilaiAkhir', label: 'Nilai Akhir', align: 'center' },
  { key: 'grade', label: 'Grade', align: 'center' },
];

const rows = () => (detail.value?.roster ?? []).map((item, index) => ({ ...item, id: item.mahasiswaId, no: index + 1 }));

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    detail.value = await nilaiPerkelasApi.detail(props.id);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat detail nilai perkelas');
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div>
    <PageHeader title="Detail Nilai Perkelas" :back-to="{ name: 'prodi-nilai-perkelas' }" back-label="Kembali ke Nilai Perkelas" />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Detail Nilai Perkelas</div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div v-else-if="loading" class="p-4 text-body-sm text-on-surface-variant">Memuat data...</div>

      <div v-else-if="detail" class="p-4 border-b border-outline-variant grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm">
        <span class="text-on-surface-variant">Mata Kuliah</span>
        <span class="text-on-surface">: [{{ detail.jadwal.kodeMataKuliah }}] {{ detail.jadwal.namaMataKuliah }}</span>
        <span class="text-on-surface-variant">Kelas</span>
        <span class="text-on-surface">: {{ detail.jadwal.kelas }}</span>
        <span class="text-on-surface-variant">Dosen</span>
        <span class="text-on-surface">: {{ detail.jadwal.dosen ?? '-' }}</span>
      </div>

      <DataTable
        :columns="columns"
        :items="rows()"
        :loading="false"
        :show-actions="false"
        empty-message="Belum ada mahasiswa yang mengambil FRS untuk kelas ini"
      >
        <template #cell-uts="{ item }">{{ item.uts ?? '-' }}</template>
        <template #cell-uas="{ item }">{{ item.uas ?? '-' }}</template>
        <template #cell-nilaiAkhir="{ item }">{{ item.nilaiAkhir ?? '-' }}</template>
        <template #cell-grade="{ item }">{{ item.grade ?? '-' }}</template>
      </DataTable>
    </section>
  </div>
</template>

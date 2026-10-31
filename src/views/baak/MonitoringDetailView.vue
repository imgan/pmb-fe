<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { jadwalKuliahApi, type PesertaKelas } from '@/api/jadwalKuliah';
import { extractErrorMessage } from '@/api/http';
import type { JadwalKuliah } from '@/types/entities';
import type { PagingMeta } from '@/types/common';

const props = withDefaults(defineProps<{ id: string; modul?: 'baak' | 'prodi' }>(), { modul: 'baak' });

const jadwal = ref<JadwalKuliah | null>(null);
const peserta = ref<PesertaKelas[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const search = ref('');
const pageSizeOptions = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const pageSize = ref(10);
const page = ref(1);

const STATUS_KRS: Record<PesertaKelas['statusKrs'], { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  DRAFT: { label: 'KRS Draft', variant: 'neutral' },
  DIAJUKAN: { label: 'KRS Diajukan', variant: 'warning' },
  DISETUJUI: { label: 'KRS Disetujui', variant: 'success' },
  DITOLAK: { label: 'KRS Ditolak', variant: 'danger' },
};
const statusMahasiswaLabel = (s: string) =>
  ({ AKTIF: 'Aktif', TIDAK_AKTIF: 'Tidak Aktif', CUTI: 'Cuti' } as Record<string, string>)[s] ?? s.replace(/_/g, ' ');

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'shift', label: 'Shift/Non' },
  { key: 'status', label: 'STATUS' },
  { key: 'waktuKuliah', label: 'Waktu Kuliah' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'kehadiran', label: 'Kehadiran', align: 'center' },
];

// Daftar peserta dimuat sekali; pencarian & paging di sisi klien (satu kelas paling puluhan mahasiswa).
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? peserta.value.filter((p) => `${p.nim} ${p.namaLengkap}`.toLowerCase().includes(q)) : peserta.value;
});
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value).map((p, i) => ({
    ...p,
    no: (page.value - 1) * pageSize.value + i + 1,
  }))
);
const meta = computed<PagingMeta>(() => ({
  total: filtered.value.length,
  page: page.value,
  limit: pageSize.value,
  totalPages: Math.max(Math.ceil(filtered.value.length / pageSize.value), 1),
}));
watch([search, pageSize], () => {
  page.value = 1;
});

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    [jadwal.value, peserta.value] = await Promise.all([jadwalKuliahApi.get(props.id), jadwalKuliahApi.peserta(props.id)]);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data monitoring');
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div>
    <PageHeader title="Master Detail Monitoring" :back-to="{ name: modul === 'prodi' ? 'prodi-monitoring-jadwal' : 'baak-monitoring' }" back-label="Kembali ke Monitoring" />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        Semua Data Master Detail Monitoring
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div v-else-if="jadwal" class="p-4 border-b border-outline-variant grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm">
        <span class="text-on-surface-variant">Mata Kuliah</span>
        <span class="text-on-surface">: [{{ jadwal.kodeMataKuliah }}] {{ jadwal.namaMataKuliah }}</span>
        <span class="text-on-surface-variant">Kelas</span>
        <span class="text-on-surface">: {{ jadwal.kelas }}</span>
        <span class="text-on-surface-variant">Dosen</span>
        <span class="text-on-surface">: {{ jadwal.dosenKordinator?.namaLengkap ?? '-' }}</span>
        <span class="text-on-surface-variant">Jumlah Peserta</span>
        <span class="text-on-surface">: {{ peserta.length }} mahasiswa ({{ peserta.filter((p) => p.statusKrs === 'DISETUJUI').length }} KRS disetujui)</span>
      </div>

      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <span>Show</span>
          <div class="w-20">
            <SelectInput v-model="pageSize" :options="pageSizeOptions" :clearable="false" />
          </div>
          <span>entries</span>
        </div>
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Search..." />
        </div>
      </div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        :show-actions="false"
        :empty-message="search ? 'Tidak ada mahasiswa yang cocok' : 'Belum ada mahasiswa yang mengambil kelas ini di KRS'"
      >
        <template #cell-nama="{ item }">{{ item.namaLengkap }}</template>
        <template #cell-shift="{ item }">{{ item.sistemKuliah ?? '-' }}</template>
        <template #cell-status="{ item }">
          <div class="flex flex-col items-start gap-1">
            <StatusBadge :label="STATUS_KRS[item.statusKrs].label" :variant="STATUS_KRS[item.statusKrs].variant" />
            <span v-if="item.statusMahasiswa !== 'AKTIF'" class="text-label-sm text-error">{{ statusMahasiswaLabel(item.statusMahasiswa) }}</span>
          </div>
        </template>
        <template #cell-waktuKuliah="{ item }">{{ item.waktuKuliah ?? '-' }}</template>
        <template #cell-kehadiran="{ item }">
          <template v-if="item.jumlahPertemuan">{{ item.hadir }}/{{ item.jumlahPertemuan }} ({{ item.persen }}%)</template>
          <span v-else class="text-on-surface-variant">Belum ada pertemuan</span>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>
  </div>
</template>

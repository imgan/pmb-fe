<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import type { JadwalUjianApi, JadwalUjianRow, JenisUjian, StatusUjian } from '@/api/jadwalUjian';
import type { PagingMeta } from '@/types/common';
import { extractErrorMessage } from '@/api/http';
import { downloadBlob } from '@/utils/download';
import { toastError, toastSuccess } from '@/utils/swal';

/**
 * Tabel Jadwal Ujian bersama (modul Prodi & portal Dosen). Baris = jadwal kuliah dari BAAK; yang
 * bisa diisi hanya Status, Sifat & Tanggal Ujian per jenis ujian (UTS/UAS).
 */
const props = withDefaults(
  defineProps<{
    api: JadwalUjianApi;
    canUpdate?: boolean;
    /** Opsi filter tahun akademik (prodi); dosen memakai Setting Tahun Akademik di profil. */
    tahunAjaranOptions?: { value: number; label: string }[];
    defaultTahunAjaranId?: number | '';
    /** Opsi filter prodi (id jurusan; prodi). Kosong = filter tidak ditampilkan. */
    prodiOptions?: { value: number; label: string }[];
    defaultJurusanId?: number | '';
    /** Prodi dikunci ke prodi sesi login. */
    prodiLocked?: boolean;
  }>(),
  { canUpdate: true, tahunAjaranOptions: () => [], defaultTahunAjaranId: '', prodiOptions: () => [], defaultJurusanId: '', prodiLocked: false }
);

const JENIS_OPTIONS = [
  { value: 'UTS', label: 'UTS' },
  { value: 'UAS', label: 'UAS' },
];
const STATUS_OPTIONS = [
  { value: 'ONLINE', label: 'ONLINE' },
  { value: 'OFFLINE', label: 'OFFLINE' },
];

const jenisUjian = ref<JenisUjian>('UTS');
const tahunAjaranId = ref<number | ''>(props.defaultTahunAjaranId);
watch(
  () => props.defaultTahunAjaranId,
  (v) => {
    tahunAjaranId.value = v;
    reload();
  }
);
const jurusanId = ref<number | ''>(props.defaultJurusanId);
watch(
  () => props.defaultJurusanId,
  (v) => (jurusanId.value = v)
);
const search = ref('');
const limit = ref(10);
const page = ref(1);
const items = ref<JadwalUjianRow[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const periodeLabel = ref<string | null>(null);
const sifatOptions = ref<{ value: string; label: string }[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const query = () => ({
  page: page.value,
  limit: limit.value,
  search: search.value || undefined,
  jenisUjian: jenisUjian.value,
  tahunAjaranId: tahunAjaranId.value || undefined,
  jurusanId: jurusanId.value || undefined,
});

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await props.api.list(query());
    items.value = result.data;
    meta.value = result.meta;
    periodeLabel.value = result.tahunAjaran?.label ?? null;
    sifatOptions.value = result.sifatOptions.map((s) => ({ value: s, label: s }));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat jadwal ujian');
  } finally {
    loading.value = false;
  }
};
const reload = () => {
  if (page.value === 1) fetchItems();
  else page.value = 1;
};
onMounted(fetchItems);
watch(page, fetchItems);
watch([limit, jenisUjian, tahunAjaranId, jurusanId], reload);
let debounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(debounce);
  debounce = setTimeout(reload, 350);
});

const columns = computed<DataTableColumn[]>(() => [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'mataKuliah', label: 'Mata Kuliah' },
  { key: 'dosen', label: 'Nama Dosen' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'sifat', label: 'Sifat' },
  { key: 'ruangan', label: 'Ruangan' },
  { key: 'jamKe', label: 'Jam ke', align: 'center' },
  { key: 'tanggal', label: 'Tanggal Ujian' },
  { key: 'pengawas', label: 'Rencana Pengawas' },
]);
const rows = computed(() => items.value.map((r, i) => ({ ...r, id: r.jadwalKuliahId, no: (page.value - 1) * limit.value + i + 1 })));

const formatTanggal = (v: string | null) => {
  if (!v) return '-';
  const [y, m, d] = v.split('-');
  return `${d}-${m}-${y}`;
};

// ---- Edit isian ----
const editing = ref<JadwalUjianRow | null>(null);
const form = reactive<{ status: StatusUjian | '' | null; sifat: string | number | null; tanggal: string }>({ status: '', sifat: '', tanggal: '' });
const saving = ref(false);
const formError = ref<string | null>(null);

const openEdit = (row: JadwalUjianRow) => {
  editing.value = row;
  formError.value = null;
  Object.assign(form, { status: row.status ?? '', sifat: row.sifat ?? '', tanggal: row.tanggal ?? '' });
};

const simpan = async () => {
  if (!editing.value) return;
  saving.value = true;
  formError.value = null;
  try {
    await props.api.simpan(editing.value.jadwalKuliahId, {
      jenisUjian: jenisUjian.value,
      status: (form.status || null) as StatusUjian | null,
      sifat: form.sifat ? String(form.sifat) : null,
      tanggal: form.tanggal || null,
    });
    toastSuccess(`Jadwal ${jenisUjian.value} disimpan`);
    editing.value = null;
    fetchItems();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan jadwal ujian');
  } finally {
    saving.value = false;
  }
};

// ---- Export ----
const exporting = ref(false);
const handleExport = async () => {
  if (!props.api.exportExcel) return;
  exporting.value = true;
  try {
    const periode = (periodeLabel.value ?? 'semua').replace(/[^A-Za-z0-9]+/g, '-');
    downloadBlob(await props.api.exportExcel({ ...query(), page: undefined, limit: undefined }), `jadwal-${jenisUjian.value.toLowerCase()}-${periode}.xlsx`);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal export jadwal ujian'));
  } finally {
    exporting.value = false;
  }
};
</script>

<template>
  <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
    <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
      Semua Data Master Jadwal Ujian {{ jenisUjian }}<span v-if="periodeLabel"> · {{ periodeLabel }}</span>
    </div>

    <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-end md:justify-between gap-3">
      <div class="flex flex-col sm:flex-row sm:items-end gap-3">
        <div class="w-full sm:w-32">
          <SelectInput v-model="jenisUjian" label="Ujian" :options="JENIS_OPTIONS" :clearable="false" />
        </div>
        <div v-if="prodiOptions.length" class="w-full sm:w-64">
          <SelectInput v-model="jurusanId" label="Prodi" placeholder="Semua Prodi" :options="prodiOptions" :disabled="prodiLocked" />
        </div>
        <div v-if="tahunAjaranOptions.length" class="w-full sm:w-60">
          <SelectInput v-model="tahunAjaranId" label="Tahun Akademik" placeholder="Tahun akademik aktif" :options="tahunAjaranOptions" />
        </div>
        <AppButton v-if="api.exportExcel" variant="secondary" icon="download" :disabled="exporting" @click="handleExport">
          {{ exporting ? 'Mengunduh...' : 'Export Excel' }}
        </AppButton>
      </div>
      <SearchInput v-model="search" placeholder="Cari kelas, mata kuliah, ruangan..." />
    </div>

    <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

    <div class="px-4 py-3 border-b border-outline-variant">
      <PageSizeSelect v-model="limit" />
    </div>

    <DataTable :columns="columns" :items="rows" :loading="loading" :show-actions="canUpdate" empty-message="Belum ada jadwal kuliah pada periode ini">
      <template #cell-mataKuliah="{ item }">
        <div>{{ item.kodeMataKuliah }}</div>
        <div class="text-on-surface-variant">[{{ item.namaMataKuliah }}]</div>
      </template>
      <template #cell-dosen="{ item }">
        <div>{{ item.nidnDosen ?? '-' }}</div>
        <div class="text-on-surface-variant">[{{ item.dosen ?? '-' }}]</div>
      </template>
      <template #cell-status="{ item }">{{ item.status ?? '-' }}</template>
      <template #cell-sifat="{ item }">{{ item.sifat ?? '-' }}</template>
      <template #cell-ruangan="{ item }">{{ item.ruangan || '-' }}</template>
      <template #cell-jamKe="{ item }">{{ item.jamKe ?? '-' }}</template>
      <template #cell-tanggal="{ item }"><span class="whitespace-nowrap">{{ formatTanggal(item.tanggal) }}</span></template>
      <template #cell-pengawas="{ item }">{{ item.pengawas || '-' }}</template>
      <template #actions="{ item }">
        <button
          type="button"
          class="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary text-on-primary hover:opacity-90 transition-opacity"
          title="Isi jadwal ujian"
          @click="openEdit(item)"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">edit</span>
        </button>
      </template>
    </DataTable>

    <Pagination v-model="page" :meta="meta" />

    <Modal
      :model-value="!!editing"
      :title="`Isi Jadwal ${jenisUjian}`"
      :subtitle="editing ? `${editing.kelas} · ${editing.kodeMataKuliah} ${editing.namaMataKuliah}` : ''"
      size="md"
      @update:model-value="editing = null"
    >
      <div v-if="editing" class="space-y-4">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <dl class="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-body-sm">
          <dt class="text-on-surface-variant">Dosen</dt>
          <dd>{{ editing.dosen ?? '-' }}</dd>
          <dt class="text-on-surface-variant">Ruangan / Jam ke</dt>
          <dd>{{ editing.ruangan || '-' }} / {{ editing.jamKe ?? '-' }}</dd>
        </dl>
        <SelectInput v-model="form.status" label="Status" placeholder="--Pilih status--" :options="STATUS_OPTIONS" />
        <SelectInput v-model="form.sifat" label="Sifat" placeholder="--Pilih sifat ujian--" :options="sifatOptions" />
        <TextInput v-model="form.tanggal" label="Tanggal Ujian" type="date" />
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="editing = null">Batal</AppButton>
        <AppButton :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>
  </section>
</template>

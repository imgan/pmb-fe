<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import { jadwalSidangApi, type JadwalSidangPayload } from '@/api/jadwalSidang';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { jurusanApi } from '@/api/jurusan';
import { dosenApi } from '@/api/dosen';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { Dosen, JadwalSidang, Jurusan, SemesterGanjilGenap, TahunAjaran } from '@/types/entities';
import { formatTahunAjaran, withCurrentTahunAjaran } from '@/utils/tahunAjaranOptions';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_JADWAL_SIDANG_MANAGEMENT);

const SEMESTER_OPTIONS: { value: SemesterGanjilGenap; label: string }[] = [
  { value: 'GANJIL', label: 'Ganjil' },
  { value: 'GENAP', label: 'Genap' },
];

const tahunAjaranList = ref<TahunAjaran[]>([]);
const jurusanList = ref<Jurusan[]>([]);
const dosenList = ref<Dosen[]>([]);
const loadingOptions = ref(true);

onMounted(async () => {
  try {
    const [tahunAjaranResult, jurusanResult, dosenResult] = await Promise.all([
      tahunAjaranApi.list({ page: 1, limit: 100, isActive: true }),
      jurusanApi.listProdi({ page: 1, limit: 100 }),
      dosenApi.list({ page: 1, limit: 500 }),
    ]);
    tahunAjaranList.value = tahunAjaranResult.data;
    jurusanList.value = jurusanResult.data;
    dosenList.value = dosenResult.data;
  } finally {
    loadingOptions.value = false;
  }
});

const periodeOptions = computed(() =>
  tahunAjaranList.value.flatMap((ta) =>
    SEMESTER_OPTIONS.map((s) => ({ value: `${ta.id}:${s.value}`, label: `${ta.nama} - ${s.label.toUpperCase()}` }))
  )
);
const jurusanOptions = computed(() =>
  jurusanList.value.map((j) => ({ value: j.id, label: j.kodeProdi ? `${j.kodeProdi} - ${j.namaJurusan.toUpperCase()}` : j.namaJurusan.toUpperCase() }))
);
const dosenOptions = computed(() => dosenList.value.map((d) => ({ value: d.id, label: `${d.nidn} - ${d.namaLengkap}` })));

const selectedPeriode = ref('');

const {
  items,
  meta,
  page,
  limit,
  search,
  loading,
  error,
  sortBy,
  sortDir,
  handleSort,
  deleteTarget,
  deleting,
  isFormOpen,
  editingItem,
  fetchItems,
  openCreate,
  openEdit,
  closeForm,
  onSaved,
  requestDelete,
  cancelDelete,
  confirmDelete,
} = useCrudPage({
  fetchList: jadwalSidangApi.list,
  remove: jadwalSidangApi.remove,
  extraQuery: () => {
    const [tahunAjaranId, semester] = selectedPeriode.value ? selectedPeriode.value.split(':') : [undefined, undefined];
    return { tahunAjaranId, semester };
  },
});

const handleTampilkan = () => {
  page.value = 1;
  fetchItems();
};

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'tanggal', label: 'Tanggal', sortable: true },
  { key: 'programStudi', label: 'Program Studi' },
  { key: 'noSk', label: 'No SK' },
  { key: 'ruangan', label: 'Ruangan' },
  { key: 'jam', label: 'Jam' },
  { key: 'dosenPenguji', label: 'Dosen Penguji' },
];

const formatTanggal = (value: string) => new Date(value).toLocaleDateString('id-ID', { dateStyle: 'medium' });

interface FormState {
  tahunAjaranId: number | '';
  semester: SemesterGanjilGenap | '';
  jurusanId: number | '';
  tanggal: string;
  jam: string;
  ruangan: string;
  noSk: string;
  dosenPengujiId: number | '';
}

const emptyForm = (): FormState => ({
  tahunAjaranId: '',
  semester: '',
  jurusanId: '',
  tanggal: '',
  jam: '',
  ruangan: '',
  noSk: '',
  dosenPengujiId: '',
});

const form = reactive(emptyForm());
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    Object.assign(form, emptyForm());
    if (editing) {
      const item = editing as JadwalSidang;
      form.tahunAjaranId = item.tahunAjaranId;
      form.semester = item.semester;
      form.jurusanId = item.jurusanId;
      form.tanggal = item.tanggal?.slice(0, 10) ?? '';
      form.jam = item.jam;
      form.ruangan = item.ruangan ?? '';
      form.noSk = item.noSk ?? '';
      form.dosenPengujiId = item.dosenPengujiId ?? '';
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.tahunAjaranId) errors.tahunAjaranId = 'Tahun ajaran wajib dipilih';
  if (!form.semester) errors.semester = 'Semester wajib dipilih';
  if (!form.jurusanId) errors.jurusanId = 'Program studi wajib dipilih';
  if (!form.tanggal) errors.tanggal = 'Tanggal wajib diisi';
  if (!form.jam.trim()) errors.jam = 'Jam wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: JadwalSidangPayload = {
      tahunAjaranId: Number(form.tahunAjaranId),
      semester: form.semester as SemesterGanjilGenap,
      jurusanId: Number(form.jurusanId),
      tanggal: form.tanggal,
      jam: form.jam.trim(),
      ruangan: form.ruangan.trim() || null,
      noSk: form.noSk.trim() || null,
      dosenPengujiId: form.dosenPengujiId ? Number(form.dosenPengujiId) : null,
    };
    if (editingItem.value) {
      await jadwalSidangApi.update(editingItem.value.id, payload);
    } else {
      await jadwalSidangApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Jadwal Sidang" subtitle="Jadwal sidang skripsi/tugas akhir per program studi.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-64">
          <SelectInput v-model="selectedPeriode" placeholder="-- Semua Periode --" :disabled="loadingOptions" :options="periodeOptions" />
        </div>
        <AppButton icon="visibility" @click="handleTampilkan">Tampilkan</AppButton>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Jadwal Sidang</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari ruangan atau no. SK..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        empty-message="Belum ada data jadwal sidang"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-tanggal="{ item }">{{ formatTanggal(item.tanggal) }}</template>
        <template #cell-programStudi="{ item }">{{ item.jurusan?.namaJurusan?.toUpperCase() ?? '-' }}</template>
        <template #cell-noSk="{ item }">{{ item.noSk || '-' }}</template>
        <template #cell-ruangan="{ item }">{{ item.ruangan || '-' }}</template>
        <template #cell-dosenPenguji="{ item }">{{ item.dosenPenguji?.namaLengkap ?? '-' }}</template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Jadwal Sidang' : 'Tambah Jadwal Sidang'"
      size="lg"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            v-model="form.tahunAjaranId"
            label="Tahun Ajaran"
            required
            :error="errors.tahunAjaranId"
            placeholder="Pilih tahun ajaran..."
            :options="withCurrentTahunAjaran(tahunAjaranList.map((t) => ({ value: t.id, label: formatTahunAjaran(t) })), editingItem?.tahunAjaran)"
          />
          <SelectInput
            v-model="form.semester"
            label="Semester"
            required
            :error="errors.semester"
            placeholder="Pilih semester..."
            :options="SEMESTER_OPTIONS"
          />
        </div>
        <SelectInput
          v-model="form.jurusanId"
          label="Program Studi"
          required
          :error="errors.jurusanId"
          placeholder="Pilih program studi..."
          :options="jurusanOptions"
        />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateInput v-model="form.tanggal" label="Tanggal" required :error="errors.tanggal" />
          <TextInput v-model="form.jam" label="Jam" required :error="errors.jam" placeholder="mis. 09:00 - 10:00" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.ruangan" label="Ruangan" />
          <TextInput v-model="form.noSk" label="No SK" />
        </div>
        <SelectInput
          v-model="form.dosenPengujiId"
          label="Dosen Penguji"
          placeholder="Pilih dosen penguji..."
          :options="dosenOptions"
        />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Jadwal Sidang"
      :message="`Yakin ingin menghapus jadwal sidang tanggal ${deleteTarget ? formatTanggal(deleteTarget.tanggal) : ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

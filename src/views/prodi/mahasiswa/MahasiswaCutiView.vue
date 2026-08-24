<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import { mahasiswaApi } from '@/api/mahasiswa';
import { krsApi } from '@/api/krs';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { Mahasiswa } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_MAHASISWA_CUTI_MANAGEMENT);

const {
  items,
  meta,
  page,
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
} = useCrudPage<Mahasiswa>({
  fetchList: mahasiswaApi.list,
  remove: async (id) => {
    await mahasiswaApi.update(id, { statusKeluar: null, tanggalKeluar: null, alasanKeluar: null });
  },
  extraQuery: () => ({ statusKeluar: 'CUTI' }),
});

fetchItems();

const semesterByMahasiswaId = reactive<Record<number, number | null>>({});
const loadSemesterFor = async (mahasiswaId: number) => {
  if (semesterByMahasiswaId[mahasiswaId] !== undefined) return;
  semesterByMahasiswaId[mahasiswaId] = null;
  try {
    const result = await krsApi.list({ mahasiswaId, limit: 100 });
    const max = result.data.reduce((acc, k) => Math.max(acc, k.semester), 0);
    semesterByMahasiswaId[mahasiswaId] = max || null;
  } catch {
    semesterByMahasiswaId[mahasiswaId] = null;
  }
};
watch(items, (list) => {
  list.forEach((item) => loadSemesterFor(item.id));
});

const columns: DataTableColumn[] = [
  { key: 'nim', label: 'NPM' },
  { key: 'namaLengkap', label: 'Nama' },
  { key: 'semester', label: 'Semester', align: 'center' },
  { key: 'tanggalKeluar', label: 'Tanggal Ajuan', sortable: true },
  { key: 'alasanKeluar', label: 'Alasan Cuti' },
];

const formatDate = (value: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Kandidat mahasiswa yang bisa diajukan cuti: aktif & belum punya status keluar.
const activeMahasiswa = ref<Mahasiswa[]>([]);
onMounted(async () => {
  const result = await mahasiswaApi.list({ page: 1, limit: 500, isActive: true });
  activeMahasiswa.value = result.data.filter((m) => !m.statusKeluar);
});
const mahasiswaOptions = computed(() =>
  activeMahasiswa.value.map((m) => ({ value: m.id, label: `${m.nim} - ${m.namaLengkap}` }))
);

interface FormState {
  mahasiswaId: number | '';
  tanggalAjuan: string;
  alasanCuti: string;
}

const emptyForm = (): FormState => ({ mahasiswaId: '', tanggalAjuan: '', alasanCuti: '' });
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
      form.mahasiswaId = editing.id;
      form.tanggalAjuan = editing.tanggalKeluar ?? '';
      form.alasanCuti = editing.alasanKeluar ?? '';
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.mahasiswaId) errors.mahasiswaId = 'Mahasiswa wajib dipilih';
  if (!form.tanggalAjuan) errors.tanggalAjuan = 'Tanggal ajuan wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    await mahasiswaApi.update(form.mahasiswaId, {
      statusKeluar: 'CUTI',
      tanggalKeluar: form.tanggalAjuan,
      alasanKeluar: form.alasanCuti.trim() || null,
    });
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data cuti mahasiswa');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Cuti" subtitle="Daftar mahasiswa yang mengajukan cuti akademik.">
      <template v-if="canCreate" #actions>
        <AppButton icon="pause_circle" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Cuti</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari NIM atau nama..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada data mahasiswa cuti"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-semester="{ item }">{{ semesterByMahasiswaId[item.id] ?? '-' }}</template>
        <template #cell-tanggalKeluar="{ item }">{{ formatDate(item.tanggalKeluar) }}</template>
        <template #cell-alasanKeluar="{ item }">{{ item.alasanKeluar || '-' }}</template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" title="Ajukan Cuti Mahasiswa" size="md" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <SelectInput
          v-model="form.mahasiswaId"
          label="Mahasiswa"
          required
          placeholder="Pilih mahasiswa..."
          :disabled="!!editingItem"
          :options="mahasiswaOptions"
          :error="errors.mahasiswaId"
        />
        <TextInput v-model="form.tanggalAjuan" label="Tanggal Ajuan" type="date" required :error="errors.tanggalAjuan" />
        <TextInput v-model="form.alasanCuti" label="Alasan Cuti (opsional)" placeholder="Alasan pengajuan cuti..." />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Batalkan Cuti"
      :message="`Yakin ingin membatalkan cuti ${deleteTarget?.namaLengkap ?? ''}? Mahasiswa akan kembali berstatus aktif.`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

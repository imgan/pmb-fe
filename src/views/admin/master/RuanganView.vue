<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { ruanganApi, type RuanganPayload } from '@/api/ruangan';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.RUANGAN_MANAGEMENT);

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
} = useCrudPage({ fetchList: ruanganApi.list, remove: ruanganApi.remove });

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'namaRuang', label: 'Nama Ruang', sortable: true },
  { key: 'kampus', label: 'Kampus', sortable: true },
  { key: 'lantai', label: 'Lantai', align: 'center', sortable: true },
  { key: 'projector', label: 'Projector', align: 'center', sortable: true },
  { key: 'keterangan', label: 'Keterangan', sortable: true },
  { key: 'fungsi', label: 'Fungsi', sortable: true },
  { key: 'kursi', label: 'Kursi', align: 'center', sortable: true },
];

const projectorOptions = [
  { value: 'Y', label: 'Y (Ada)' },
  { value: 'N', label: 'N (Tidak ada)' },
];

const form = reactive({
  namaRuang: '',
  kampus: '',
  lantai: '' as string | number | null,
  projector: 'Y' as string | number | null,
  keterangan: '',
  fungsi: '',
  kursi: '' as string | number | null,
});
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    form.namaRuang = editing?.namaRuang ?? '';
    form.kampus = editing?.kampus ?? '';
    form.lantai = editing?.lantai ?? '';
    form.projector = editing ? (editing.projector ? 'Y' : 'N') : 'Y';
    form.keterangan = editing?.keterangan ?? '';
    form.fungsi = editing?.fungsi ?? '';
    form.kursi = editing?.kursi ?? '';
  },
  { immediate: true }
);

/** '' -> null, selain itu bilangan bulat; NaN = tidak valid. */
const toInt = (v: string | number | null) => (v === '' || v === null ? null : Number(v));

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  const lantai = toInt(form.lantai);
  const kursi = toInt(form.kursi);
  if (!form.namaRuang.trim()) errors.namaRuang = 'Nama ruang wajib diisi';
  if (lantai !== null && (!Number.isInteger(lantai) || lantai < 0)) errors.lantai = 'Lantai harus angka bulat';
  if (kursi !== null && (!Number.isInteger(kursi) || kursi < 0)) errors.kursi = 'Kursi harus angka bulat';
  if (Object.keys(errors).length) return;

  const payload: RuanganPayload = {
    namaRuang: form.namaRuang.trim(),
    kampus: form.kampus.trim() || null,
    lantai,
    projector: form.projector === 'Y',
    keterangan: form.keterangan.trim() || null,
    fungsi: form.fungsi.trim() || null,
    kursi,
  };
  submitting.value = true;
  formError.value = null;
  try {
    if (editingItem.value) await ruanganApi.update(editingItem.value.id, payload);
    else await ruanganApi.create(payload);
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan ruangan');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Ruangan" subtitle="Kelola data ruang kuliah, lab, dan ruang pertemuan per kampus.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari nama ruang, kampus, keterangan, fungsi..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-kampus="{ item }">{{ item.kampus || '-' }}</template>
        <template #cell-lantai="{ item }">{{ item.lantai ?? '-' }}</template>
        <template #cell-projector="{ item }">{{ item.projector ? 'Y' : 'N' }}</template>
        <template #cell-keterangan="{ item }">{{ item.keterangan || '-' }}</template>
        <template #cell-fungsi="{ item }">{{ item.fungsi || '-' }}</template>
        <template #cell-kursi="{ item }">{{ item.kursi ?? '-' }}</template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah Ruangan' : 'Tambah Ruangan'" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput v-model="form.namaRuang" label="Nama Ruang" required :error="errors.namaRuang" hint="Contoh: 1.04 A" />
          <TextInput v-model="form.kampus" label="Kampus" :error="errors.kampus" hint="Contoh: A1" />
          <TextInput v-model="form.lantai" label="Lantai" type="number" :error="errors.lantai" />
          <SelectInput v-model="form.projector" label="Projector" :options="projectorOptions" :clearable="false" />
          <TextInput v-model="form.kursi" label="Kursi" type="number" :error="errors.kursi" hint="Kapasitas tempat duduk" />
          <TextInput v-model="form.fungsi" label="Fungsi" :error="errors.fungsi" hint="Contoh: Ruang Belajar Mengajar" />
        </div>
        <TextInput v-model="form.keterangan" label="Keterangan" :error="errors.keterangan" hint="Contoh: Lab. Algoritma (Lab. PMS)" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Ruangan"
      :message="`Yakin ingin menghapus ruang ${deleteTarget?.namaRuang ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

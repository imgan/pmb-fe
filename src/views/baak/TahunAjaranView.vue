<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.TAHUN_AJARAN_MANAGEMENT);

const statusFilter = ref<'' | 'true' | 'false'>('');
const statusFilterOptions = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Non-aktif' },
];

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
} = useCrudPage({
  fetchList: tahunAjaranApi.list,
  remove: tahunAjaranApi.remove,
  extraQuery: () => ({ isActive: statusFilter.value || undefined }),
});

fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const columns: DataTableColumn[] = [
  { key: 'nama', label: 'Tahun Ajaran', sortable: true },
  { key: 'tahunMulai', label: 'Tahun Mulai', align: 'center', sortable: true },
  { key: 'tahunSelesai', label: 'Tahun Selesai', align: 'center', sortable: true },
  { key: 'isActive', label: 'Status', align: 'center', sortable: true },
];

const form = reactive({
  nama: '',
  tahunMulai: new Date().getFullYear() as number | '',
  tahunSelesai: new Date().getFullYear() + 1 as number | '',
  isActive: true,
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
    if (editing) {
      form.nama = editing.nama;
      form.tahunMulai = editing.tahunMulai;
      form.tahunSelesai = editing.tahunSelesai;
      form.isActive = editing.isActive;
    } else {
      const year = new Date().getFullYear();
      form.nama = `${year}/${year + 1}`;
      form.tahunMulai = year;
      form.tahunSelesai = year + 1;
      form.isActive = true;
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.nama.trim()) errors.nama = 'Nama tahun ajaran wajib diisi';
  if (!form.tahunMulai) errors.tahunMulai = 'Tahun mulai wajib diisi';
  if (!form.tahunSelesai) errors.tahunSelesai = 'Tahun selesai wajib diisi';
  if (form.tahunMulai && form.tahunSelesai && Number(form.tahunSelesai) <= Number(form.tahunMulai)) {
    errors.tahunSelesai = 'Tahun selesai harus lebih besar dari tahun mulai';
  }
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload = {
      nama: form.nama.trim(),
      tahunMulai: Number(form.tahunMulai),
      tahunSelesai: Number(form.tahunSelesai),
      isActive: form.isActive,
    };
    if (editingItem.value) {
      await tahunAjaranApi.update(editingItem.value.id, payload);
    } else {
      await tahunAjaranApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan tahun ajaran');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader
      title="Tahun Ajaran"
      subtitle="Kelola tahun ajaran. Hanya tahun ajaran aktif yang bisa dipilih saat generate NIM mahasiswa & membuat jadwal kuliah."
    >
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Tahun Ajaran</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari tahun ajaran..." />
        <div class="w-full md:w-52">
          <SelectInput v-model="statusFilter" placeholder="Semua Status" :options="statusFilterOptions" @change="onFilterChange" />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada data tahun ajaran"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-isActive="{ item }">
          <StatusBadge :label="item.isActive ? 'Aktif' : 'Non-aktif'" :variant="item.isActive ? 'success' : 'neutral'" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Tahun Ajaran' : 'Tambah Tahun Ajaran'"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <TextInput v-model="form.nama" label="Nama Tahun Ajaran" required placeholder="mis. 2026/2027" :error="errors.nama" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model.number="form.tahunMulai" label="Tahun Mulai" type="number" required :error="errors.tahunMulai" />
          <TextInput v-model.number="form.tahunSelesai" label="Tahun Selesai" type="number" required :error="errors.tahunSelesai" />
        </div>
        <CheckboxToggle
          v-model="form.isActive"
          label="Status Aktif"
          description="Hanya tahun ajaran aktif yang muncul sebagai pilihan saat generate NIM & membuat jadwal kuliah"
        />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">
          {{ submitting ? 'Menyimpan...' : 'Simpan' }}
        </AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Tahun Ajaran"
      :message="`Yakin ingin menghapus tahun ajaran ${deleteTarget?.nama ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

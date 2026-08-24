<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import { dokumenPendaftaranApi } from '@/api/dokumenPendaftaran';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.DOKUMEN_PENDAFTARAN_MANAGEMENT);

const wajibFilter = ref<string>('');
const wajibFilterOptions = [
  { value: 'true', label: 'Wajib' },
  { value: 'false', label: 'Tidak Wajib' },
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
  fetchList: dokumenPendaftaranApi.list,
  remove: dokumenPendaftaranApi.remove,
  extraQuery: () => ({ isWajib: wajibFilter.value || undefined }),
});

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'namaPendaftaran', label: 'Nama Dokumen', sortable: true },
  { key: 'isWajib', label: 'Status', align: 'center', sortable: true },
];

const form = reactive({ namaPendaftaran: '', isWajib: false });
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    form.namaPendaftaran = editing?.namaPendaftaran ?? '';
    form.isWajib = editing?.isWajib ?? false;
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.namaPendaftaran.trim()) {
    errors.namaPendaftaran = 'Nama dokumen wajib diisi';
    return;
  }
  submitting.value = true;
  formError.value = null;
  try {
    const payload = { namaPendaftaran: form.namaPendaftaran.trim(), isWajib: form.isWajib };
    if (editingItem.value) {
      await dokumenPendaftaranApi.update(editingItem.value.id, payload);
    } else {
      await dokumenPendaftaranApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan dokumen pendaftaran');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Dokumen Pendaftaran" subtitle="Kelola master data dokumen pendaftaran.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Dokumen</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari dokumen..." />
        <div class="w-full md:w-64">
          <SelectInput v-model="wajibFilter" placeholder="Semua Status" :options="wajibFilterOptions" @change="onFilterChange" />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-isWajib="{ item }">
          <StatusBadge :variant="item.isWajib ? 'warning' : 'neutral'" :label="item.isWajib ? 'Wajib' : 'Tidak Wajib'" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Dokumen Pendaftaran' : 'Tambah Dokumen Pendaftaran'"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <TextInput v-model="form.namaPendaftaran" label="Nama Dokumen" required :error="errors.namaPendaftaran" />
        <CheckboxToggle v-model="form.isWajib" label="Dokumen Wajib" description="Aktifkan jika dokumen ini wajib dilampirkan" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Dokumen Pendaftaran"
      :message="`Yakin ingin menghapus dokumen ${deleteTarget?.namaPendaftaran ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

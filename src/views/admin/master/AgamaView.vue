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
import { agamaApi } from '@/api/agama';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.ADMIN_MASTER_AGAMA_MANAGEMENT);

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
} = useCrudPage({ fetchList: agamaApi.list, remove: agamaApi.remove });

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'kodeAgama', label: 'Kode Agama', sortable: true },
  { key: 'namaAgama', label: 'Nama Agama', sortable: true },
];

const form = reactive({ kodeAgama: '', namaAgama: '' });
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    form.kodeAgama = editing?.kodeAgama ?? '';
    form.namaAgama = editing?.namaAgama ?? '';
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.kodeAgama.trim()) errors.kodeAgama = 'Kode agama wajib diisi';
  if (!form.namaAgama.trim()) errors.namaAgama = 'Nama agama wajib diisi';
  if (Object.keys(errors).length) return;

  const payload = { kodeAgama: form.kodeAgama.trim(), namaAgama: form.namaAgama.trim().toUpperCase() };
  submitting.value = true;
  formError.value = null;
  try {
    if (editingItem.value) await agamaApi.update(editingItem.value.id, payload);
    else await agamaApi.create(payload);
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan agama');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Agama" subtitle="Kelola master data agama.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari kode atau nama agama..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah Agama' : 'Tambah Agama'" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <TextInput v-model="form.kodeAgama" label="Kode Agama" required :error="errors.kodeAgama" hint="Contoh: 1" />
        <TextInput v-model="form.namaAgama" label="Nama Agama" required :error="errors.namaAgama" hint="Contoh: ISLAM" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Agama"
      :message="`Yakin ingin menghapus agama ${deleteTarget?.namaAgama ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

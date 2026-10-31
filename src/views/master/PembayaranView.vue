<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import { pembayaranApi } from '@/api/pembayaran';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.PEMBAYARAN_MANAGEMENT);

const beasiswaFilter = ref<string>('');
const beasiswaFilterOptions = [
  { value: 'true', label: 'Beasiswa' },
  { value: 'false', label: 'Non-Beasiswa' },
];

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
  fetchList: pembayaranApi.list,
  remove: pembayaranApi.remove,
  extraQuery: () => ({ isBeasiswa: beasiswaFilter.value || undefined }),
});

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'namaPembayaran', label: 'Nama Pembayaran', sortable: true },
  { key: 'isBeasiswa', label: 'Tipe', align: 'center', sortable: true },
];

const form = reactive({ namaPembayaran: '', isBeasiswa: false });
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    form.namaPembayaran = editing?.namaPembayaran ?? '';
    form.isBeasiswa = editing?.isBeasiswa ?? false;
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.namaPembayaran.trim()) {
    errors.namaPembayaran = 'Nama pembayaran wajib diisi';
    return;
  }
  submitting.value = true;
  formError.value = null;
  try {
    const payload = { namaPembayaran: form.namaPembayaran.trim(), isBeasiswa: form.isBeasiswa };
    if (editingItem.value) {
      await pembayaranApi.update(editingItem.value.id, payload);
    } else {
      await pembayaranApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan pembayaran');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Pembayaran" subtitle="Kelola master data jenis pembayaran.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Pembayaran</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari pembayaran..." />
        <div class="w-full md:w-64">
          <SelectInput
            v-model="beasiswaFilter"
            placeholder="Semua Tipe"
            :options="beasiswaFilterOptions"
            @change="onFilterChange"
          />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-isBeasiswa="{ item }">
          <StatusBadge :variant="item.isBeasiswa ? 'success' : 'neutral'" :label="item.isBeasiswa ? 'Beasiswa' : 'Non-Beasiswa'" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah Pembayaran' : 'Tambah Pembayaran'" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <TextInput v-model="form.namaPembayaran" label="Nama Pembayaran" required :error="errors.namaPembayaran" />
        <CheckboxToggle v-model="form.isBeasiswa" label="Pembayaran Beasiswa" description="Aktifkan jika jenis ini untuk jalur beasiswa" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Pembayaran"
      :message="`Yakin ingin menghapus pembayaran ${deleteTarget?.namaPembayaran ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

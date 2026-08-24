<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import FileInput from '@/components/ui/FileInput.vue';
import { dokumenKelengkapanApi } from '@/api/dokumenKelengkapan';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { DokumenKelengkapan } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.DOKUMEN_KELENGKAPAN_MANAGEMENT);

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
} = useCrudPage<DokumenKelengkapan>({ fetchList: dokumenKelengkapanApi.list, remove: dokumenKelengkapanApi.remove });

fetchItems();

const editLoading = ref(false);
const handleEdit = async (item: DokumenKelengkapan) => {
  editLoading.value = true;
  try {
    const full = await dokumenKelengkapanApi.get(item.id);
    openEdit(full);
  } finally {
    editLoading.value = false;
  }
};

const columns: DataTableColumn[] = [
  { key: 'namaKelengkapan', label: 'Nama Dokumen', sortable: true },
  { key: 'isWajib', label: 'Wajib', align: 'center', sortable: true },
  { key: 'isBeasiswa', label: 'Beasiswa', align: 'center', sortable: true },
];

const form = reactive({
  namaKelengkapan: '',
  isWajib: false,
  isBeasiswa: false,
  file: null as string | null,
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
    form.namaKelengkapan = editing?.namaKelengkapan ?? '';
    form.isWajib = editing?.isWajib ?? false;
    form.isBeasiswa = editing?.isBeasiswa ?? false;
    form.file = editing?.file ?? null;
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.namaKelengkapan.trim()) {
    errors.namaKelengkapan = 'Nama dokumen wajib diisi';
    return;
  }
  submitting.value = true;
  formError.value = null;
  try {
    const payload = {
      namaKelengkapan: form.namaKelengkapan.trim(),
      isWajib: form.isWajib,
      isBeasiswa: form.isBeasiswa,
      file: form.file,
    };
    if (editingItem.value) {
      await dokumenKelengkapanApi.update(editingItem.value.id, payload);
    } else {
      await dokumenKelengkapanApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan dokumen kelengkapan');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Dokumen Kelengkapan" subtitle="Kelola master data dokumen kelengkapan pendaftaran.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Dokumen</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari dokumen..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-isWajib="{ item }">
          <StatusBadge :variant="item.isWajib ? 'warning' : 'neutral'" :label="item.isWajib ? 'Wajib' : 'Opsional'" />
        </template>
        <template #cell-isBeasiswa="{ item }">
          <StatusBadge :variant="item.isBeasiswa ? 'success' : 'neutral'" :label="item.isBeasiswa ? 'Ya' : 'Tidak'" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="handleEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Dokumen Kelengkapan' : 'Tambah Dokumen Kelengkapan'"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <div v-if="editLoading" class="text-body-sm text-on-surface-variant">Memuat file...</div>
        <TextInput v-model="form.namaKelengkapan" label="Nama Dokumen" required :error="errors.namaKelengkapan" />
        <CheckboxToggle v-model="form.isWajib" label="Dokumen Wajib" description="Aktifkan jika dokumen ini wajib dilampirkan" />
        <CheckboxToggle v-model="form.isBeasiswa" label="Khusus Beasiswa" description="Aktifkan jika dokumen ini hanya untuk jalur beasiswa" />
        <FileInput v-model="form.file" label="File Contoh/Template" hint="Opsional. Unggah file untuk dilampirkan." />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Dokumen Kelengkapan"
      :message="`Yakin ingin menghapus dokumen ${deleteTarget?.namaKelengkapan ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

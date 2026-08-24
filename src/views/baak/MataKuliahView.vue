<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import { mataKuliahApi } from '@/api/mataKuliah';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.MATA_KULIAH_MANAGEMENT);

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
} = useCrudPage({ fetchList: mataKuliahApi.list, remove: mataKuliahApi.remove });

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'kodeMk', label: 'Kode MK', sortable: true },
  { key: 'namaMk', label: 'Mata Kuliah', sortable: true },
  { key: 'sks', label: 'SKS', align: 'center', sortable: true },
];

const form = reactive({ kodeMk: '', namaMk: '', sks: 0 as number | '' });
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    form.kodeMk = editing?.kodeMk ?? '';
    form.namaMk = editing?.namaMk ?? '';
    form.sks = editing?.sks ?? 0;
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.kodeMk.trim()) errors.kodeMk = 'Kode MK wajib diisi';
  if (!form.namaMk.trim()) errors.namaMk = 'Nama mata kuliah wajib diisi';
  if (form.sks === '' || Number(form.sks) < 0) errors.sks = 'SKS wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload = { kodeMk: form.kodeMk.trim(), namaMk: form.namaMk.trim(), sks: Number(form.sks) };
    if (editingItem.value) {
      await mataKuliahApi.update(editingItem.value.id, payload);
    } else {
      await mataKuliahApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan mata kuliah');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Mata Kuliah" subtitle="Master data mata kuliah, dipakai saat membuat Kelas Kuliah (jadwal).">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Mata Kuliah</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari kode atau nama mata kuliah..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah Mata Kuliah' : 'Tambah Mata Kuliah'" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <TextInput v-model="form.kodeMk" label="Kode MK" required :error="errors.kodeMk" placeholder="mis. IF401" />
        <TextInput v-model="form.namaMk" label="Nama Mata Kuliah" required :error="errors.namaMk" />
        <TextInput v-model.number="form.sks" label="SKS" type="number" required :error="errors.sks" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Mata Kuliah"
      :message="`Yakin ingin menghapus mata kuliah ${deleteTarget?.namaMk ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

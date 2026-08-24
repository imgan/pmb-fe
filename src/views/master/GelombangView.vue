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
import DateInput from '@/components/ui/DateInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import { gelombangApi } from '@/api/gelombang';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatDate, toDateInputValue } from '@/utils/format';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.GELOMBANG_MANAGEMENT);

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
} = useCrudPage({ fetchList: gelombangApi.list, remove: gelombangApi.remove });

fetchItems();

const isGelombangAktif = (startDate: string, endDate: string) => {
  const today = new Date().toISOString().slice(0, 10);
  return startDate <= today && endDate >= today;
};

const columns: DataTableColumn[] = [
  { key: 'namaGelombang', label: 'Nama Gelombang', sortable: true },
  { key: 'periode', label: 'Periode' },
  { key: 'status', label: 'Status', align: 'center' },
];

const form = reactive({ namaGelombang: '', startDate: '', endDate: '', deskripsi: '' });
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    form.namaGelombang = editing?.namaGelombang ?? '';
    form.startDate = toDateInputValue(editing?.startDate);
    form.endDate = toDateInputValue(editing?.endDate);
    form.deskripsi = editing?.deskripsi ?? '';
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.namaGelombang.trim()) errors.namaGelombang = 'Nama gelombang wajib diisi';
  if (!form.startDate) errors.startDate = 'Tanggal mulai wajib diisi';
  if (!form.endDate) errors.endDate = 'Tanggal selesai wajib diisi';
  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    errors.endDate = 'Tanggal selesai harus setelah atau sama dengan tanggal mulai';
  }
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload = {
      namaGelombang: form.namaGelombang.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      deskripsi: form.deskripsi.trim() || null,
    };
    if (editingItem.value) {
      await gelombangApi.update(editingItem.value.id, payload);
    } else {
      await gelombangApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan gelombang');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Gelombang" subtitle="Kelola master data gelombang pendaftaran.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Gelombang</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari gelombang..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-periode="{ item }">
          <span class="tabular-nums">{{ formatDate(item.startDate) }} - {{ formatDate(item.endDate) }}</span>
        </template>
        <template #cell-status="{ item }">
          <StatusBadge
            :variant="isGelombangAktif(item.startDate, item.endDate) ? 'success' : 'neutral'"
            :label="isGelombangAktif(item.startDate, item.endDate) ? 'Aktif' : 'Tidak Aktif'"
          />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah Gelombang' : 'Tambah Gelombang'" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <TextInput v-model="form.namaGelombang" label="Nama Gelombang" required :error="errors.namaGelombang" />
        <div class="grid grid-cols-2 gap-4">
          <DateInput v-model="form.startDate" label="Tanggal Mulai" required :error="errors.startDate" />
          <DateInput v-model="form.endDate" label="Tanggal Selesai" required :min="form.startDate" :error="errors.endDate" />
        </div>
        <TextareaInput v-model="form.deskripsi" label="Deskripsi" :rows="3" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Gelombang"
      :message="`Yakin ingin menghapus gelombang ${deleteTarget?.namaGelombang ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

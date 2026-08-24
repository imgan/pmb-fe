<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import { rolesApi } from '@/api/roles';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

const router = useRouter();
const { canCreate, canUpdate, canDelete } = usePermission(MENU.ROLE_MANAGEMENT);

const {
  items,
  meta,
  page,
  search,
  loading,
  error,
  deleteTarget,
  deleting,
  isFormOpen,
  editingItem,
  fetchItems,
  openCreate,
  openEdit,
  closeForm,
  onSaved,
  sortBy,
  sortDir,
  handleSort,
  requestDelete,
  cancelDelete,
  confirmDelete,
} = useCrudPage({ fetchList: rolesApi.list, remove: rolesApi.remove });

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Nama Role', sortable: true },
  { key: 'code', label: 'Kode', sortable: true },
  { key: 'description', label: 'Deskripsi', sortable: true },
  { key: 'status', label: 'Status', align: 'center', sortable: true },
];

const form = reactive({ name: '', code: '', description: '', isActive: true });
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    form.name = editing?.name ?? '';
    form.code = editing?.code ?? '';
    form.description = editing?.description ?? '';
    form.isActive = editing?.isActive ?? true;
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.name.trim()) errors.name = 'Nama role wajib diisi';
  if (!form.code.trim()) errors.code = 'Kode role wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      isActive: form.isActive,
    };
    if (editingItem.value) {
      await rolesApi.update(editingItem.value.id, payload);
    } else {
      await rolesApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan role');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Manajemen Role" subtitle="Kelola role akses & hak akses menu.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Role</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari role..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-description="{ item }">{{ item.description || '-' }}</template>
        <template #cell-status="{ item }">
          <StatusBadge :variant="item.isActive ? 'success' : 'danger'" :label="item.isActive ? 'Aktif' : 'Nonaktif'" />
        </template>
        <template #actions="{ item }">
          <button
            type="button"
            class="text-on-surface-variant hover:text-primary transition-colors"
            title="Hak Akses"
            @click="router.push(`/admin/roles/${item.id}/permissions`)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">key</span>
          </button>
          <button v-if="canUpdate" type="button" class="text-on-surface-variant hover:text-primary transition-colors" title="Ubah" @click="openEdit(item)">
            <span class="material-symbols-outlined" style="font-size: 20px">edit</span>
          </button>
          <button v-if="canDelete" type="button" class="text-on-surface-variant hover:text-error transition-colors" title="Hapus" @click="requestDelete(item)">
            <span class="material-symbols-outlined" style="font-size: 20px">delete</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah Role' : 'Tambah Role'" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <TextInput v-model="form.name" label="Nama Role" required :error="errors.name" />
        <TextInput v-model="form.code" label="Kode Role" required :error="errors.code" hint="Akan disimpan dalam huruf kapital" />
        <TextareaInput v-model="form.description" label="Deskripsi" :rows="3" />
        <CheckboxToggle v-model="form.isActive" label="Status Aktif" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Role"
      :message="`Yakin ingin menghapus role ${deleteTarget?.name ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

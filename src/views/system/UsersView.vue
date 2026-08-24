<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
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
import { usersApi } from '@/api/users';
import { rolesApi } from '@/api/roles';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.USER_MANAGEMENT);

const roleOptions = ref<{ value: number; label: string }[]>([]);
onMounted(async () => {
  const result = await rolesApi.list({ limit: 100 });
  roleOptions.value = result.data.map((r) => ({ value: r.id, label: r.name }));
});

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
} = useCrudPage({ fetchList: usersApi.list, remove: usersApi.remove });

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Nama', sortable: true },
  { key: 'username', label: 'Username', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
  { key: 'status', label: 'Status', align: 'center', sortable: true },
];

const isEdit = ref(false);
const form = reactive({
  name: '',
  username: '',
  email: '',
  password: '',
  roleId: '' as number | '',
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
    isEdit.value = !!editing;
    form.name = editing?.name ?? '';
    form.username = editing?.username ?? '';
    form.email = editing?.email ?? '';
    form.password = '';
    form.roleId = editing?.roleId ?? '';
    form.isActive = editing?.isActive ?? true;
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.name.trim()) errors.name = 'Nama wajib diisi';
  if (!isEdit.value && !form.username.trim()) errors.username = 'Username wajib diisi';
  if (!form.email.trim()) errors.email = 'Email wajib diisi';
  if (!isEdit.value && form.password.length < 8) errors.password = 'Password minimal 8 karakter';
  if (isEdit.value && form.password && form.password.length < 8) errors.password = 'Password minimal 8 karakter';
  if (!form.roleId) errors.roleId = 'Role wajib dipilih';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    if (isEdit.value && editingItem.value) {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        roleId: Number(form.roleId),
        isActive: form.isActive,
      };
      if (form.password) payload.password = form.password;
      await usersApi.update(editingItem.value.id, payload);
    } else {
      await usersApi.create({
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        roleId: Number(form.roleId),
        isActive: form.isActive,
      });
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan user');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Manajemen User" subtitle="Kelola akun admin & staf yang dapat mengakses sistem.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah User</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari nama, username, email..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-role="{ item }">{{ item.role?.name ?? '-' }}</template>
        <template #cell-status="{ item }">
          <StatusBadge :variant="item.isActive ? 'success' : 'danger'" :label="item.isActive ? 'Aktif' : 'Nonaktif'" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="isEdit ? 'Ubah User' : 'Tambah User'" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <TextInput v-model="form.name" label="Nama" required :error="errors.name" />
        <TextInput v-model="form.username" label="Username" required :disabled="isEdit" :error="errors.username" :hint="isEdit ? 'Username tidak dapat diubah' : undefined" />
        <TextInput v-model="form.email" type="email" label="Email" required :error="errors.email" />
        <TextInput
          v-model="form.password"
          type="password"
          :label="isEdit ? 'Password Baru' : 'Password'"
          :required="!isEdit"
          :error="errors.password"
          :hint="isEdit ? 'Kosongkan jika tidak ingin mengubah password' : 'Minimal 8 karakter'"
        />
        <SelectInput v-model="form.roleId" label="Role" required :options="roleOptions" :error="errors.roleId" />
        <CheckboxToggle v-model="form.isActive" label="Status Aktif" description="Nonaktifkan untuk mencabut akses login" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus User"
      :message="`Yakin ingin menghapus user ${deleteTarget?.name ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

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
import { menusApi } from '@/api/menus';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.MENU_MANAGEMENT);

const allMenuOptions = ref<{ value: number; label: string }[]>([]);
const loadMenuOptions = async () => {
  const result = await menusApi.list({ limit: 200 });
  allMenuOptions.value = result.data.map((m) => ({ value: m.id, label: m.name }));
};
onMounted(loadMenuOptions);

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
} = useCrudPage({ fetchList: menusApi.list, remove: menusApi.remove });

const handleSaved = () => {
  onSaved();
  loadMenuOptions();
};

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Nama Menu', sortable: true },
  { key: 'code', label: 'Kode', sortable: true },
  { key: 'path', label: 'Path', sortable: true },
  { key: 'orderNumber', label: 'Urutan', align: 'center', sortable: true },
  { key: 'visibility', label: 'Tampil Di', align: 'center', sortable: true },
  { key: 'status', label: 'Status', align: 'center', sortable: true },
];

const form = reactive({
  parentId: '' as number | '',
  name: '',
  code: '',
  path: '',
  icon: '',
  orderNumber: 0 as number | string,
  isActive: true,
  isPublic: false,
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
    form.parentId = editing?.parentId ?? '';
    form.name = editing?.name ?? '';
    form.code = editing?.code ?? '';
    form.path = editing?.path ?? '';
    form.icon = editing?.icon ?? '';
    form.orderNumber = editing?.orderNumber ?? 0;
    form.isActive = editing?.isActive ?? true;
    form.isPublic = editing?.isPublic ?? false;
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.name.trim()) errors.name = 'Nama menu wajib diisi';
  if (!form.code.trim()) errors.code = 'Kode menu wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload = {
      parentId: form.parentId ? Number(form.parentId) : null,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      path: form.path.trim() || null,
      icon: form.icon.trim() || null,
      orderNumber: Number(form.orderNumber) || 0,
      isActive: form.isActive,
      isPublic: form.isPublic,
    };
    if (editingItem.value) {
      await menusApi.update(editingItem.value.id, payload);
    } else {
      await menusApi.create(payload);
    }
    handleSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan menu');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Manajemen Menu" subtitle="Kelola struktur menu & navigasi sidebar.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Menu</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari menu..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-path="{ item }">{{ item.path || '-' }}</template>
        <template #cell-visibility="{ item }">
          <StatusBadge
            :variant="item.isPublic ? 'warning' : 'neutral'"
            :label="item.isPublic ? 'Halaman Publik' : 'Admin'"
          />
        </template>
        <template #cell-status="{ item }">
          <StatusBadge :variant="item.isActive ? 'success' : 'danger'" :label="item.isActive ? 'Aktif' : 'Nonaktif'" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah Menu' : 'Tambah Menu'" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <SelectInput v-model="form.parentId" label="Parent Menu" placeholder="Tidak ada (menu utama)" :options="allMenuOptions" />
        <TextInput v-model="form.name" label="Nama Menu" required :error="errors.name" />
        <TextInput v-model="form.code" label="Kode Menu" required :error="errors.code" hint="Akan disimpan dalam huruf kapital" />
        <TextInput v-model="form.path" label="Path" placeholder="/contoh-path" />
        <TextInput v-model="form.icon" label="Icon" hint="Kunci ikon, mis. home, users, layers" />
        <TextInput v-model="form.orderNumber" type="number" label="Urutan" />
        <CheckboxToggle v-model="form.isActive" label="Status Aktif" />
        <CheckboxToggle
          v-model="form.isPublic"
          label="Tampilkan di Halaman Publik (Home)"
          description="Aktifkan untuk menu navigasi di landing page, bukan sidebar admin"
        />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Menu"
      :message="`Yakin ingin menghapus menu ${deleteTarget?.name ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

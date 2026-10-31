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
import TextareaInput from '@/components/ui/TextareaInput.vue';
import RichTextEditor from '@/components/ui/RichTextEditor.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { biayaKuliahApi } from '@/api/biayaKuliah';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.BIAYA_KULIAH_MANAGEMENT);

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
} = useCrudPage({ fetchList: biayaKuliahApi.list, remove: biayaKuliahApi.remove });

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'judul', label: 'Judul', sortable: true },
  { key: 'slug', label: 'Slug', sortable: true },
  { key: 'status', label: 'Status', align: 'center', sortable: true },
];

const form = reactive({ judul: '', slug: '', ringkasan: '', konten: '', orderNumber: 0, isActive: true });
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);
const slugTouched = ref(false);

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

watch(
  () => form.judul,
  (value) => {
    if (!slugTouched.value) form.slug = slugify(value);
  }
);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    slugTouched.value = !!editing;
    form.judul = editing?.judul ?? '';
    form.slug = editing?.slug ?? '';
    form.ringkasan = editing?.ringkasan ?? '';
    form.konten = editing?.konten ?? '';
    form.orderNumber = editing?.orderNumber ?? 0;
    form.isActive = editing?.isActive ?? true;
  },
  { immediate: true }
);

const validate = (): boolean => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.judul.trim()) errors.judul = 'Judul wajib diisi';
  if (!form.slug.trim()) errors.slug = 'Slug wajib diisi';
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) {
    errors.slug = 'Slug hanya boleh huruf kecil, angka, dan tanda strip, mis. biaya-kuliah-2026';
  }
  return Object.keys(errors).length === 0;
};

const handleSubmit = async () => {
  if (!validate()) return;
  submitting.value = true;
  formError.value = null;
  try {
    const payload = {
      judul: form.judul.trim(),
      slug: form.slug.trim(),
      ringkasan: form.ringkasan.trim() || null,
      konten: form.konten.trim() || null,
      orderNumber: Number(form.orderNumber) || 0,
      isActive: form.isActive,
    };
    if (editingItem.value) {
      await biayaKuliahApi.update(editingItem.value.id, payload);
    } else {
      await biayaKuliahApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan biaya kuliah');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Biaya Kuliah" subtitle="Kelola halaman informasi biaya kuliah yang tampil di menu Biaya Kuliah pada website publik.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Halaman</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari biaya kuliah..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-status="{ item }">
          <StatusBadge :variant="item.isActive ? 'success' : 'danger'" :label="item.isActive ? 'Aktif' : 'Nonaktif'" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Biaya Kuliah' : 'Tambah Halaman Biaya Kuliah'"
      subtitle="Gunakan editor untuk menyusun tabel biaya kuliah & skema pembayaran."
      size="lg"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <TextInput v-model="form.judul" label="Judul" required :error="errors.judul" placeholder="Biaya Kuliah Mahasiswa Baru 2026/2027" />
        <TextInput
          v-model="form.slug"
          label="Slug"
          required
          :error="errors.slug"
          hint="Dipakai di URL: /biaya-kuliah/slug-ini"
          @input="slugTouched = true"
        />
        <TextareaInput v-model="form.ringkasan" label="Ringkasan" :rows="2" hint="Teks singkat untuk kartu & dropdown menu" />
        <RichTextEditor
          v-model="form.konten"
          label="Konten Halaman"
          hint="Gunakan tombol Sisipkan Tabel untuk membuat tabel biaya kuliah / skema pembayaran."
        />
        <TextInput v-model="form.orderNumber" type="number" label="Urutan" />
        <CheckboxToggle v-model="form.isActive" label="Status Aktif" description="Nonaktifkan untuk menyembunyikan dari website publik" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Biaya Kuliah"
      :message="`Yakin ingin menghapus halaman ${deleteTarget?.judul ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

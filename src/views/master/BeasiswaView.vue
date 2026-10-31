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
import { beasiswaApi } from '@/api/beasiswa';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.BEASISWA_MANAGEMENT);

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
} = useCrudPage({ fetchList: beasiswaApi.list, remove: beasiswaApi.remove });

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'namaBeasiswa', label: 'Nama Beasiswa', sortable: true },
  { key: 'slug', label: 'Slug', sortable: true },
  { key: 'status', label: 'Status', align: 'center', sortable: true },
];

const form = reactive({ namaBeasiswa: '', slug: '', ringkasan: '', konten: '', orderNumber: 0, isActive: true });
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
  () => form.namaBeasiswa,
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
    form.namaBeasiswa = editing?.namaBeasiswa ?? '';
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
  if (!form.namaBeasiswa.trim()) errors.namaBeasiswa = 'Nama beasiswa wajib diisi';
  if (!form.slug.trim()) errors.slug = 'Slug wajib diisi';
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) {
    errors.slug = 'Slug hanya boleh huruf kecil, angka, dan tanda strip, mis. kartu-indonesia-pintar';
  }
  return Object.keys(errors).length === 0;
};

const handleSubmit = async () => {
  if (!validate()) return;
  submitting.value = true;
  formError.value = null;
  try {
    const payload = {
      namaBeasiswa: form.namaBeasiswa.trim(),
      slug: form.slug.trim(),
      ringkasan: form.ringkasan.trim() || null,
      konten: form.konten.trim() || null,
      orderNumber: Number(form.orderNumber) || 0,
      isActive: form.isActive,
    };
    if (editingItem.value) {
      await beasiswaApi.update(editingItem.value.id, payload);
    } else {
      await beasiswaApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan beasiswa');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Beasiswa" subtitle="Kelola halaman informasi beasiswa yang tampil di menu Beasiswa pada website publik.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Beasiswa</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari beasiswa..." />
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
      :title="editingItem ? 'Ubah Beasiswa' : 'Tambah Beasiswa'"
      subtitle="Gunakan editor untuk memformat konten halaman."
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <TextInput v-model="form.namaBeasiswa" label="Nama Beasiswa" required :error="errors.namaBeasiswa" />
        <TextInput
          v-model="form.slug"
          label="Slug"
          required
          :error="errors.slug"
          hint="Dipakai di URL: /beasiswa/slug-ini"
          @input="slugTouched = true"
        />
        <TextareaInput v-model="form.ringkasan" label="Ringkasan" :rows="2" hint="Teks singkat untuk kartu & dropdown menu" />
        <RichTextEditor v-model="form.konten" label="Konten Halaman" hint="Gunakan tombol Judul Bagian untuk membuat kotak biru seperti pada contoh." />
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
      title="Hapus Beasiswa"
      :message="`Yakin ingin menghapus beasiswa ${deleteTarget?.namaBeasiswa ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

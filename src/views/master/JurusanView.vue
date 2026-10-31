<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import FileInput from '@/components/ui/FileInput.vue';
import ImportExportButtons from '@/components/ui/ImportExportButtons.vue';
import { jurusanApi } from '@/api/jurusan';
import { golonganKelasApi } from '@/api/golonganKelas';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

// Halaman ini juga dipakai Modul Admin → Master, dengan kode menu Admin sebagai sumber hak akses.
const props = withDefaults(defineProps<{ menuCode?: string }>(), { menuCode: MENU.JURUSAN_MANAGEMENT });
const { canCreate, canUpdate, canDelete } = usePermission(props.menuCode);

const golonganKelasFilter = ref<number | ''>('');
const golonganKelasOptions = ref<{ value: number; label: string }[]>([]);

onMounted(async () => {
  const result = await golonganKelasApi.list({ limit: 100 });
  golonganKelasOptions.value = result.data.map((g) => ({ value: g.id, label: g.namaKelas }));
});

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
  fetchList: jurusanApi.list,
  remove: jurusanApi.remove,
  extraQuery: () => ({ golonganKelasId: golonganKelasFilter.value || undefined }),
});

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'namaJurusan', label: 'Nama Jurusan', sortable: true },
  { key: 'golonganKelas', label: 'Golongan Kelas', sortable: true },
];

const form = reactive({
  golonganKelasId: '' as number | '',
  namaJurusan: '',
  kodeProdi: '',
  singkatan: '',
  foto: null as string | null,
  prospekKarir: '',
  jenjangPendidikan: '',
  gelarSingkat: '',
  gelarLengkap: '',
  namaFakultas: '',
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
    form.golonganKelasId = editing?.golonganKelasId ?? '';
    form.namaJurusan = editing?.namaJurusan ?? '';
    form.kodeProdi = editing?.kodeProdi ?? '';
    form.singkatan = editing?.singkatan ?? '';
    form.foto = editing?.foto ?? null;
    form.prospekKarir = editing?.prospekKarir ?? '';
    form.jenjangPendidikan = editing?.jenjangPendidikan ?? '';
    form.gelarSingkat = editing?.gelarSingkat ?? '';
    form.gelarLengkap = editing?.gelarLengkap ?? '';
    form.namaFakultas = editing?.namaFakultas ?? '';
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.golonganKelasId) errors.golonganKelasId = 'Golongan kelas wajib dipilih';
  if (!form.namaJurusan.trim()) errors.namaJurusan = 'Nama jurusan wajib diisi';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload = {
      golonganKelasId: Number(form.golonganKelasId),
      namaJurusan: form.namaJurusan.trim(),
      kodeProdi: form.kodeProdi.trim() || null,
      singkatan: form.singkatan.trim().toUpperCase() || null,
      foto: form.foto,
      prospekKarir: form.prospekKarir.trim() || null,
      jenjangPendidikan: form.jenjangPendidikan.trim() || null,
      gelarSingkat: form.gelarSingkat.trim() || null,
      gelarLengkap: form.gelarLengkap.trim() || null,
      namaFakultas: form.namaFakultas.trim() || null,
    };
    if (editingItem.value) {
      await jurusanApi.update(editingItem.value.id, payload);
    } else {
      await jurusanApi.create(payload);
    }
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan jurusan');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Jurusan" subtitle="Kelola master data jurusan per golongan kelas.">
      <template #actions>
        <ImportExportButtons
          :export-fn="jurusanApi.exportExcel"
          :import-fn="jurusanApi.importExcel"
          :template-fn="jurusanApi.importTemplate"
          :can-import="canCreate"
          filename="jurusan.xlsx"
          template-filename="template-import-jurusan.xlsx"
          @imported="fetchItems"
        />
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Jurusan</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari jurusan..." />
        <div class="w-full md:w-64">
          <SelectInput
            v-model="golonganKelasFilter"
            placeholder="Semua Golongan Kelas"
            :options="golonganKelasOptions"
            @change="onFilterChange"
          />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-golonganKelas="{ item }">{{ item.golonganKelas?.namaKelas ?? '-' }}</template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah Jurusan' : 'Tambah Jurusan'" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <SelectInput
          v-model="form.golonganKelasId"
          label="Golongan Kelas"
          required
          :options="golonganKelasOptions"
          :error="errors.golonganKelasId"
        />
        <TextInput v-model="form.namaJurusan" label="Nama Jurusan" required :error="errors.namaJurusan" />
        <TextInput v-model="form.kodeProdi" label="Kode Prodi" placeholder="mis. 57201" />
        <TextInput
          v-model="form.singkatan"
          label="Singkatan Prodi"
          placeholder="mis. TI"
          hint="2 huruf untuk nama kelas mahasiswa (Generate NIM), mis. TI → TI1AP"
        />
        <FileInput
          v-model="form.foto"
          label="Foto Program Studi"
          accept="image/*"
          preview
          hint="Tampil di section 'Program Studi kami sudah Terakreditasi' di beranda. Disarankan foto persegi."
        />
        <TextareaInput
          v-model="form.prospekKarir"
          label="Prospek Karir"
          :rows="6"
          hint="Satu prospek karir per baris. Tampil sebagai daftar di beranda."
        />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.jenjangPendidikan" label="Jenjang Pendidikan" placeholder="mis. Diploma Tiga" />
          <TextInput v-model="form.namaFakultas" label="Fakultas" placeholder="mis. Fakultas Teknologi Informasi dan Digital" />
          <TextInput v-model="form.gelarSingkat" label="Gelar Singkat" placeholder="mis. A.Md.Kom." />
          <TextInput v-model="form.gelarLengkap" label="Gelar Lengkap" placeholder="mis. Ahli Madya Komputer" />
        </div>
        <p class="text-label-sm text-on-surface-variant -mt-2">
          Dipakai untuk mencetak ijazah, transkrip, dan surat kelulusan mahasiswa jurusan ini.
        </p>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Jurusan"
      :message="`Yakin ingin menghapus jurusan ${deleteTarget?.namaJurusan ?? ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

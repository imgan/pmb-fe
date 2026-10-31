<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import ImportExportButtons from '@/components/ui/ImportExportButtons.vue';
import SettingKurikulumModal from '@/components/kurikulum/SettingKurikulumModal.vue';
import { mataKuliahApi, type MataKuliahPayload } from '@/api/mataKuliah';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import IkonMataKuliahPicker from '@/components/elearning/IkonMataKuliahPicker.vue';
import MataKuliahIlustrasi from '@/components/elearning/MataKuliahIlustrasi.vue';
import type { KelompokMataKuliah, KelompokKurikulum, JenisMataKuliah, KelompokKompetensi, Kurikulum, MataKuliah } from '@/types/entities';

/**
 * Daftar & CRUD mata kuliah milik satu kurikulum (Kurikulum 1 ──< N MataKuliah), dipakai di halaman
 * detail kurikulum. Import Excel dari sini memasukkan semua baris ke kurikulum ini.
 */
const props = defineProps<{ kurikulum: Kurikulum; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>();
const emit = defineEmits<{ changed: [] }>();

const SEMESTER_OPTIONS: SelectOption[] = Array.from({ length: 14 }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1}` }));
const SKS_OPTIONS: SelectOption[] = Array.from({ length: 7 }, (_, i) => ({ value: i, label: String(i) }));
const KELOMPOK_MATA_KULIAH_LABELS: Record<KelompokMataKuliah, string> = {
  MPK: 'MPK - Pengembangan Kepribadian',
  MKK: 'MKK - Keilmuan & Keterampilan',
  MKB: 'MKB - Keahlian Berkarya',
  MPB: 'MPB - Perilaku Berkarya',
  MBB: 'MBB - Berkehidupan Bermasyarakat',
};
const KELOMPOK_KURIKULUM_LABELS: Record<KelompokKurikulum, string> = { WAJIB: 'Wajib', PILIHAN: 'Pilihan' };
const JENIS_MATA_KULIAH_LABELS: Record<JenisMataKuliah, string> = { TEORI: 'Teori', PRAKTIK: 'Praktik', TEORI_PRAKTIK: 'Teori & Praktik' };
const KELOMPOK_KOMPETENSI_LABELS: Record<KelompokKompetensi, string> = { UTAMA: 'Utama', PENDUKUNG: 'Pendukung', LAINNYA: 'Lainnya' };
const toOptions = (labels: Record<string, string>): SelectOption[] => Object.entries(labels).map(([value, label]) => ({ value, label }));
const kompIlmuKomputerOptions: SelectOption[] = [
  'Algoritma & Pemrograman',
  'Basis Data',
  'Jaringan Komputer',
  'Rekayasa Perangkat Lunak',
  'Kecerdasan Buatan',
  'Sistem Informasi',
].map((label) => ({ value: label, label }));
const mataKuliahMinatOptions: SelectOption[] = ['Rekayasa Perangkat Lunak', 'Jaringan & Keamanan', 'Data Science', 'Sistem Informasi', 'Multimedia'].map(
  (label) => ({ value: label, label })
);

const semesterFilter = ref<number | ''>('');
const obeFilter = ref<'' | 'true' | 'false'>('');
const OBE_OPTIONS: SelectOption[] = [
  { value: 'true', label: 'OBE' },
  { value: 'false', label: 'Non OBE' },
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
} = useCrudPage<MataKuliah>({
  fetchList: mataKuliahApi.list,
  remove: async (id) => {
    await mataKuliahApi.remove(id);
    emit('changed');
  },
  extraQuery: () => ({ kurikulumId: props.kurikulum.id, semester: semesterFilter.value || undefined, isObe: obeFilter.value || undefined }),
});
fetchItems();
watch([semesterFilter, obeFilter], () => {
  if (page.value === 1) fetchItems();
  else page.value = 1;
});

const columns: DataTableColumn[] = [
  { key: 'kode', label: 'Kode', sortable: true },
  { key: 'mataKuliah', label: 'Mata Kuliah', sortable: true },
  { key: 'semester', label: 'Semester', align: 'center', sortable: true },
  { key: 'sks', label: 'SKS (T/P/L/S)', align: 'center' },
  { key: 'sksTotal', label: 'Total', align: 'center' },
  { key: 'isObe', label: 'OBE', align: 'center', sortable: true },
  { key: 'kelompokKurikulum', label: 'Wajib/Pilihan', align: 'center' },
  { key: 'jenisMataKuliah', label: 'Jenis', align: 'center' },
];

interface FormState {
  kode: string;
  mataKuliah: string;
  mataKuliahEn: string;
  semester: number | '';
  kelompokMataKuliah: KelompokMataKuliah | '';
  kelompokKurikulum: KelompokKurikulum | '';
  jenisMataKuliah: JenisMataKuliah | '';
  sksTeori: number;
  sksPraktek: number;
  sksLab: number;
  sksSimulasi: number;
  kelompokKompetensi: KelompokKompetensi | '';
  kompIlmuKomputer: string;
  mataKuliahMinat: string;
  muatanMataKuliah: string;
  metodePembelajaran: string;
  idMatkul: string;
  isObe: boolean;
  silabus: string;
  ikon: string;
}
const emptyForm = (): FormState => ({
  kode: '',
  mataKuliah: '',
  mataKuliahEn: '',
  semester: '',
  kelompokMataKuliah: '',
  kelompokKurikulum: '',
  jenisMataKuliah: '',
  sksTeori: 0,
  sksPraktek: 0,
  sksLab: 0,
  sksSimulasi: 0,
  kelompokKompetensi: '',
  kompIlmuKomputer: '',
  mataKuliahMinat: '',
  muatanMataKuliah: '',
  metodePembelajaran: '',
  idMatkul: '',
  isObe: false,
  silabus: '',
  ikon: '',
});
const form = reactive(emptyForm());
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, mk]) => {
    if (!open) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    Object.assign(form, emptyForm());
    if (mk) {
      Object.assign(form, {
        kode: mk.kode,
        mataKuliah: mk.mataKuliah,
        mataKuliahEn: mk.mataKuliahEn ?? '',
        semester: mk.semester ?? '',
        kelompokMataKuliah: mk.kelompokMataKuliah ?? '',
        kelompokKurikulum: mk.kelompokKurikulum ?? '',
        jenisMataKuliah: mk.jenisMataKuliah ?? '',
        sksTeori: mk.sksTeori,
        sksPraktek: mk.sksPraktek,
        sksLab: mk.sksLab,
        sksSimulasi: mk.sksSimulasi,
        kelompokKompetensi: mk.kelompokKompetensi ?? '',
        kompIlmuKomputer: mk.kompIlmuKomputer ?? '',
        mataKuliahMinat: mk.mataKuliahMinat ?? '',
        muatanMataKuliah: mk.muatanMataKuliah ?? '',
        metodePembelajaran: mk.metodePembelajaran ?? '',
        idMatkul: mk.idMatkul ?? '',
        isObe: mk.isObe,
        silabus: mk.silabus ?? '',
        ikon: mk.ikon ?? '',
      });
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.kode.trim()) errors.kode = 'Kode mata kuliah wajib diisi';
  if (!form.mataKuliah.trim()) errors.mataKuliah = 'Nama mata kuliah wajib diisi';
  if (Object.keys(errors).length) return;

  const payload: MataKuliahPayload = {
    kurikulumId: props.kurikulum.id,
    kode: form.kode.trim(),
    mataKuliah: form.mataKuliah.trim(),
    mataKuliahEn: form.mataKuliahEn.trim() || null,
    semester: form.semester === '' ? null : Number(form.semester),
    kelompokMataKuliah: form.kelompokMataKuliah || null,
    kelompokKurikulum: form.kelompokKurikulum || null,
    jenisMataKuliah: form.jenisMataKuliah || null,
    sksTeori: Number(form.sksTeori) || 0,
    sksPraktek: Number(form.sksPraktek) || 0,
    sksLab: Number(form.sksLab) || 0,
    sksSimulasi: Number(form.sksSimulasi) || 0,
    kelompokKompetensi: form.kelompokKompetensi || null,
    kompIlmuKomputer: form.kompIlmuKomputer || null,
    mataKuliahMinat: form.mataKuliahMinat || null,
    muatanMataKuliah: form.muatanMataKuliah.trim() || null,
    metodePembelajaran: form.metodePembelajaran.trim() || null,
    idMatkul: form.idMatkul.trim() || null,
    isObe: form.isObe,
    silabus: form.silabus.trim() || null,
    ikon: form.ikon || null,
  };
  submitting.value = true;
  formError.value = null;
  try {
    if (editingItem.value) await mataKuliahApi.update(editingItem.value.id, payload);
    else await mataKuliahApi.create(payload);
    onSaved();
    emit('changed');
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan mata kuliah');
  } finally {
    submitting.value = false;
  }
};

const isSettingOpen = ref(false);
const onSettingSaved = () => {
  fetchItems();
  emit('changed');
};

const exportFn = () => mataKuliahApi.exportExcel({ kurikulumId: props.kurikulum.id });
const importFn = (file: string) => mataKuliahApi.importExcel(file, props.kurikulum.id);
const onImported = () => {
  fetchItems();
  emit('changed');
};
const filenameBase = computed(() => `mata-kuliah-${props.kurikulum.nama}`.replace(/[^A-Za-z0-9]+/g, '-'));
</script>

<template>
  <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
    <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium flex items-center justify-between gap-3">
      <span>Mata Kuliah · {{ kurikulum.nama }}</span>
    </div>

    <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-end md:justify-between gap-3">
      <div class="flex flex-wrap items-end gap-2">
        <div class="w-48">
          <SelectInput v-model="semesterFilter" placeholder="Semua Semester" :options="SEMESTER_OPTIONS" />
        </div>
        <div class="w-40">
          <SelectInput v-model="obeFilter" placeholder="OBE & Non OBE" :options="OBE_OPTIONS" />
        </div>
        <ImportExportButtons
          :export-fn="exportFn"
          :import-fn="importFn"
          :template-fn="mataKuliahApi.importTemplate"
          :can-import="canCreate"
          :filename="`${filenameBase}.xlsx`"
          template-filename="template-import-mata-kuliah.xlsx"
          @imported="onImported"
        />
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Mata Kuliah</AppButton>
      </div>
      <div class="flex flex-col sm:flex-row sm:items-center gap-2">
        <AppButton v-if="canUpdate" variant="secondary" icon="tune" @click="isSettingOpen = true">Setting Kurikulum</AppButton>
        <SearchInput v-model="search" placeholder="Cari kode atau nama mata kuliah..." />
      </div>
    </div>

    <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
    <div class="px-4 py-3 border-b border-outline-variant">
      <PageSizeSelect v-model="limit" />
    </div>

    <DataTable
      :columns="columns"
      :items="items"
      :loading="loading"
      empty-message="Kurikulum ini belum memiliki mata kuliah"
      :sort-key="sortBy"
      :sort-dir="sortDir"
      @sort="handleSort"
    >
      <template #cell-mataKuliah="{ item }">
        <span class="flex items-center gap-2.5">
          <MataKuliahIlustrasi :nama="item.mataKuliah" :kode="item.kode" :ikon="item.ikon" ukuran="sm" />
          <span>{{ item.mataKuliah }}</span>
        </span>
      </template>
      <template #cell-semester="{ item }">{{ item.semester ?? '-' }}</template>
      <template #cell-sks="{ item }">{{ item.sksTeori }}/{{ item.sksPraktek }}/{{ item.sksLab }}/{{ item.sksSimulasi }}</template>
      <template #cell-kelompokKurikulum="{ item }">{{ item.kelompokKurikulum ? KELOMPOK_KURIKULUM_LABELS[item.kelompokKurikulum as KelompokKurikulum] : '-' }}</template>
      <template #cell-isObe="{ item }">
        <StatusBadge :label="item.isObe ? 'OBE' : 'Non OBE'" :variant="item.isObe ? 'success' : 'neutral'" />
      </template>
      <template #cell-jenisMataKuliah="{ item }">{{ item.jenisMataKuliah ? JENIS_MATA_KULIAH_LABELS[item.jenisMataKuliah as JenisMataKuliah] : '-' }}</template>
      <template #actions="{ item }">
        <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
      </template>
    </DataTable>
    <Pagination v-model="page" :meta="meta" />

    <Modal :model-value="isFormOpen" :title="editingItem ? 'Ubah Mata Kuliah' : 'Tambah Mata Kuliah'" :subtitle="kurikulum.nama" size="lg" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput v-model="form.kode" label="Kode Matakuliah" required :error="errors.kode" />
          <SelectInput v-model="form.semester" label="Semester" placeholder="-- Pilih Semester --" :options="SEMESTER_OPTIONS" />
          <TextInput v-model="form.idMatkul" label="Id Matkul (Feeder)" />
        </div>
        <TextareaInput v-model="form.mataKuliah" label="Nama Matakuliah" required :error="errors.mataKuliah" />
        <TextareaInput v-model="form.mataKuliahEn" label="Nama Matakuliah English" />
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectInput v-model="form.kelompokMataKuliah" label="Kelompok Matakuliah" placeholder="-- Pilih Kelompok --" :options="toOptions(KELOMPOK_MATA_KULIAH_LABELS)" />
          <SelectInput v-model="form.kelompokKurikulum" label="Kelompok Kurikulum" placeholder="-- Status --" :options="toOptions(KELOMPOK_KURIKULUM_LABELS)" />
          <SelectInput v-model="form.jenisMataKuliah" label="Jenis Matakuliah" placeholder="-- Pilih Jenis --" :options="toOptions(JENIS_MATA_KULIAH_LABELS)" />
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SelectInput v-model="form.sksTeori" label="SKS Teori" :options="SKS_OPTIONS" />
          <SelectInput v-model="form.sksPraktek" label="SKS Praktek" :options="SKS_OPTIONS" />
          <SelectInput v-model="form.sksLab" label="SKS Praktek Lapangan" :options="SKS_OPTIONS" />
          <SelectInput v-model="form.sksSimulasi" label="SKS Simulasi" :options="SKS_OPTIONS" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectInput v-model="form.kelompokKompetensi" label="Kelompok Kompetensi" placeholder="-- Status --" :options="toOptions(KELOMPOK_KOMPETENSI_LABELS)" />
          <SelectInput v-model="form.kompIlmuKomputer" label="Komp. Ilmu Komputer" placeholder="-- Pilih Jenis --" :options="kompIlmuKomputerOptions" />
          <SelectInput v-model="form.mataKuliahMinat" label="Matakuliah Minat" placeholder="-- Pilih Minat --" :options="mataKuliahMinatOptions" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.muatanMataKuliah" label="Muatan Matakuliah" placeholder="Remark..." />
          <TextInput v-model="form.metodePembelajaran" label="Metode Pembelajaran" placeholder="mis. Ceramah, Diskusi, Praktikum" />
        </div>
        <CheckboxToggle v-model="form.isObe" label="Mata kuliah OBE" description="Centang bila mata kuliah ini berbasis Outcome-Based Education (OBE)." />
        <TextareaInput v-model="form.silabus" label="Silabus" :rows="4" placeholder="Deskripsi silabus (tampil di portal dosen → Silabus Matakuliah)" />
        <IkonMataKuliahPicker v-model="form.ikon" :nama="form.mataKuliah" :kode="form.kode" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <SettingKurikulumModal v-model="isSettingOpen" :kurikulum="kurikulum" @saved="onSettingSaved" />

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Mata Kuliah"
      :message="`Hapus mata kuliah ${deleteTarget?.kode ?? ''} ${deleteTarget?.mataKuliah ?? ''} dari kurikulum ini?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </section>
</template>

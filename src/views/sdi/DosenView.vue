<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ImportExportButtons from '@/components/ui/ImportExportButtons.vue';
import { dosenApi } from '@/api/dosen';
import { jurusanApi } from '@/api/jurusan';
import { extractErrorMessage } from '@/api/http';
import { toDateInputValue } from '@/utils/format';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { DosenProdiStatItem } from '@/types/entities';

// Halaman ini juga dipakai Modul Admin → Master, dengan kode menu Admin sebagai sumber hak akses.
const props = withDefaults(defineProps<{ menuCode?: string }>(), { menuCode: MENU.DOSEN_MANAGEMENT });
const { canCreate, canUpdate, canDelete } = usePermission(props.menuCode);

const STAT_STYLES = ['bg-[#1a5f9e]', 'bg-[#c9a83c]', 'bg-[#9c1c4c]', 'bg-[#2e7d5b]', 'bg-[#6a4c93]', 'bg-[#5b6472]'];

const stats = ref<DosenProdiStatItem[]>([]);
const loadStats = async () => {
  stats.value = await dosenApi.statsByProdi();
};

const prodiFilter = ref<number | ''>('');
const jenisFilter = ref<'' | 'INTERNAL' | 'EKSTERNAL'>('');
const JENIS_DOSEN_OPTIONS = [
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'EKSTERNAL', label: 'Eksternal' },
];

// Master Jurusan punya beberapa baris per prodi (satu per golongan kelas) — untuk Homebase
// cukup satu pilihan per nama prodi.
const homebaseOptions = ref<{ value: number; label: string }[]>([]);
jurusanApi.listProdi({ limit: 200 }).then((result) => {
  const seen = new Set<string>();
  homebaseOptions.value = result.data
    .filter((j) => (seen.has(j.namaJurusan) ? false : (seen.add(j.namaJurusan), true)))
    .map((j) => ({ value: j.id, label: j.namaJurusan }));
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
  fetchList: dosenApi.list,
  remove: dosenApi.remove,
  extraQuery: () => ({ jurusanId: prodiFilter.value || undefined, jenisDosen: jenisFilter.value || undefined }),
});

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const refreshAll = () => Promise.all([fetchItems(), loadStats()]);
refreshAll();

const columns: DataTableColumn[] = [
  { key: 'nidn', label: 'NIDN', sortable: true },
  { key: 'namaLengkap', label: 'Nama Lengkap', sortable: true },
  { key: 'gelar', label: 'Gelar' },
  { key: 'homebase', label: 'Prodi' },
  { key: 'nik', label: 'NIP', sortable: true },
  { key: 'jenisKelamin', label: 'JK', align: 'center' },
  { key: 'usia', label: 'Usia', align: 'center' },
  { key: 'jenisDosen', label: 'Jenis', align: 'center' },
  { key: 'statusDosen', label: 'Status Dosen' },
  { key: 'isActive', label: 'Status', align: 'center' },
];

const calcAge = (tanggalLahir: string | null): string => {
  if (!tanggalLahir) return '-';
  const birth = new Date(tanggalLahir);
  if (Number.isNaN(birth.getTime())) return '-';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return String(age);
};

const AGAMA_OPTIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'].map((v) => ({ value: v, label: v }));
const JABATAN_FUNGSIONAL_OPTIONS = ['Tenaga Pengajar', 'Asisten Ahli', 'Lektor', 'Lektor Kepala', 'Guru Besar'].map((v) => ({ value: v, label: v }));
const PENDIDIKAN_OPTIONS = ['SMA/SMK', 'D3', 'D4', 'S1', 'S2', 'S3'].map((v) => ({ value: v, label: v }));
const STATUS_OPTIONS = ['INSTITUSI', 'YAYASAN'].map((v) => ({ value: v, label: v }));

const form = reactive({
  nik: '' as string,
  nidn: '',
  nuptk: '',
  namaLengkap: '',
  gelar: '',
  jurusanId: '' as number | '',
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: '' as 'L' | 'P' | '',
  pendidikanAkhir: '',
  agama: '',
  telpHp: '',
  noWhatsapp: '',
  jabatanFungsional: '',
  kum: '' as number | string | null,
  email: '',
  alamat: '',
  statusDosen: '' as 'TETAP' | 'TIDAK_TETAP' | '',
  jenisDosen: 'INTERNAL' as 'INTERNAL' | 'EKSTERNAL',
  keterangan: '',
  status: '',
  waktu: '' as 'M' | 'P' | '',
  tmt: '',
  karyawanInternal: false,
  infaq: false,
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
    form.nik = editing?.nik ?? '';
    form.nidn = editing?.nidn ?? '';
    form.nuptk = editing?.nuptk ?? '';
    form.namaLengkap = editing?.namaLengkap ?? '';
    form.gelar = editing?.gelar ?? '';
    form.jurusanId = editing?.jurusanId ?? '';
    form.tempatLahir = editing?.tempatLahir ?? '';
    form.tanggalLahir = toDateInputValue(editing?.tanggalLahir);
    form.jenisKelamin = editing?.jenisKelamin ?? '';
    form.pendidikanAkhir = editing?.pendidikanAkhir ?? '';
    form.agama = editing?.agama ?? '';
    form.telpHp = editing?.telpHp ?? '';
    form.noWhatsapp = editing?.noWhatsapp ?? '';
    form.jabatanFungsional = editing?.jabatanFungsional ?? '';
    form.kum = editing?.kum ?? '';
    form.email = editing?.email ?? '';
    form.alamat = editing?.alamat ?? '';
    form.statusDosen = editing?.statusDosen ?? '';
    form.jenisDosen = editing?.jenisDosen ?? 'INTERNAL';
    form.keterangan = editing?.keterangan ?? '';
    form.status = editing?.status ?? '';
    form.waktu = editing?.waktu ?? '';
    form.tmt = toDateInputValue(editing?.tmt);
    form.karyawanInternal = editing?.karyawanInternal ?? false;
    form.infaq = editing?.infaq ?? false;
  },
  { immediate: true }
);

const handleSubmit = async () => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.nidn.trim()) errors.nidn = 'NIDN wajib diisi';
  if (!form.namaLengkap.trim()) errors.namaLengkap = 'Nama lengkap wajib diisi';
  if (form.jurusanId === '') errors.jurusanId = 'Prodi wajib dipilih';
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload = {
      nik: form.nik.trim() || null,
      nidn: form.nidn.trim(),
      nuptk: form.nuptk.trim() || null,
      namaLengkap: form.namaLengkap.trim(),
      gelar: form.gelar.trim() || null,
      jurusanId: form.jurusanId === '' ? null : Number(form.jurusanId),
      tempatLahir: form.tempatLahir.trim() || null,
      tanggalLahir: form.tanggalLahir || null,
      jenisKelamin: form.jenisKelamin || null,
      pendidikanAkhir: form.pendidikanAkhir || null,
      agama: form.agama || null,
      telpHp: form.telpHp.trim() || null,
      noWhatsapp: form.noWhatsapp.trim() || null,
      jabatanFungsional: form.jabatanFungsional || null,
      kum: form.kum === '' || form.kum === null ? null : Number(form.kum),
      email: form.email.trim() || null,
      alamat: form.alamat.trim() || null,
      statusDosen: form.statusDosen || null,
      jenisDosen: form.jenisDosen,
      keterangan: form.keterangan.trim() || null,
      status: form.status || null,
      waktu: form.waktu || null,
      tmt: form.tmt || null,
      karyawanInternal: form.karyawanInternal,
      infaq: form.infaq,
    };
    if (editingItem.value) {
      await dosenApi.update(editingItem.value.id, payload);
    } else {
      await dosenApi.create(payload);
    }
    onSaved();
    loadStats();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan dosen');
  } finally {
    submitting.value = false;
  }
};

const handleDeleted = async () => {
  await confirmDelete();
  loadStats();
};
</script>

<template>
  <div>
    <PageHeader title="Master Biodata Dosen" subtitle="Kelola data dosen di lingkungan SDI.">
      <template #actions>
        <ImportExportButtons
          :export-fn="dosenApi.exportExcel"
          :import-fn="dosenApi.importExcel"
          :template-fn="dosenApi.importTemplate"
          :can-import="canCreate"
          filename="dosen.xlsx"
          template-filename="template-import-dosen.xlsx"
          @imported="refreshAll"
        />
        <AppButton v-if="canCreate" icon="add" @click="openCreate">Tambah Dosen</AppButton>
      </template>
    </PageHeader>

    <section class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div
        v-for="(stat, index) in stats"
        :key="stat.namaJurusan ?? '-'"
        class="rounded-lg p-4 text-on-primary"
        :class="STAT_STYLES[index % STAT_STYLES.length]"
      >
        <p class="font-bold text-display-lg">{{ stat.total }}</p>
        <p class="text-label-md opacity-90">{{ stat.namaJurusan ?? 'Belum Ada Prodi' }}</p>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari nama, NIDN, atau NIK..." />
        <div class="w-full md:w-44">
          <SelectInput v-model="jenisFilter" placeholder="Internal & Eksternal" :options="JENIS_DOSEN_OPTIONS" @change="onFilterChange" />
        </div>
        <div class="w-full md:w-52">
          <SelectInput
            v-model="prodiFilter"
            placeholder="Semua Prodi"
            :options="homebaseOptions"
            @change="onFilterChange"
          />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable :columns="columns" :items="items" :loading="loading" :sort-key="sortBy" :sort-dir="sortDir" @sort="handleSort">
        <template #cell-gelar="{ item }">{{ item.gelar || '-' }}</template>
        <template #cell-homebase="{ item }">{{ item.jurusan?.namaJurusan ?? '-' }}</template>
        <template #cell-nik="{ item }">{{ item.nik || '-' }}</template>
        <template #cell-jenisKelamin="{ item }">{{ item.jenisKelamin ?? '-' }}</template>
        <template #cell-usia="{ item }">{{ calcAge(item.tanggalLahir) }}</template>
        <template #cell-jenisDosen="{ item }">
          <StatusBadge :variant="item.jenisDosen === 'EKSTERNAL' ? 'warning' : 'success'" :label="item.jenisDosen === 'EKSTERNAL' ? 'Eksternal' : 'Internal'" />
          <span v-if="item.keterangan" class="block mt-1 text-label-sm text-on-surface-variant">{{ item.keterangan }}</span>
        </template>
        <template #cell-statusDosen="{ item }">{{ item.statusDosen === 'TETAP' ? 'Tetap' : item.statusDosen === 'TIDAK_TETAP' ? 'Tidak Tetap' : '-' }}</template>
        <template #cell-isActive="{ item }">
          <StatusBadge :variant="item.isActive ? 'success' : 'neutral'" :label="item.isActive ? 'Aktif' : 'Non-aktif'" />
        </template>
        <template #actions="{ item }">
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal :model-value="isFormOpen" size="lg" :title="editingItem ? 'Ubah Biodata Dosen' : 'Form Tambah Master Biodata Dosen'" @update:model-value="closeForm">
      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="md:col-span-2 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>

        <TextInput v-model="form.nik" label="NIP" placeholder="Contoh: D-2501036" />
        <TextInput v-model="form.nidn" label="NIDN" required :error="errors.nidn" />
        <TextInput v-model="form.nuptk" label="NUPTK" />
        <SelectInput
          v-model="form.jurusanId"
          label="Prodi (Homebase)"
          required
          placeholder="--Pilih Prodi--"
          :options="homebaseOptions"
          :error="errors.jurusanId"
        />
        <TextInput v-model="form.namaLengkap" label="Nama Lengkap" required :error="errors.namaLengkap" />
        <TextInput v-model="form.gelar" label="Gelar" placeholder="Contoh: S.E., M.M" />
        <TextInput v-model="form.tempatLahir" label="Tempat Lahir" />
        <DateInput v-model="form.tanggalLahir" label="Tanggal Lahir" />
        <SelectInput
          v-model="form.jenisKelamin"
          label="Jenis Kelamin"
          placeholder="--Pilih Jenis Kelamin--"
          :options="[{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]"
        />
        <SelectInput v-model="form.pendidikanAkhir" label="Pendidikan Akhir" placeholder="--Pilih Pendidikan Akhir--" :options="PENDIDIKAN_OPTIONS" />
        <SelectInput v-model="form.agama" label="Agama" placeholder="--Agama--" :options="AGAMA_OPTIONS" />
        <TextInput v-model="form.telpHp" label="Telp/HP" />
        <TextInput v-model="form.noWhatsapp" label="No WhatsApp" />
        <SelectInput v-model="form.jabatanFungsional" label="Jabatan Fungsional" placeholder="--Pilih Jabatan--" :options="JABATAN_FUNGSIONAL_OPTIONS" />
        <TextInput v-model="form.kum" type="number" label="KUM (angka kredit)" />
        <TextInput v-model="form.email" type="email" label="Email" />
        <TextareaInput v-model="form.alamat" label="Alamat" class="md:col-span-2" :rows="3" />
        <SelectInput
          v-model="form.statusDosen"
          label="Status Dosen"
          placeholder="--Pilih Status Dosen--"
          :options="[{ value: 'TETAP', label: 'Tetap' }, { value: 'TIDAK_TETAP', label: 'Tidak Tetap' }]"
        />
        <SelectInput v-model="form.jenisDosen" label="Jenis Dosen" required :options="JENIS_DOSEN_OPTIONS" />
        <TextInput v-model="form.keterangan" label="Keterangan" placeholder="Contoh: Struktural" />
        <SelectInput v-model="form.status" label="Status" placeholder="--Pilih Status--" :options="STATUS_OPTIONS" />
        <SelectInput
          v-model="form.waktu"
          label="Waktu"
          placeholder="--Pilih Waktu--"
          :options="[{ value: 'M', label: 'M' }, { value: 'P', label: 'P' }]"
        />
        <DateInput v-model="form.tmt" label="TMT" />
        <CheckboxToggle v-model="form.karyawanInternal" label="Karyawan Internal" />
        <CheckboxToggle v-model="form.infaq" label="Infaq" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Dosen"
      :message="`Yakin ingin menghapus dosen ${deleteTarget?.namaLengkap ?? ''}?`"
      :loading="deleting"
      @confirm="handleDeleted"
      @cancel="cancelDelete"
    />
  </div>
</template>

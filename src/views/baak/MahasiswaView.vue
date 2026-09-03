<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ImportExportButtons from '@/components/ui/ImportExportButtons.vue';
import { mahasiswaApi, type MahasiswaBiodataPayload } from '@/api/mahasiswa';
import { golonganKelasApi } from '@/api/golonganKelas';
import { jurusanApi } from '@/api/jurusan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { toastSuccess, toastError } from '@/utils/swal';
import { MENU } from '@/constants/menuCodes';
import type { EligibleSummaryItem, Mahasiswa, StatusMasukMahasiswa } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.MAHASISWA_MANAGEMENT);

const STATUS_MASUK_OPTIONS: { value: StatusMasukMahasiswa; label: string }[] = [
  { value: 'BARU', label: 'Baru' },
  { value: 'TRANSFER_LUAR', label: 'Transfer Luar' },
  { value: 'TRANSFER_DALAM', label: 'Transfer Dalam' },
  { value: 'TRANSFER_LUAR_KARYAWAN', label: 'Transfer Luar Karyawan' },
  { value: 'TRANSFER_DALAM_KARYAWAN', label: 'Transfer Dalam Karyawan' },
];

const golonganKelasOptions = ref<{ value: number; label: string }[]>([]);
const jurusanOptions = ref<{ value: number; label: string }[]>([]);
const tahunAjaranAktifOptions = ref<{ value: number; label: string }[]>([]);
const golonganKelasFilter = ref<number | ''>('');
const jurusanFilter = ref<number | ''>('');
const statusFilter = ref<'' | 'true' | 'false'>('');
const tahunMasukFilter = ref<number | ''>('');

const statusOptions = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Non-aktif' },
];

onMounted(async () => {
  const [golongan, jurusan, tahunAjaran] = await Promise.all([
    golonganKelasApi.list({ limit: 100 }),
    jurusanApi.list({ limit: 100 }),
    tahunAjaranApi.list({ limit: 100, isActive: true }),
  ]);
  golonganKelasOptions.value = golongan.data.map((g) => ({ value: g.id, label: g.namaKelas }));
  jurusanOptions.value = jurusan.data.map((j) => ({ value: j.id, label: j.namaJurusan }));
  tahunAjaranAktifOptions.value = tahunAjaran.data.map((t) => ({ value: t.id, label: t.nama }));
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
  openEdit,
  closeForm,
  onSaved,
  requestDelete,
  cancelDelete,
  confirmDelete,
} = useCrudPage({
  fetchList: mahasiswaApi.list,
  remove: mahasiswaApi.remove,
  extraQuery: () => ({
    golonganKelasId: golonganKelasFilter.value || undefined,
    jurusanId: jurusanFilter.value || undefined,
    isActive: statusFilter.value || undefined,
    tahunMasuk: tahunMasukFilter.value || undefined,
  }),
});

fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
};

const columns: DataTableColumn[] = [
  { key: 'nim', label: 'NIM', sortable: true },
  { key: 'namaLengkap', label: 'Nama Lengkap', sortable: true },
  { key: 'jurusan', label: 'Jurusan', sortable: true },
  { key: 'golonganKelas', label: 'Golongan Kelas', sortable: true },
  { key: 'alamat', label: 'Alamat' },
  { key: 'tahunMasuk', label: 'Tahun Masuk', align: 'center', sortable: true },
  { key: 'isActive', label: 'Status', align: 'center', sortable: true },
];

// ---- Ubah data mahasiswa ----
const form = reactive({
  nim: '',
  namaLengkap: '',
  email: '',
  noTelepon: '',
  asalSekolah: '',
  alamat: '',
  golonganKelasId: '' as number | '',
  jurusanId: '' as number | '',
  tahunMasuk: new Date().getFullYear(),
  statusMasuk: 'BARU' as StatusMasukMahasiswa,
  semesterDiakui: '' as number | '',
  jumlahSemesterCuti: 0,
  semesterOverride: '' as number | '',
  isActive: true,
});

const isTransfer = (status: StatusMasukMahasiswa) => status.startsWith('TRANSFER');
const formError = ref<string | null>(null);
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);

watch(
  () => [isFormOpen.value, editingItem.value] as const,
  ([open, editing]) => {
    if (!open || !editing) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    formError.value = null;
    form.nim = editing.nim;
    form.namaLengkap = editing.namaLengkap;
    form.email = editing.email;
    form.noTelepon = editing.noTelepon ?? '';
    form.asalSekolah = editing.asalSekolah ?? '';
    form.alamat = editing.alamat ?? '';
    form.golonganKelasId = editing.golonganKelasId;
    form.jurusanId = editing.jurusanId;
    form.tahunMasuk = editing.tahunMasuk;
    form.statusMasuk = editing.statusMasuk;
    form.semesterDiakui = editing.semesterDiakui ?? '';
    form.jumlahSemesterCuti = editing.jumlahSemesterCuti ?? 0;
    form.semesterOverride = editing.semesterOverride ?? '';
    form.isActive = editing.isActive;
  },
  { immediate: true }
);

const handleSubmit = async () => {
  if (!editingItem.value) return;
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.nim.trim()) errors.nim = 'NIM wajib diisi';
  if (!form.namaLengkap.trim()) errors.namaLengkap = 'Nama lengkap wajib diisi';
  if (!form.email.trim()) errors.email = 'Email wajib diisi';
  if (!form.golonganKelasId) errors.golonganKelasId = 'Golongan kelas wajib dipilih';
  if (!form.jurusanId) errors.jurusanId = 'Jurusan wajib dipilih';
  if (isTransfer(form.statusMasuk) && !form.semesterDiakui) {
    errors.semesterDiakui = 'Semester diakui wajib diisi untuk mahasiswa transfer (sesuai SK penyetaraan)';
  }
  if (Object.keys(errors).length > 0) return;

  submitting.value = true;
  formError.value = null;
  try {
    await mahasiswaApi.update(editingItem.value.id, {
      nim: form.nim.trim(),
      namaLengkap: form.namaLengkap.trim(),
      email: form.email.trim(),
      noTelepon: form.noTelepon.trim() || null,
      asalSekolah: form.asalSekolah.trim() || null,
      alamat: form.alamat.trim() || null,
      golonganKelasId: Number(form.golonganKelasId),
      jurusanId: Number(form.jurusanId),
      tahunMasuk: Number(form.tahunMasuk),
      statusMasuk: form.statusMasuk,
      semesterDiakui: isTransfer(form.statusMasuk) ? Number(form.semesterDiakui) : null,
      jumlahSemesterCuti: Number(form.jumlahSemesterCuti) || 0,
      semesterOverride: form.semesterOverride === '' ? null : Number(form.semesterOverride),
      isActive: form.isActive,
    });
    onSaved();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data mahasiswa');
  } finally {
    submitting.value = false;
  }
};

// ---- Biodata mahasiswa (alamat, orang tua, data PDDIKTI) ----
const agamaOptions = [
  { value: 'Islam', label: 'Islam' },
  { value: 'Kristen', label: 'Kristen' },
  { value: 'Katolik', label: 'Katolik' },
  { value: 'Hindu', label: 'Hindu' },
  { value: 'Buddha', label: 'Buddha' },
  { value: 'Khonghucu', label: 'Khonghucu' },
  { value: 'Lainnya', label: 'Lainnya' },
];
const jenisTinggalOptions = [
  { value: 'Orang Tua', label: 'Orang Tua' },
  { value: 'Wali', label: 'Wali' },
  { value: 'Kos/Asrama', label: 'Kos/Asrama' },
  { value: 'Rumah Sendiri', label: 'Rumah Sendiri' },
  { value: 'Lainnya', label: 'Lainnya' },
];
const alatTransportasiOptions = [
  { value: 'Jalan Kaki', label: 'Jalan Kaki' },
  { value: 'Kendaraan Pribadi', label: 'Kendaraan Pribadi' },
  { value: 'Angkutan Umum', label: 'Angkutan Umum' },
  { value: 'Kendaraan Sekolah/Kampus', label: 'Kendaraan Sekolah/Kampus' },
  { value: 'Lainnya', label: 'Lainnya' },
];
const waktuKuliahOptions = [
  { value: 'Pagi', label: 'Pagi' },
  { value: 'Siang', label: 'Siang' },
  { value: 'Malam', label: 'Malam' },
];
const statusBelajarOptions = [
  { value: 'Non Shift', label: 'Non Shift' },
  { value: 'Shift', label: 'Shift' },
];
const statusKuliahBiodataOptions = [
  { value: 'Baru', label: 'Baru' },
  { value: 'Lama', label: 'Lama' },
  { value: 'Pindahan', label: 'Pindahan' },
];
const statusDiktiOptions = [
  { value: 'Mahasiswa Reguler', label: 'Mahasiswa Reguler' },
  { value: 'Mahasiswa Asing', label: 'Mahasiswa Asing' },
  { value: 'Mahasiswa Pindahan', label: 'Mahasiswa Pindahan' },
  { value: 'Mahasiswa Melanjutkan', label: 'Mahasiswa Melanjutkan' },
];

const isBiodataOpen = ref(false);
const biodataTarget = ref<Mahasiswa | null>(null);
const biodataLoading = ref(false);
const biodataError = ref<string | null>(null);
const biodataSubmitting = ref(false);

const DATE_BIODATA_KEYS = ['tanggalLahir', 'tanggalMasukKuliah', 'tanggalLahirAyah', 'tanggalLahirIbu', 'tanggalLahirWali'];

const emptyBiodataForm = (): Record<string, string> => ({
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: '',
  agama: '',
  kewarganegaraan: 'Indonesia',
  noKtp: '',
  nisn: '',
  jalurPendaftaran: '',
  npwp: '',
  jenisPendaftaran: '',
  tanggalMasukKuliah: '',
  mulaiSemester: '',
  jalan: '',
  dusun: '',
  rt: '',
  rw: '',
  kelurahan: '',
  kecamatan: '',
  kodePos: '',
  propinsi: '',
  jenisTinggal: '',
  alatTransportasi: '',
  teleponRumah: '',
  kelas: '',
  programStudi: '',
  waktuKuliah: '',
  statusBelajar: '',
  statusKuliah: '',
  statusDikti: '',
  email: '',
  hp: '',
  almamater: '',
  terimaKps: '',
  noKps: '',
  nikAyah: '',
  namaAyah: '',
  tanggalLahirAyah: '',
  pendidikanAyah: '',
  pekerjaanAyah: '',
  penghasilanAyah: '',
  nikIbu: '',
  namaIbu: '',
  tanggalLahirIbu: '',
  pendidikanIbu: '',
  pekerjaanIbu: '',
  penghasilanIbu: '',
  namaWali: '',
  tanggalLahirWali: '',
  pendidikanWali: '',
  pekerjaanWali: '',
  penghasilanWali: '',
  jenisPembiayaan: '',
  biayaMasuk: '',
  sksDiakui: '',
  perguruanTinggiAsal: '',
  programStudiAsal: '',
});

const biodataForm = reactive(emptyBiodataForm());

const openBiodata = async (item: Mahasiswa) => {
  biodataTarget.value = item;
  isBiodataOpen.value = true;
  biodataError.value = null;
  biodataLoading.value = true;
  Object.assign(biodataForm, emptyBiodataForm());
  try {
    const biodata = await mahasiswaApi.getBiodata(item.id);
    if (biodata) {
      Object.keys(biodataForm).forEach((key) => {
        const value = (biodata as unknown as Record<string, string | number | null>)[key];
        (biodataForm as Record<string, string>)[key] = value === null || value === undefined ? '' : String(value);
      });
      DATE_BIODATA_KEYS.forEach((key) => {
        const value = (biodata as unknown as Record<string, string | null>)[key];
        biodataForm[key] = value?.slice(0, 10) ?? '';
      });
    } else if (item.jurusan) {
      biodataForm.programStudi = item.jurusan.namaJurusan;
    }
  } catch (err) {
    biodataError.value = extractErrorMessage(err, 'Gagal memuat biodata mahasiswa');
  } finally {
    biodataLoading.value = false;
  }
};

const closeBiodata = () => {
  isBiodataOpen.value = false;
  biodataTarget.value = null;
};

const handleSaveBiodata = async () => {
  if (!biodataTarget.value) return;
  biodataSubmitting.value = true;
  biodataError.value = null;
  try {
    const payload: MahasiswaBiodataPayload = {};
    Object.entries(biodataForm).forEach(([key, value]) => {
      (payload as Record<string, string | null>)[key] = value.trim() || null;
    });
    await mahasiswaApi.saveBiodata(biodataTarget.value.id, payload);
    toastSuccess('Biodata mahasiswa berhasil disimpan');
    closeBiodata();
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal menyimpan biodata mahasiswa');
    biodataError.value = message;
    toastError(message);
  } finally {
    biodataSubmitting.value = false;
  }
};

// ---- Generate mahasiswa dari peserta yang lulus ujian ----
const isGenerateOpen = ref(false);
const generateLoading = ref(false);
const generateError = ref<string | null>(null);
const generateSubmitting = ref(false);
const summary = ref<EligibleSummaryItem[]>([]);
const generateTahunAjaranId = ref<number | ''>('');
const prefixes = reactive<Record<number, string>>({});

const openGenerate = async () => {
  isGenerateOpen.value = true;
  generateError.value = null;
  generateLoading.value = true;
  if (!generateTahunAjaranId.value) {
    generateTahunAjaranId.value = tahunAjaranAktifOptions.value[0]?.value ?? '';
  }
  try {
    summary.value = await mahasiswaApi.eligibleSummary();
    summary.value.forEach((row) => {
      if (!(row.jurusanId in prefixes)) prefixes[row.jurusanId] = '';
    });
  } catch (err) {
    generateError.value = extractErrorMessage(err, 'Gagal memuat ringkasan peserta lulus ujian');
  } finally {
    generateLoading.value = false;
  }
};

const closeGenerate = () => {
  isGenerateOpen.value = false;
};

const totalEligible = () => summary.value.reduce((sum, row) => sum + row.total, 0);

const handleGenerate = async () => {
  generateError.value = null;

  if (!generateTahunAjaranId.value) {
    generateError.value = 'Tahun ajaran wajib dipilih';
    return;
  }
  if (!summary.value.length) {
    generateError.value = 'Tidak ada peserta yang lulus ujian dan siap dijadikan mahasiswa';
    return;
  }
  const missing = summary.value.filter((row) => !prefixes[row.jurusanId]?.trim());
  if (missing.length) {
    generateError.value = `Prefix NIM belum diisi untuk jurusan: ${missing.map((m) => m.namaJurusan).join(', ')}`;
    return;
  }

  generateSubmitting.value = true;
  try {
    const jurusanPrefixes: Record<number, string> = {};
    summary.value.forEach((row) => {
      jurusanPrefixes[row.jurusanId] = prefixes[row.jurusanId].trim().toUpperCase();
    });

    const created = await mahasiswaApi.generate({
      tahunAjaranId: Number(generateTahunAjaranId.value),
      jurusanPrefixes,
    });

    toastSuccess(`${created.length} mahasiswa berhasil digenerate`);
    closeGenerate();
    page.value = 1;
    fetchItems();
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal generate mahasiswa');
    generateError.value = message;
    toastError(message);
  } finally {
    generateSubmitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader
      title="Mahasiswa"
      subtitle="Master data mahasiswa aktif, digenerate dari peserta PMB yang telah lulus ujian dan diterima."
    >
      <template #actions>
        <ImportExportButtons
          :export-fn="mahasiswaApi.exportExcel"
          :import-fn="mahasiswaApi.importExcel"
          :template-fn="mahasiswaApi.importTemplate"
          :can-import="canUpdate"
          filename="mahasiswa.xlsx"
          template-filename="template-import-mahasiswa.xlsx"
          @imported="fetchItems"
        />
        <AppButton v-if="canCreate" icon="auto_awesome" @click="openGenerate">Generate dari Peserta Lulus</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col gap-3 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari NIM, nama, atau email..." />
        <div class="flex flex-col md:flex-row gap-3">
          <div class="w-full md:w-52">
            <SelectInput
              v-model="jurusanFilter"
              placeholder="Semua Jurusan"
              :options="jurusanOptions"
              @change="onFilterChange"
            />
          </div>
          <div class="w-full md:w-52">
            <SelectInput
              v-model="golonganKelasFilter"
              placeholder="Semua Golongan Kelas"
              :options="golonganKelasOptions"
              @change="onFilterChange"
            />
          </div>
          <div class="w-full md:w-44">
            <SelectInput
              v-model="statusFilter"
              placeholder="Semua Status"
              :options="statusOptions"
              @change="onFilterChange"
            />
          </div>
          <div class="w-full md:w-40">
            <TextInput
              v-model.number="tahunMasukFilter"
              type="number"
              placeholder="Tahun Masuk"
              @change="onFilterChange"
            />
          </div>
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada data mahasiswa"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-namaLengkap="{ item }">
          {{ item.namaLengkap }}
          <span
            v-if="item.semesterOverride != null"
            class="block text-label-sm text-primary"
            :title="'Semester di-override manual ke ' + item.semesterOverride"
          >
            Semester override: {{ item.semesterOverride }}
          </span>
        </template>
        <template #cell-jurusan="{ item }">{{ item.jurusan?.namaJurusan ?? '-' }}</template>
        <template #cell-golonganKelas="{ item }">{{ item.golonganKelas?.namaKelas ?? '-' }}</template>
        <template #cell-alamat="{ item }">
          <span class="block max-w-64 truncate" :title="item.alamat ?? ''">{{ item.alamat || '-' }}</span>
        </template>
        <template #cell-tahunMasuk="{ item }">
          {{ item.tahunMasuk }}
          <span v-if="item.tahunAjaran" class="block text-label-sm text-on-surface-variant">{{ item.tahunAjaran.nama }}</span>
        </template>
        <template #cell-isActive="{ item }">
          <StatusBadge :label="item.isActive ? 'Aktif' : 'Non-aktif'" :variant="item.isActive ? 'success' : 'neutral'" />
        </template>
        <template #actions="{ item }">
          <button
            type="button"
            class="text-on-surface-variant hover:text-primary transition-colors"
            title="Biodata"
            @click="openBiodata(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">contact_page</span>
          </button>
          <RowActions :can-update="canUpdate" :can-delete="canDelete" @edit="openEdit(item)" @delete="requestDelete(item)" />
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <!-- Modal: Ubah Mahasiswa -->
    <Modal :model-value="isFormOpen" title="Ubah Data Mahasiswa" size="lg" @update:model-value="closeForm">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.nim" label="NIM" required :error="errors.nim" />
          <TextInput v-model="form.namaLengkap" label="Nama Lengkap" required :error="errors.namaLengkap" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.email" label="Email" type="email" required :error="errors.email" />
          <TextInput v-model="form.noTelepon" label="No Telepon" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput v-model="form.jurusanId" label="Jurusan" required :options="jurusanOptions" :error="errors.jurusanId" />
          <SelectInput
            v-model="form.golonganKelasId"
            label="Golongan Kelas"
            required
            :options="golonganKelasOptions"
            :error="errors.golonganKelasId"
          />
        </div>
        <TextInput v-model="form.alamat" label="Alamat" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.asalSekolah" label="Asal Sekolah" />
          <TextInput v-model.number="form.tahunMasuk" label="Tahun Masuk" type="number" />
        </div>
        <SelectInput v-model="form.statusMasuk" label="Status Masuk" :options="STATUS_MASUK_OPTIONS" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            v-if="isTransfer(form.statusMasuk)"
            v-model.number="form.semesterDiakui"
            label="Semester Diakui"
            type="number"
            required
            placeholder="mis. 3 (sesuai SK penyetaraan)"
            :error="errors.semesterDiakui"
          />
          <TextInput v-model.number="form.jumlahSemesterCuti" label="Jumlah Semester Cuti" type="number" min="0" />
        </div>
        <p v-if="isTransfer(form.statusMasuk)" class="text-label-sm text-on-surface-variant -mt-2">
          Semester diakui &amp; jumlah semester cuti dipakai untuk menghitung otomatis semester
          berjalan mahasiswa di KRS — bukan hasil rumus, isi sesuai SK penyetaraan/akademik.
        </p>
        <TextInput
          v-model.number="form.semesterOverride"
          label="Semester Override (opsional)"
          type="number"
          min="1"
          placeholder="Kosongkan untuk pakai hitungan otomatis"
        />
        <p class="text-label-sm text-on-surface-variant -mt-2">
          Hanya untuk koreksi kasus khusus per mahasiswa — kalau diisi, MENGGANTIKAN hasil
          hitungan otomatis di KRS untuk mahasiswa ini saja (mengabaikan tahun masuk/cuti/semester
          diakui). Kosongkan supaya semester tetap dihitung otomatis seperti biasa.
        </p>
        <CheckboxToggle v-model="form.isActive" label="Status Aktif" description="Nonaktifkan jika mahasiswa cuti/keluar" />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <!-- Modal: Generate Mahasiswa dari Peserta Lulus -->
    <Modal
      :model-value="isGenerateOpen"
      title="Generate Mahasiswa dari Peserta Lulus"
      subtitle="Peserta yang sudah lulus ujian & diterima akan dibuatkan NIM lalu dimasukkan ke tabel mahasiswa dalam satu kali proses batch."
      size="lg"
      @update:model-value="closeGenerate"
    >
      <div class="space-y-4">
        <div v-if="generateError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ generateError }}
        </div>

        <div v-if="generateLoading" class="text-body-sm text-on-surface-variant py-4 text-center">Memuat data peserta...</div>

        <template v-else>
          <div>
            <SelectInput
              v-model="generateTahunAjaranId"
              label="Tahun Ajaran"
              required
              placeholder="Pilih tahun ajaran..."
              :options="tahunAjaranAktifOptions"
            />
            <p class="mt-1 text-label-sm text-on-surface-variant">
              Tahun mulai dari tahun ajaran ini dipakai sebagai bagian dari NIM, mis. TI20260001. Hanya tahun ajaran
              berstatus aktif yang bisa dipilih.
            </p>
          </div>

          <div v-if="summary.length === 0" class="px-3 py-6 text-center text-body-sm text-on-surface-variant border border-dashed border-outline-variant rounded-md">
            Tidak ada peserta yang lulus ujian & diterima yang belum memiliki NIM.
          </div>

          <div v-else class="space-y-3">
            <p class="text-label-sm text-on-surface-variant">
              {{ totalEligible() }} peserta siap digenerate. Isi prefix NIM untuk masing-masing jurusan:
            </p>
            <div
              v-for="row in summary"
              :key="row.jurusanId"
              class="flex items-center gap-4 p-3 border border-outline-variant rounded-md"
            >
              <div class="flex-1">
                <p class="text-label-md text-on-surface font-medium">{{ row.namaJurusan }}</p>
                <p class="text-label-sm text-on-surface-variant">{{ row.total }} peserta lulus</p>
              </div>
              <div class="w-40">
                <TextInput v-model="prefixes[row.jurusanId]" placeholder="mis. TI" />
              </div>
            </div>
          </div>
        </template>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeGenerate">Batal</AppButton>
        <AppButton :disabled="generateSubmitting || generateLoading || summary.length === 0" @click="handleGenerate">
          {{ generateSubmitting ? 'Memproses...' : 'Generate Mahasiswa' }}
        </AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Mahasiswa"
      :message="`Yakin ingin menghapus data mahasiswa ${deleteTarget?.namaLengkap ?? ''} (${deleteTarget?.nim ?? ''})?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />

    <!-- Modal: Biodata Mahasiswa -->
    <Modal
      :model-value="isBiodataOpen"
      title="Biodata Mahasiswa"
      :subtitle="biodataTarget ? `${biodataTarget.namaLengkap} — ${biodataTarget.nim}` : undefined"
      size="lg"
      @update:model-value="closeBiodata"
    >
      <div v-if="biodataLoading" class="text-center py-12 text-on-surface-variant">Memuat biodata...</div>
      <form v-else class="space-y-4" @submit.prevent="handleSaveBiodata">
        <div v-if="biodataError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ biodataError }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="biodataForm.tempatLahir" label="Tempat Lahir" />
          <DateInput v-model="biodataForm.tanggalLahir" label="Tanggal Lahir" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            v-model="biodataForm.jenisKelamin"
            label="Jenis Kelamin"
            placeholder="Pilih jenis kelamin..."
            :options="[{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]"
          />
          <SelectInput v-model="biodataForm.agama" label="Agama" placeholder="Pilih agama..." :options="agamaOptions" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="biodataForm.noKtp" label="NIK" />
          <TextInput v-model="biodataForm.nisn" label="NISN" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="biodataForm.kewarganegaraan" label="Kewarganegaraan" />
          <TextInput v-model="biodataForm.npwp" label="NPWP" />
        </div>

        <div class="pt-2 border-t border-outline-variant">
          <p class="font-medium text-label-md text-on-surface mb-4">Data Pendaftaran</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="biodataForm.jalurPendaftaran" label="Jalur Pendaftaran" />
            <TextInput v-model="biodataForm.jenisPendaftaran" label="Jenis Pendaftaran" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <DateInput v-model="biodataForm.tanggalMasukKuliah" label="Tgl Masuk Kuliah" />
            <TextInput v-model="biodataForm.mulaiSemester" label="Mulai Semester" />
          </div>
        </div>

        <div class="pt-2 border-t border-outline-variant">
          <p class="font-medium text-label-md text-on-surface mb-4">Alamat</p>
          <TextInput v-model="biodataForm.jalan" label="Jalan" />
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <TextInput v-model="biodataForm.dusun" label="Dusun" />
            <TextInput v-model="biodataForm.rt" label="RT" />
            <TextInput v-model="biodataForm.rw" label="RW" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextInput v-model="biodataForm.kelurahan" label="Kelurahan" />
            <TextInput v-model="biodataForm.kecamatan" label="Kecamatan" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextInput v-model="biodataForm.kodePos" label="Kode Pos" />
            <TextInput v-model="biodataForm.propinsi" label="Propinsi" />
          </div>
        </div>

        <SelectInput
          v-model="biodataForm.jenisTinggal"
          label="Jenis Tinggal"
          placeholder="Pilih jenis tinggal..."
          :options="jenisTinggalOptions"
        />
        <SelectInput
          v-model="biodataForm.alatTransportasi"
          label="Alat Transportasi"
          placeholder="Pilih alat transportasi..."
          :options="alatTransportasiOptions"
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="biodataForm.kelas" label="Kelas" placeholder="mis. B" />
          <TextInput v-model="biodataForm.programStudi" label="Program Studi" />
        </div>

        <SelectInput v-model="biodataForm.waktuKuliah" label="Waktu Kuliah" placeholder="Pilih waktu..." :options="waktuKuliahOptions" />
        <SelectInput
          v-model="biodataForm.statusBelajar"
          label="Status Belajar"
          placeholder="Pilih status belajar..."
          :options="statusBelajarOptions"
        />
        <SelectInput
          v-model="biodataForm.statusKuliah"
          label="Status Kuliah"
          placeholder="Pilih status kuliah..."
          :options="statusKuliahBiodataOptions"
        />
        <SelectInput
          v-model="biodataForm.statusDikti"
          label="Status Dikti"
          placeholder="Pilih status dikti..."
          :options="statusDiktiOptions"
        />

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextInput v-model="biodataForm.email" label="E-mail" type="email" />
          <TextInput v-model="biodataForm.hp" label="No HP" />
          <TextInput v-model="biodataForm.teleponRumah" label="Telp Rumah" />
        </div>
        <TextInput v-model="biodataForm.almamater" label="Almamater" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            v-model="biodataForm.terimaKps"
            label="Terima KPS"
            placeholder="Pilih..."
            :options="[{ value: 'Ya', label: 'Ya' }, { value: 'Tidak', label: 'Tidak' }]"
          />
          <TextInput v-model="biodataForm.noKps" label="No KPS" />
        </div>

        <div class="pt-2 border-t border-outline-variant">
          <p class="font-medium text-label-md text-on-surface mb-4">Data Ayah</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="biodataForm.nikAyah" label="NIK Ayah" />
            <TextInput v-model="biodataForm.namaAyah" label="Nama Ayah" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <DateInput v-model="biodataForm.tanggalLahirAyah" label="Tgl Lahir Ayah" />
            <TextInput v-model="biodataForm.pendidikanAyah" label="Pendidikan Ayah" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextInput v-model="biodataForm.pekerjaanAyah" label="Pekerjaan Ayah" />
            <TextInput v-model="biodataForm.penghasilanAyah" label="Penghasilan Ayah" />
          </div>
        </div>

        <div class="pt-2 border-t border-outline-variant">
          <p class="font-medium text-label-md text-on-surface mb-4">Data Ibu</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="biodataForm.nikIbu" label="NIK Ibu" />
            <TextInput v-model="biodataForm.namaIbu" label="Nama Ibu" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <DateInput v-model="biodataForm.tanggalLahirIbu" label="Tanggal Lahir Ibu" />
            <TextInput v-model="biodataForm.pendidikanIbu" label="Pendidikan Ibu" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextInput v-model="biodataForm.pekerjaanIbu" label="Pekerjaan Ibu" />
            <TextInput v-model="biodataForm.penghasilanIbu" label="Penghasilan Ibu" />
          </div>
        </div>

        <div class="pt-2 border-t border-outline-variant">
          <p class="font-medium text-label-md text-on-surface mb-4">Data Wali</p>
          <TextInput v-model="biodataForm.namaWali" label="Nama Wali" />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <DateInput v-model="biodataForm.tanggalLahirWali" label="Tanggal Lahir Wali" />
            <TextInput v-model="biodataForm.pendidikanWali" label="Pendidikan Wali" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextInput v-model="biodataForm.pekerjaanWali" label="Pekerjaan Wali" />
            <TextInput v-model="biodataForm.penghasilanWali" label="Penghasilan Wali" />
          </div>
        </div>

        <div class="pt-2 border-t border-outline-variant">
          <p class="font-medium text-label-md text-on-surface mb-4">Data Pembiayaan &amp; Transfer</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="biodataForm.jenisPembiayaan" label="Jenis Pembiayaan" />
            <TextInput v-model="biodataForm.biayaMasuk" label="Biaya Masuk" type="number" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <TextInput v-model="biodataForm.sksDiakui" label="SKS Diakui" type="number" />
            <TextInput v-model="biodataForm.perguruanTinggiAsal" label="Perguruan Tinggi Asal" />
          </div>
          <TextInput v-model="biodataForm.programStudiAsal" label="Program Studi Asal" class="mt-4" />
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeBiodata">Batal</AppButton>
        <AppButton :disabled="biodataLoading || biodataSubmitting" @click="handleSaveBiodata">
          {{ biodataSubmitting ? 'Menyimpan...' : 'Simpan Biodata' }}
        </AppButton>
      </template>
    </Modal>
  </div>
</template>

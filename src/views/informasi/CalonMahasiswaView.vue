<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import StepProgress, { type ProgressStep } from '@/components/ui/StepProgress.vue';
import { calonMahasiswaApi } from '@/api/calonMahasiswa';
import { gelombangApi } from '@/api/gelombang';
import { pesertaApi } from '@/api/peserta';
import { golonganKelasApi } from '@/api/golonganKelas';
import { jurusanApi } from '@/api/jurusan';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatDateTime } from '@/utils/format';
import { toastSuccess, toastError } from '@/utils/swal';
import type { CalonMahasiswa, CalonMahasiswaStats, GolonganKelas, Jurusan, Peserta } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.CALON_MAHASISWA_MANAGEMENT);

const gelombangFilter = ref<number | ''>('');
const gelombangOptions = ref<{ value: number; label: string }[]>([]);

const pesertaList = ref<Peserta[]>([]);
const pesertaOptions = ref<{ value: number; label: string }[]>([]);
const pesertaById = (id: number | '') => pesertaList.value.find((p) => p.id === id) ?? null;

const golonganKelasList = ref<GolonganKelas[]>([]);
const jurusanList = ref<Jurusan[]>([]);

const loadPesertaOptions = async () => {
  const pesertaResult = await pesertaApi.list({ limit: 200 });
  pesertaList.value = pesertaResult.data;
  pesertaOptions.value = pesertaResult.data.map((p) => ({ value: p.id, label: `${p.namaLengkap} — ${p.email}` }));
};

onMounted(async () => {
  const [gelombangResult, golonganResult, jurusanResult] = await Promise.all([
    gelombangApi.list({ limit: 100 }),
    golonganKelasApi.list({ limit: 100 }),
    jurusanApi.list({ limit: 100 }),
    loadPesertaOptions(),
  ]);
  gelombangOptions.value = gelombangResult.data.map((g) => ({ value: g.id, label: g.namaGelombang }));
  golonganKelasList.value = golonganResult.data;
  jurusanList.value = jurusanResult.data;
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
} = useCrudPage({
  fetchList: calonMahasiswaApi.list,
  remove: calonMahasiswaApi.remove,
  extraQuery: () => ({ gelombangId: gelombangFilter.value || undefined }),
});

fetchItems();

const onFilterChange = () => {
  page.value = 1;
  fetchItems();
  loadStats();
};

const stats = ref<CalonMahasiswaStats>({
  totalPendaftar: 0,
  diterimaKuliah: 0,
  ditolak: 0,
  jalurBeasiswa: 0,
  beasiswaDiterima: 0,
});
const loadStats = async () => {
  try {
    stats.value = await calonMahasiswaApi.stats(gelombangFilter.value);
  } catch {
    // stat cards stay at zero if this fails; the table below still loads independently
  }
};
onMounted(loadStats);

const columns: DataTableColumn[] = [
  { key: 'nama', label: 'Nama', sortable: true },
  { key: 'asalSekolah', label: 'Asal Sekolah', sortable: true },
  { key: 'prodi', label: 'Prodi', sortable: true },
  { key: 'gelombang', label: 'Gelombang', sortable: true },
  { key: 'skemaPembiayaan', label: 'Skema Pembiayaan', align: 'center', sortable: true },
  { key: 'formulirPendaftaran', label: 'Formulir Pendaftaran', align: 'center', sortable: true },
  { key: 'lulusTesMasuk', label: 'Lulus Tes Masuk', align: 'center', sortable: true },
  { key: 'akunBeasiswa', label: 'Akun Beasiswa', align: 'center', sortable: true },
  { key: 'kelengkapanPersyaratan', label: 'Kelengkapan Persyaratan', align: 'center', sortable: true },
  { key: 'statusBeasiswa', label: 'Status Beasiswa', align: 'center', sortable: true },
  { key: 'statusKuliah', label: 'Status Kuliah', align: 'center', sortable: true },
];

const skemaOptions = [
  { value: 'beasiswa', label: 'Beasiswa' },
  { value: 'mandiri', label: 'Mandiri' },
];
const akunBeasiswaOptions = [
  { value: 'na', label: 'Tidak Berlaku (N/A)' },
  { value: 'ya', label: 'Ya' },
  { value: 'tidak', label: 'Tidak' },
];
const statusBeasiswaOptions = [
  { value: '', label: 'Belum diproses' },
  { value: 'diusulkan', label: 'Diusulkan' },
  { value: 'disetujui', label: 'Disetujui' },
  { value: 'ditolak', label: 'Ditolak' },
];
const statusKuliahOptions = [
  { value: 'menunggu', label: 'Menunggu' },
  { value: 'diterima', label: 'Diterima' },
  { value: 'ditolak', label: 'Ditolak' },
];

const form = reactive({
  nama: '',
  asalSekolah: '',
  prodi: '',
  gelombangId: '' as number | '',
  pesertaId: '' as number | '',
  noTelepon: '',
  skemaPembiayaan: 'mandiri' as 'beasiswa' | 'mandiri',
  formulirPendaftaran: false,
  lulusTesMasuk: false,
  akunBeasiswa: 'na' as 'na' | 'ya' | 'tidak',
  kelengkapanPersyaratan: false,
  statusBeasiswa: '' as '' | 'diusulkan' | 'disetujui' | 'ditolak',
  statusKuliah: 'menunggu' as 'menunggu' | 'diterima' | 'ditolak',
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
    form.nama = editing?.nama ?? '';
    form.asalSekolah = editing?.asalSekolah ?? '';
    form.prodi = editing?.prodi ?? '';
    form.gelombangId = editing?.gelombangId ?? '';
    form.pesertaId = editing?.pesertaId ?? '';
    form.noTelepon = editing?.noTelepon ?? '';
    form.skemaPembiayaan = editing?.skemaPembiayaan ?? 'mandiri';
    form.formulirPendaftaran = editing?.formulirPendaftaran ?? false;
    form.lulusTesMasuk = editing?.lulusTesMasuk ?? false;
    form.akunBeasiswa = editing?.akunBeasiswa === true ? 'ya' : editing?.akunBeasiswa === false ? 'tidak' : 'na';
    form.kelengkapanPersyaratan = editing?.kelengkapanPersyaratan ?? false;
    form.statusBeasiswa = editing?.statusBeasiswa ?? '';
    form.statusKuliah = editing?.statusKuliah ?? 'menunggu';
  },
  { immediate: true }
);

const linkedPeserta = computed(() => pesertaById(form.pesertaId));
const linkedLulusTesMasuk = computed(() => linkedPeserta.value?.statusUjian === 'lulus');
const linkedStatusKuliah = computed(() => linkedPeserta.value?.statusKelulusan ?? 'menunggu');

const validate = (): boolean => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.nama.trim()) errors.nama = 'Nama wajib diisi';
  if (!form.asalSekolah.trim()) errors.asalSekolah = 'Asal sekolah wajib diisi';
  if (!form.prodi.trim()) errors.prodi = 'Prodi wajib diisi';
  return Object.keys(errors).length === 0;
};

const handleSubmit = async () => {
  if (!validate()) return;
  submitting.value = true;
  formError.value = null;
  try {
    const payload = {
      nama: form.nama.trim(),
      asalSekolah: form.asalSekolah.trim(),
      prodi: form.prodi.trim(),
      gelombangId: form.gelombangId || null,
      pesertaId: form.pesertaId || null,
      noTelepon: form.noTelepon.trim() || null,
      skemaPembiayaan: form.skemaPembiayaan,
      formulirPendaftaran: form.formulirPendaftaran,
      lulusTesMasuk: form.lulusTesMasuk,
      akunBeasiswa: form.akunBeasiswa === 'na' ? null : form.akunBeasiswa === 'ya',
      kelengkapanPersyaratan: form.kelengkapanPersyaratan,
      statusBeasiswa: form.statusBeasiswa || null,
      statusKuliah: form.statusKuliah,
    };
    if (editingItem.value) {
      await calonMahasiswaApi.update(editingItem.value.id, payload);
    } else {
      await calonMahasiswaApi.create(payload);
    }
    onSaved();
    loadStats();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data calon mahasiswa');
  } finally {
    submitting.value = false;
  }
};

const handleDeleteConfirmed = async () => {
  await confirmDelete();
  loadStats();
};

const statusKuliahLabel = (item: CalonMahasiswa) =>
  ({ menunggu: 'Menunggu', diterima: 'Diterima', ditolak: 'Ditolak' })[item.statusKuliah];
const statusKuliahVariant = (item: CalonMahasiswa) =>
  ({ menunggu: 'warning', diterima: 'success', ditolak: 'danger' })[item.statusKuliah] as
    | 'warning'
    | 'success'
    | 'danger';

const progressSteps = (item: CalonMahasiswa): ProgressStep[] => {
  const base = [
    { key: 'formulir', label: 'Formulir Pendaftaran', done: item.formulirPendaftaran },
    { key: 'tes', label: 'Lulus Tes Masuk', done: item.lulusTesMasuk },
    { key: 'kelengkapan', label: 'Kelengkapan Persyaratan', done: item.kelengkapanPersyaratan },
  ];
  const firstPendingIndex = base.findIndex((s) => !s.done);
  const steps: ProgressStep[] = base.map((s, idx) => ({
    key: s.key,
    label: s.label,
    state: s.done ? 'done' : idx === firstPendingIndex ? 'active' : 'pending',
    icon: s.done ? 'check' : 'more_horiz',
  }));

  const finalState = item.statusKuliah === 'diterima' ? 'success' : item.statusKuliah === 'ditolak' ? 'danger' : 'active';
  steps.push({
    key: 'hasil',
    label: item.statusKuliah === 'diterima' ? 'Diterima' : item.statusKuliah === 'ditolak' ? 'Ditolak' : 'Menunggu Hasil',
    state: finalState,
    icon: item.statusKuliah === 'diterima' ? 'check' : item.statusKuliah === 'ditolak' ? 'close' : 'hourglass_empty',
  });
  return steps;
};

const progressSummary = (item: CalonMahasiswa) =>
  item.statusKuliah === 'diterima'
    ? { label: 'Lulus', variant: 'success' as const }
    : item.statusKuliah === 'ditolak'
      ? { label: 'Ditolak', variant: 'danger' as const }
      : { label: 'Sedang Proses', variant: 'warning' as const };

const statusBeasiswaLabel = (item: CalonMahasiswa) =>
  item.statusBeasiswa
    ? ({ diusulkan: 'Diusulkan', disetujui: 'Disetujui', ditolak: 'Ditolak' })[item.statusBeasiswa]
    : '-';
const statusBeasiswaVariant = (item: CalonMahasiswa) =>
  (item.statusBeasiswa
    ? ({ diusulkan: 'warning', disetujui: 'success', ditolak: 'danger' })[item.statusBeasiswa]
    : 'neutral') as 'warning' | 'success' | 'danger' | 'neutral';

const viewTarget = ref<CalonMahasiswa | null>(null);
const openDetail = (item: CalonMahasiswa) => {
  viewTarget.value = item;
};
const closeDetail = () => {
  viewTarget.value = null;
};

const akunBeasiswaLabel = (item: CalonMahasiswa) =>
  item.akunBeasiswa === null ? 'Tidak Berlaku (N/A)' : item.akunBeasiswa ? 'Ya' : 'Tidak';

const shareCandidate = (item: CalonMahasiswa) => {
  const statusText =
    item.statusKuliah === 'diterima'
      ? 'Selamat! Anda dinyatakan DITERIMA sebagai mahasiswa baru.'
      : item.statusKuliah === 'ditolak'
        ? 'Mohon maaf, pendaftaran Anda belum dapat kami terima kali ini.'
        : 'Pendaftaran Anda masih dalam proses peninjauan.';
  const message = `Halo ${item.nama}, berikut update status pendaftaran PMB Anda di program studi ${item.prodi}:\n\n${statusText}`;
  const phone = item.noTelepon?.replace(/[^0-9]/g, '');
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
};

// ---- Buat akun Peserta dari data Calon Mahasiswa (menutup gap: calon yang belum punya akun PMB) ----
const isCreatePesertaOpen = ref(false);
const createPesertaTarget = ref<CalonMahasiswa | null>(null);
const createPesertaForm = reactive({
  namaLengkap: '',
  asalSekolah: '',
  email: '',
  noTelepon: '',
  golonganKelasId: '' as number | '',
  jurusanId: '' as number | '',
});
const createPesertaError = ref<string | null>(null);
const createPesertaErrors = reactive<Record<string, string>>({});
const createPesertaSubmitting = ref(false);

const golonganKelasOptions = computed(() =>
  golonganKelasList.value.map((g) => ({ value: g.id, label: g.namaKelas }))
);
const jurusanOptionsForGolongan = computed(() =>
  jurusanList.value
    .filter((j) => j.golonganKelasId === createPesertaForm.golonganKelasId)
    .map((j) => ({ value: j.id, label: j.namaJurusan }))
);

watch(
  () => createPesertaForm.golonganKelasId,
  (val, oldVal) => {
    if (val !== oldVal && !jurusanOptionsForGolongan.value.some((o) => o.value === createPesertaForm.jurusanId)) {
      createPesertaForm.jurusanId = '';
    }
  }
);

const openCreatePeserta = (item: CalonMahasiswa) => {
  createPesertaTarget.value = item;
  isCreatePesertaOpen.value = true;
  createPesertaError.value = null;
  Object.keys(createPesertaErrors).forEach((k) => delete createPesertaErrors[k]);

  createPesertaForm.namaLengkap = item.nama;
  createPesertaForm.asalSekolah = item.asalSekolah;
  createPesertaForm.email = '';
  createPesertaForm.noTelepon = item.noTelepon ?? '';

  // Coba tebak Jurusan dari teks bebas "prodi" supaya admin tinggal konfirmasi, bukan mengetik ulang.
  const prodiLower = item.prodi.trim().toLowerCase();
  const matchedJurusan = jurusanList.value.find(
    (j) => prodiLower.includes(j.namaJurusan.toLowerCase()) || j.namaJurusan.toLowerCase().includes(prodiLower)
  );
  createPesertaForm.golonganKelasId = matchedJurusan?.golonganKelasId ?? '';
  createPesertaForm.jurusanId = matchedJurusan?.id ?? '';
};

const closeCreatePeserta = () => {
  isCreatePesertaOpen.value = false;
  createPesertaTarget.value = null;
};

const handleCreatePeserta = async () => {
  Object.keys(createPesertaErrors).forEach((k) => delete createPesertaErrors[k]);
  if (!createPesertaForm.namaLengkap.trim()) createPesertaErrors.namaLengkap = 'Nama wajib diisi';
  if (!createPesertaForm.asalSekolah.trim()) createPesertaErrors.asalSekolah = 'Asal sekolah wajib diisi';
  if (!createPesertaForm.email.trim()) createPesertaErrors.email = 'Email wajib diisi';
  if (!createPesertaForm.noTelepon.trim()) createPesertaErrors.noTelepon = 'No telepon wajib diisi';
  if (!createPesertaForm.golonganKelasId) createPesertaErrors.golonganKelasId = 'Golongan kelas wajib dipilih';
  if (!createPesertaForm.jurusanId) createPesertaErrors.jurusanId = 'Jurusan wajib dipilih';
  if (Object.keys(createPesertaErrors).length > 0) return;
  if (!createPesertaTarget.value) return;

  createPesertaSubmitting.value = true;
  createPesertaError.value = null;
  try {
    const peserta = await pesertaApi.create({
      namaLengkap: createPesertaForm.namaLengkap.trim(),
      asalSekolah: createPesertaForm.asalSekolah.trim(),
      email: createPesertaForm.email.trim(),
      noTelepon: createPesertaForm.noTelepon.trim(),
      golonganKelasId: Number(createPesertaForm.golonganKelasId),
      jurusanId: Number(createPesertaForm.jurusanId),
    });

    // Akun baru defaultnya belum_ujian/menunggu; samakan dengan status yang sudah tercatat
    // manual di Calon Mahasiswa supaya konsisten begitu ditautkan.
    await pesertaApi.update(peserta.id, {
      statusUjian: createPesertaTarget.value.lulusTesMasuk ? 'lulus' : 'belum_ujian',
      statusKelulusan: createPesertaTarget.value.statusKuliah,
    });

    await calonMahasiswaApi.update(createPesertaTarget.value.id, { pesertaId: peserta.id });

    toastSuccess('Akun peserta berhasil dibuat & ditautkan ke data calon mahasiswa ini');
    closeCreatePeserta();
    await Promise.all([loadPesertaOptions(), fetchItems()]);
  } catch (err) {
    const message = extractErrorMessage(err, 'Gagal membuat akun peserta');
    createPesertaError.value = message;
    toastError(message);
  } finally {
    createPesertaSubmitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader
      title="Data Calon Mahasiswa Baru"
      subtitle="Daftar calon mahasiswa beserta status kelengkapan persyaratan dan hasil penerimaan — PMB Politeknik Bhakti Kartini."
    >
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Data</AppButton>
      </template>
    </PageHeader>

    <section class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div class="bg-surface-container-lowest border-t-4 border border-outline-variant rounded-lg p-4 text-center" style="border-top-color: var(--color-primary)">
        <p class="font-bold text-headline-lg text-on-surface">{{ stats.totalPendaftar }}</p>
        <p class="text-label-sm text-on-surface-variant mt-1">Total Pendaftar</p>
      </div>
      <div class="bg-surface-container-lowest border-t-4 border border-outline-variant rounded-lg p-4 text-center" style="border-top-color: var(--color-success)">
        <p class="font-bold text-headline-lg text-on-surface">{{ stats.diterimaKuliah }}</p>
        <p class="text-label-sm text-on-surface-variant mt-1">Diterima Kuliah</p>
      </div>
      <div class="bg-surface-container-lowest border-t-4 border border-outline-variant rounded-lg p-4 text-center" style="border-top-color: var(--color-error)">
        <p class="font-bold text-headline-lg text-on-surface">{{ stats.ditolak }}</p>
        <p class="text-label-sm text-on-surface-variant mt-1">Ditolak</p>
      </div>
      <div class="bg-surface-container-lowest border-t-4 border border-outline-variant rounded-lg p-4 text-center" style="border-top-color: var(--color-primary)">
        <p class="font-bold text-headline-lg text-on-surface">{{ stats.jalurBeasiswa }}</p>
        <p class="text-label-sm text-on-surface-variant mt-1">Jalur Beasiswa</p>
      </div>
      <div class="bg-surface-container-lowest border-t-4 border border-outline-variant rounded-lg p-4 text-center" style="border-top-color: var(--color-warning)">
        <p class="font-bold text-headline-lg text-on-surface">{{ stats.beasiswaDiterima }}</p>
        <p class="text-label-sm text-on-surface-variant mt-1">Beasiswa Diterima</p>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright flex flex-col gap-3">
        <div class="flex flex-col md:flex-row gap-3">
          <div class="flex-1">
            <SearchInput v-model="search" placeholder="Cari nama siswa atau asal sekolah..." />
          </div>
          <div class="w-full md:w-64">
            <SelectInput
              v-model="gelombangFilter"
              placeholder="Semua Gelombang"
              :options="gelombangOptions"
              @change="onFilterChange"
            />
          </div>
        </div>
        <p class="text-label-sm text-on-surface-variant">Menampilkan {{ items.length }} dari {{ meta.total }} data</p>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada data calon mahasiswa"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-gelombang="{ item }">{{ item.gelombang?.namaGelombang ?? '-' }}</template>
        <template #cell-skemaPembiayaan="{ item }">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-label-sm"
            :class="item.skemaPembiayaan === 'beasiswa' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'"
          >
            {{ item.skemaPembiayaan === 'beasiswa' ? 'Beasiswa' : 'Mandiri' }}
          </span>
        </template>
        <template #cell-formulirPendaftaran="{ item }">
          <span class="material-symbols-outlined" :class="item.formulirPendaftaran ? 'text-success' : 'text-error'">
            {{ item.formulirPendaftaran ? 'check_circle' : 'cancel' }}
          </span>
        </template>
        <template #cell-lulusTesMasuk="{ item }">
          <span class="material-symbols-outlined" :class="item.lulusTesMasuk ? 'text-success' : 'text-error'">
            {{ item.lulusTesMasuk ? 'check_circle' : 'cancel' }}
          </span>
        </template>
        <template #cell-akunBeasiswa="{ item }">
          <span v-if="item.akunBeasiswa === null" class="text-on-surface-variant text-label-sm">N/A</span>
          <span v-else class="material-symbols-outlined" :class="item.akunBeasiswa ? 'text-success' : 'text-error'">
            {{ item.akunBeasiswa ? 'check_circle' : 'cancel' }}
          </span>
        </template>
        <template #cell-kelengkapanPersyaratan="{ item }">
          <span class="material-symbols-outlined" :class="item.kelengkapanPersyaratan ? 'text-success' : 'text-error'">
            {{ item.kelengkapanPersyaratan ? 'check_circle' : 'cancel' }}
          </span>
        </template>
        <template #cell-statusBeasiswa="{ item }">
          <span v-if="!item.statusBeasiswa" class="text-on-surface-variant">-</span>
          <span
            v-else
            class="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-label-sm"
            :class="{
              'bg-warning-container text-on-warning-container': statusBeasiswaVariant(item) === 'warning',
              'bg-success-container text-on-success-container': statusBeasiswaVariant(item) === 'success',
              'bg-danger-container text-on-danger-container': statusBeasiswaVariant(item) === 'danger',
            }"
          >
            {{ statusBeasiswaLabel(item) }}
          </span>
        </template>
        <template #cell-statusKuliah="{ item }">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-label-sm"
            :class="{
              'bg-warning-container text-on-warning-container': statusKuliahVariant(item) === 'warning',
              'bg-success-container text-on-success-container': statusKuliahVariant(item) === 'success',
              'bg-danger-container text-on-danger-container': statusKuliahVariant(item) === 'danger',
            }"
          >
            {{ statusKuliahLabel(item) }}
          </span>
        </template>
        <template #actions="{ item }">
          <button
            type="button"
            class="text-on-surface-variant hover:text-primary transition-colors"
            title="Lihat Detail"
            @click="openDetail(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">visibility</span>
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-on-primary text-label-sm font-medium hover:opacity-90 transition-opacity"
            title="Bagikan status via WhatsApp"
            @click="shareCandidate(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 16px">share</span>
            Share
          </button>
          <button
            v-if="canCreate && !item.pesertaId"
            type="button"
            class="text-on-surface-variant hover:text-primary transition-colors"
            title="Buat Akun Peserta PMB dari data ini"
            @click="openCreatePeserta(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">person_add</span>
          </button>
          <button
            v-if="canUpdate"
            type="button"
            class="text-on-surface-variant hover:text-primary transition-colors"
            title="Ubah"
            @click="openEdit(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">edit</span>
          </button>
          <button
            v-if="canDelete"
            type="button"
            class="text-on-surface-variant hover:text-error transition-colors"
            title="Hapus"
            @click="requestDelete(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">delete</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="isFormOpen"
      :title="editingItem ? 'Ubah Calon Mahasiswa' : 'Tambah Calon Mahasiswa'"
      size="lg"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.nama" label="Nama" required :error="errors.nama" />
          <TextInput v-model="form.asalSekolah" label="Asal Sekolah" required :error="errors.asalSekolah" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.prodi" label="Prodi" required :error="errors.prodi" placeholder="D4 - Rekayasa Keamanan Siber" />
          <TextInput v-model="form.noTelepon" label="No Telepon" hint="Dipakai untuk tombol Share via WhatsApp" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput v-model="form.gelombangId" label="Gelombang" placeholder="Belum dipilih" :options="gelombangOptions" />
          <SelectInput v-model="form.skemaPembiayaan" label="Skema Pembiayaan" :options="skemaOptions" />
        </div>

        <div>
          <SelectInput
            v-model="form.pesertaId"
            label="Tautkan ke Akun Peserta PMB"
            placeholder="Tidak ditautkan (isi status manual)"
            :options="pesertaOptions"
          />
          <p class="mt-1 text-label-sm text-on-surface-variant">
            Jika ditautkan, status Lulus Tes Masuk &amp; Status Kuliah otomatis mengikuti data Peserta yang sebenarnya dan tidak bisa diisi manual.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 py-2 border-y border-outline-variant">
          <CheckboxToggle v-model="form.formulirPendaftaran" label="Formulir Pendaftaran" />
          <div v-if="form.pesertaId">
            <span class="block font-medium text-label-md text-on-surface mb-2">Lulus Tes Masuk</span>
            <StatusBadge
              :label="linkedLulusTesMasuk ? 'Lulus (mengikuti Peserta)' : 'Belum Lulus (mengikuti Peserta)'"
              :variant="linkedLulusTesMasuk ? 'success' : 'neutral'"
            />
          </div>
          <CheckboxToggle v-else v-model="form.lulusTesMasuk" label="Lulus Tes Masuk" />
          <CheckboxToggle v-model="form.kelengkapanPersyaratan" label="Kelengkapan Persyaratan" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectInput v-model="form.akunBeasiswa" label="Akun Beasiswa" :options="akunBeasiswaOptions" />
          <SelectInput v-model="form.statusBeasiswa" label="Status Beasiswa" :options="statusBeasiswaOptions" />
          <div v-if="form.pesertaId">
            <span class="block font-medium text-label-md text-on-surface mb-2">Status Kuliah</span>
            <StatusBadge
              :label="statusKuliahOptions.find((o) => o.value === linkedStatusKuliah)?.label ?? linkedStatusKuliah"
              :variant="linkedStatusKuliah === 'diterima' ? 'success' : linkedStatusKuliah === 'ditolak' ? 'danger' : 'warning'"
            />
          </div>
          <SelectInput v-else v-model="form.statusKuliah" label="Status Kuliah" :options="statusKuliahOptions" />
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <Modal
      :model-value="!!viewTarget"
      title="Detail Calon Mahasiswa"
      subtitle="Data pendaftaran yang tercatat untuk calon mahasiswa ini."
      size="lg"
      @update:model-value="closeDetail"
    >
      <div v-if="viewTarget" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Nama</p>
            <p class="text-body-md text-on-surface font-medium">{{ viewTarget.nama }}</p>
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Asal Sekolah</p>
            <p class="text-body-md text-on-surface font-medium">{{ viewTarget.asalSekolah }}</p>
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Program Studi</p>
            <p class="text-body-md text-on-surface font-medium">{{ viewTarget.prodi }}</p>
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Gelombang</p>
            <p class="text-body-md text-on-surface font-medium">{{ viewTarget.gelombang?.namaGelombang ?? '-' }}</p>
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">No Telepon</p>
            <p class="text-body-md text-on-surface font-medium">{{ viewTarget.noTelepon || '-' }}</p>
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Skema Pembiayaan</p>
            <StatusBadge :label="viewTarget.skemaPembiayaan === 'beasiswa' ? 'Beasiswa' : 'Mandiri'" />
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Akun Beasiswa</p>
            <p class="text-body-md text-on-surface font-medium">{{ akunBeasiswaLabel(viewTarget) }}</p>
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Tertaut ke Peserta PMB</p>
            <p v-if="viewTarget.peserta" class="text-body-md text-on-surface font-medium">
              {{ viewTarget.peserta.namaLengkap }} — {{ viewTarget.peserta.email }}
            </p>
            <p v-else class="text-body-md text-on-surface-variant">Belum ditautkan (status diisi manual)</p>
          </div>
        </div>

        <div class="border-t border-outline-variant pt-5">
          <div class="flex items-center justify-between mb-5">
            <p class="text-label-sm text-on-surface-variant">Progress Seleksi</p>
            <StatusBadge :label="progressSummary(viewTarget).label" :variant="progressSummary(viewTarget).variant" />
          </div>
          <StepProgress :steps="progressSteps(viewTarget)" />
        </div>

        <div class="border-t border-outline-variant pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Status Beasiswa</p>
            <StatusBadge :label="statusBeasiswaLabel(viewTarget)" :variant="statusBeasiswaVariant(viewTarget)" />
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Status Kuliah</p>
            <StatusBadge :label="statusKuliahLabel(viewTarget)" :variant="statusKuliahVariant(viewTarget)" />
          </div>
        </div>

        <div class="border-t border-outline-variant pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Tanggal Dibuat</p>
            <p class="text-body-sm text-on-surface-variant">{{ formatDateTime(viewTarget.createdAt) }}</p>
          </div>
          <div>
            <p class="text-label-sm text-on-surface-variant mb-1">Terakhir Diubah</p>
            <p class="text-body-sm text-on-surface-variant">{{ formatDateTime(viewTarget.updatedAt) }}</p>
          </div>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeDetail">Tutup</AppButton>
        <AppButton
          v-if="canUpdate"
          @click="
            () => {
              if (viewTarget) openEdit(viewTarget);
              closeDetail();
            }
          "
        >
          Ubah Data
        </AppButton>
      </template>
    </Modal>

    <Modal
      :model-value="isCreatePesertaOpen"
      title="Buat Akun Peserta PMB"
      :subtitle="createPesertaTarget ? `Dari data calon mahasiswa: ${createPesertaTarget.nama}` : undefined"
      size="lg"
      @update:model-value="closeCreatePeserta"
    >
      <form class="space-y-4" @submit.prevent="handleCreatePeserta">
        <div v-if="createPesertaError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ createPesertaError }}
        </div>
        <p class="text-body-sm text-on-surface-variant">
          Data ini belum punya akun pendaftaran (Peserta) sungguhan, sehingga tidak bisa muncul di daftar "Generate NIM
          Mahasiswa" di BAAK. Lengkapi form ini untuk membuat akunnya — password akan digenerate otomatis dan dikirim ke
          email di bawah.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="createPesertaForm.namaLengkap" label="Nama Lengkap" required :error="createPesertaErrors.namaLengkap" />
          <TextInput v-model="createPesertaForm.asalSekolah" label="Asal Sekolah" required :error="createPesertaErrors.asalSekolah" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="createPesertaForm.email" label="Email" type="email" required :error="createPesertaErrors.email" />
          <TextInput v-model="createPesertaForm.noTelepon" label="No Telepon" required :error="createPesertaErrors.noTelepon" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            v-model="createPesertaForm.golonganKelasId"
            label="Golongan Kelas"
            required
            placeholder="Pilih golongan kelas..."
            :options="golonganKelasOptions"
            :error="createPesertaErrors.golonganKelasId"
          />
          <SelectInput
            v-model="createPesertaForm.jurusanId"
            label="Jurusan"
            required
            placeholder="Pilih jurusan..."
            :options="jurusanOptionsForGolongan"
            :disabled="!createPesertaForm.golonganKelasId"
            :error="createPesertaErrors.jurusanId"
          />
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeCreatePeserta">Batal</AppButton>
        <AppButton :disabled="createPesertaSubmitting" @click="handleCreatePeserta">
          {{ createPesertaSubmitting ? 'Membuat akun...' : 'Buat & Tautkan' }}
        </AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Data Calon Mahasiswa"
      :message="`Yakin ingin menghapus data ${deleteTarget?.nama ?? ''}?`"
      :loading="deleting"
      @confirm="handleDeleteConfirmed"
      @cancel="cancelDelete"
    />
  </div>
</template>

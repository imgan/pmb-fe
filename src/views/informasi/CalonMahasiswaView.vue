<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import StepProgress, { type ProgressStep } from '@/components/ui/StepProgress.vue';
import PesertaBiodataPanel from '@/components/peserta/PesertaBiodataPanel.vue';
import PesertaBiodataFields from '@/components/peserta/PesertaBiodataFields.vue';
import PendidikanModal from '@/components/peserta/PendidikanModal.vue';
import SumberInformasiModal from '@/components/peserta/SumberInformasiModal.vue';
import DataPmbModal from '@/components/peserta/DataPmbModal.vue';
import DokumenPesertaModal from '@/components/peserta/DokumenPesertaModal.vue';
import { biodataBelumDiisi, biodataKosong, biodataPayload, isiBiodataForm, validasiBiodata } from '@/components/peserta/biodataForm';
import { calonMahasiswaApi } from '@/api/calonMahasiswa';
import { tahunPmbApi } from '@/api/tahunModul';
import { gelombangApi } from '@/api/gelombang';
import { pesertaApi } from '@/api/peserta';
import { golonganKelasApi } from '@/api/golonganKelas';
import { jurusanApi } from '@/api/jurusan';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatDate, formatDateTime } from '@/utils/format';
import { toastSuccess, toastError, confirmAction } from '@/utils/swal';
import type { CalonMahasiswa, CalonMahasiswaStats, Gelombang, GolonganKelas, Jurusan, Peserta } from '@/types/entities';

const { canCreate, canUpdate, canDelete } = usePermission(MENU.CALON_MAHASISWA_MANAGEMENT);

const gelombangFilter = ref<number | ''>('');
const tahunFilter = ref<number | ''>('');
const golonganFilter = ref<number | ''>('');
const prodiFilter = ref('');
const tahunOptions = ref<{ value: number; label: string }[]>([]);
const gelombangOptions = ref<{ value: number; label: string }[]>([]);
const gelombangList = ref<Gelombang[]>([]);
/** Gelombang aktif: AKTIF manual, atau OTOMATIS & hari ini di dalam rentang tanggalnya. */
const gelombangAktif = (g: Gelombang) => {
  if (g.status === 'AKTIF') return true;
  if (g.status === 'TIDAK_AKTIF') return false;
  const hariIni = new Date().toLocaleDateString('sv-SE');
  return String(g.startDate).slice(0, 10) <= hariIni && hariIni <= String(g.endDate).slice(0, 10);
};
// Filter tabel: golongan kelas & jurusan (nama prodi unik; dipersempit ke golongan yang dipilih).
const golonganFilterOptions = computed(() => golonganKelasList.value.map((g) => ({ value: g.id, label: g.namaKelas })));
const prodiFilterOptions = computed(() =>
  [...new Set(jurusanList.value.filter((j) => !golonganFilter.value || j.golonganKelasId === golonganFilter.value).map((j) => j.namaJurusan).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .map((n) => ({ value: n, label: n }))
);
const onGolonganFilterChange = () => {
  if (prodiFilter.value && !prodiFilterOptions.value.some((o) => o.value === prodiFilter.value)) prodiFilter.value = '';
  onFilterChange();
};
// Pilihan gelombang di form: hanya yang aktif + periodenya; gelombang tersimpan tetap tampil saat ubah.
const gelombangFormOptions = computed(() =>
  gelombangList.value
    .filter((g) => gelombangAktif(g) || g.id === form.gelombangId)
    .map((g) => ({ value: g.id, label: `${g.namaGelombang} - ${formatDate(g.startDate)} s.d. ${formatDate(g.endDate)}` }))
);

const pesertaList = ref<Peserta[]>([]);
const pesertaById = (id: number | '') => pesertaList.value.find((p) => p.id === id) ?? null;

const golonganKelasList = ref<GolonganKelas[]>([]);
const jurusanList = ref<Jurusan[]>([]);
// Pilihan Prodi (combo box) dari master Jurusan — nama prodi unik (tabel jurusan punya varian per golongan kelas).
// Nilai yang tersimpan tetap teks nama prodi; teks lama yang tidak ada di master tetap ditampilkan saat ubah.
const prodiOptions = computed(() => {
  const nama = [...new Set(jurusanList.value.map((j) => j.namaJurusan).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  if (form.prodi && !nama.includes(form.prodi)) nama.unshift(form.prodi);
  return nama.map((n) => ({ value: n, label: n }));
});

const loadPesertaOptions = async () => {
  const pesertaResult = await pesertaApi.list({ limit: 200 });
  pesertaList.value = pesertaResult.data;
};

onMounted(async () => {
  const [gelombangResult, golonganResult, jurusanResult] = await Promise.all([
    gelombangApi.list({ limit: 100 }),
    golonganKelasApi.list({ limit: 100 }),
    jurusanApi.list({ limit: 100 }),
    loadPesertaOptions(),
  ]);
  gelombangList.value = gelombangResult.data;
  gelombangOptions.value = gelombangResult.data.map((g) => ({ value: g.id, label: g.namaGelombang }));
  // Filter Tahun Ajaran PMB (tahun gelombang pendaftar; Modul Admin › Tahun (PMB)).
  tahunPmbApi
    .list({ limit: 100 })
    .then((r) => (tahunOptions.value = r.data.map((t) => ({ value: t.id, label: `Tahun PMB ${t.nama} ${t.jenisSemester}${t.isActive ? ' (aktif)' : ''}` }))))
    .catch(() => (tahunOptions.value = []));
  golonganKelasList.value = golonganResult.data;
  jurusanList.value = jurusanResult.data;
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
  fetchList: calonMahasiswaApi.list,
  remove: calonMahasiswaApi.remove,
  extraQuery: () => ({
    gelombangId: gelombangFilter.value || undefined,
    tahunPmbId: tahunFilter.value || undefined,
    golonganKelasId: golonganFilter.value || undefined,
    prodi: prodiFilter.value || undefined,
  }),
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
  { key: 'aksi', label: '', sortable: false },
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
// Satu pintu: data baru selalu membuat akun peserta; 'tautkan' hanya saat Simpan diulang setelah akunnya telanjur terbuat.
const modeAkun = ref<'baru' | 'tautkan'>('baru');
const akun = reactive({ namaLengkap: '', email: '', noTelepon: '' });
const akunBaru = reactive({ golonganKelasId: '' as number | '', jurusanId: '' as number | '' });
const akunErrors = reactive<Record<string, string>>({});
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
    // Default: buat akun peserta baru. Baris yang sudah tertaut tetap memakai akunnya (pesertaId terisi → bukan mode baru).
    modeAkun.value = 'baru';
    akunBaru.golonganKelasId = '';
    akunBaru.jurusanId = '';
    Object.keys(akunErrors).forEach((k) => delete akunErrors[k]);
  },
  { immediate: true }
);

// ---- Biodata peserta yang ditautkan (diisi/diubah langsung dari form Tambah/Ubah) ----
const biodataForm = reactive(biodataKosong());
const biodataErrors = reactive<Record<string, string>>({});
const biodataPeserta = ref<Peserta | null>(null);
const biodataLoading = ref(false);
const biodataTerkunci = ref(true);

watch(
  () => [isFormOpen.value, form.pesertaId] as const,
  async ([open, pesertaId]) => {
    Object.keys(biodataErrors).forEach((k) => delete biodataErrors[k]);
    biodataPeserta.value = null;
    isiBiodataForm(biodataForm, null, form.noTelepon);
    Object.assign(akun, { namaLengkap: form.nama, email: '', noTelepon: form.noTelepon });
    biodataTerkunci.value = true;
    if (!open || !pesertaId) return;
    biodataLoading.value = true;
    try {
      const p = await pesertaApi.get(Number(pesertaId));
      if (form.pesertaId !== pesertaId) return;
      biodataPeserta.value = p;
      Object.assign(akun, { namaLengkap: p.namaLengkap, email: p.email, noTelepon: p.noTelepon });
      isiBiodataForm(biodataForm, p.biodata, p.noTelepon);
      biodataTerkunci.value = p.biodata?.isLocked ?? true;
    } catch (err) {
      toastError(extractErrorMessage(err, 'Gagal memuat biodata peserta'));
    } finally {
      biodataLoading.value = false;
    }
  }
);

const modeBaru = computed(() => modeAkun.value === 'baru' && !form.pesertaId);
/** Kolom akun + biodata tampil saat membuat akun baru atau setelah akun peserta tertaut dimuat. */
const formAkunTampil = computed(() => modeBaru.value || !!biodataPeserta.value);
const semuaErrorBiodata = computed(() => ({ ...errors, ...akunErrors, ...biodataErrors }));
/** Kelas perkuliahan akun baru; kelas tanpa prodi di master Jurusan ditandai (prodi-nya tidak bisa dipilih). */
const kelasAkunBaruOptions = computed(() =>
  golonganKelasList.value.map((g) => ({
    value: g.id,
    label: jurusanList.value.some((j) => j.golonganKelasId === g.id) ? g.namaKelas : `${g.namaKelas} (belum ada prodi)`,
  }))
);
const jurusanAkunBaruOptions = computed(() =>
  jurusanList.value.filter((j) => j.golonganKelasId === akunBaru.golonganKelasId).map((j) => ({ value: j.id, label: j.namaJurusan }))
);
watch(
  () => akunBaru.golonganKelasId,
  () => {
    if (!jurusanAkunBaruOptions.value.some((o) => o.value === akunBaru.jurusanId)) akunBaru.jurusanId = '';
  }
);
// Prodi baris PMB mengikuti program studi akun baru.
watch(
  () => akunBaru.jurusanId,
  (id) => {
    if (modeBaru.value) form.prodi = jurusanList.value.find((j) => j.id === id)?.namaJurusan ?? '';
  }
);

const validasiAkun = () => {
  Object.keys(akunErrors).forEach((k) => delete akunErrors[k]);
  if (!akun.namaLengkap.trim()) akunErrors.namaLengkap = 'Nama lengkap wajib diisi';
  if (!akun.email.trim()) akunErrors.email = 'Email wajib diisi';
  if (!akun.noTelepon.trim()) akunErrors.noTelepon = 'No. HP wajib diisi';
  if (modeBaru.value) {
    if (!akunBaru.golonganKelasId) akunErrors.golonganKelasId = 'Kelas perkuliahan wajib dipilih';
    if (!akunBaru.jurusanId) akunErrors.jurusanId = 'Program studi wajib dipilih';
  }
  return Object.keys(akunErrors).length === 0;
};

/** Biodata disimpan bila peserta sudah punya biodata atau admin mulai mengisinya. */
const perluSimpanBiodata = () =>
  modeBaru.value
    ? !biodataBelumDiisi(biodataForm)
    : !!biodataPeserta.value && (!!biodataPeserta.value.biodata?.nik || !biodataBelumDiisi(biodataForm));

const linkedPeserta = computed(() => pesertaById(form.pesertaId));
const linkedLulusTesMasuk = computed(() => linkedPeserta.value?.statusUjian === 'lulus');
const linkedStatusKuliah = computed(() => linkedPeserta.value?.statusKelulusan ?? 'menunggu');

const validate = (): boolean => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.nama.trim()) errors.nama = 'Nama wajib diisi';
  // Saat membuat / menautkan akun, asal sekolah diisi lewat popup Data Pendidikan (boleh kosong di sini).
  if (!formAkunTampil.value && !form.asalSekolah.trim()) errors.asalSekolah = 'Asal sekolah wajib diisi';
  if (!form.prodi.trim()) errors.prodi = 'Prodi wajib diisi';
  return Object.keys(errors).length === 0;
};

/** Asal sekolah belum diisi (diisi kemudian lewat popup Data Pendidikan) disimpan sebagai '-'. */
const ASAL_KOSONG = '-';
const asalSekolahDisimpan = () => form.asalSekolah.trim() || ASAL_KOSONG;

const handleSubmit = async () => {
  if (formAkunTampil.value) {
    form.nama = akun.namaLengkap.trim();
    form.noTelepon = akun.noTelepon.trim();
  }
  const simpanBiodata = perluSimpanBiodata();
  const valid = [
    validate(),
    formAkunTampil.value ? validasiAkun() : true,
    simpanBiodata ? validasiBiodata(biodataForm, biodataErrors) : true,
  ].every(Boolean);
  if (!valid) {
    formError.value = 'Data belum lengkap — periksa kolom yang ditandai merah.';
    return;
  }
  submitting.value = true;
  formError.value = null;
  let pesertaBaruId: number | null = null;
  try {
    if (modeBaru.value) {
      // Buat akun peserta (+ biodata) dulu, lalu tautkan ke baris ini.
      const baru = await pesertaApi.create({
        namaLengkap: akun.namaLengkap.trim(),
        asalSekolah: asalSekolahDisimpan(),
        email: akun.email.trim(),
        noTelepon: akun.noTelepon.trim(),
        golonganKelasId: Number(akunBaru.golonganKelasId),
        jurusanId: Number(akunBaru.jurusanId),
        biodata: simpanBiodata ? biodataPayload(biodataForm) : undefined,
      });
      pesertaBaruId = baru.id;
      // Status akun baru disamakan dengan isian status di form ini.
      await pesertaApi.update(baru.id, {
        statusUjian: form.lulusTesMasuk ? 'lulus' : 'belum_ujian',
        statusKelulusan: form.statusKuliah,
      });
      if (simpanBiodata && !biodataTerkunci.value) await pesertaApi.setBiodataLock(baru.id, false);
    } else if (biodataPeserta.value) {
      const p = biodataPeserta.value;
      const akunBerubah = {
        namaLengkap: akun.namaLengkap.trim(),
        email: akun.email.trim(),
        noTelepon: akun.noTelepon.trim(),
        asalSekolah: asalSekolahDisimpan(),
      };
      if ((Object.keys(akunBerubah) as (keyof typeof akunBerubah)[]).some((k) => akunBerubah[k] !== p[k])) {
        await pesertaApi.update(p.id, akunBerubah);
      }
    }
    const payload = {
      nama: form.nama.trim(),
      asalSekolah: asalSekolahDisimpan(),
      prodi: form.prodi.trim(),
      gelombangId: form.gelombangId || null,
      pesertaId: pesertaBaruId ?? (form.pesertaId || null),
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
    if (simpanBiodata && biodataPeserta.value) {
      const id = biodataPeserta.value.id;
      const hasil = await pesertaApi.saveBiodata(id, biodataPayload(biodataForm, biodataPeserta.value.biodata?.isAgree ?? true));
      if (!!hasil.biodata?.isLocked !== biodataTerkunci.value) await pesertaApi.setBiodataLock(id, biodataTerkunci.value);
    }
    onSaved();
    loadStats();
    if (pesertaBaruId) {
      toastSuccess(`Akun peserta dibuat. Login: username ${akun.email.trim()} · password ${akun.noTelepon.trim()} (No. HP)`);
      loadPesertaOptions();
    }
  } catch (err) {
    // Akun sudah terbuat tapi langkah berikutnya gagal: pakai akun itu saat Simpan diulang (hindari akun ganda).
    if (pesertaBaruId) {
      modeAkun.value = 'tautkan';
      form.pesertaId = pesertaBaruId;
      loadPesertaOptions();
    }
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

// ---- Sumber Informasi (ikon di sebelah Data Pendidikan → popup) ----
const sumberOpen = ref(false);
const sumberTarget = ref<CalonMahasiswa | null>(null);
/** Sumber informasi efektif: isian popup, atau pilihan peserta saat mendaftar. */
const namaSumber = (item: CalonMahasiswa) => item.sumberInformasi?.namaInformasi ?? item.peserta?.sumberInformasi?.namaInformasi ?? null;
const openSumber = (item: CalonMahasiswa) => {
  sumberTarget.value = item;
  sumberOpen.value = true;
};

// ---- Sumber Informasi 2 (ikon di sebelah Sumber Informasi → popup kelas, skema, almamater, gelombang, jurusan 1–3) ----
const dataPmbOpen = ref(false);
const dataPmbTarget = ref<CalonMahasiswa | null>(null);
/** Lengkap = kelas perkuliahan, gelombang, dan jurusan 1 terisi (isian popup atau pilihan peserta saat mendaftar). */
const dataPmbLengkap = (item: CalonMahasiswa) =>
  !!(item.golonganKelasId ?? item.peserta?.golonganKelasId) && !!item.gelombangId && !!(item.jurusan1Id ?? item.peserta?.jurusanId);
const openDataPmb = (item: CalonMahasiswa) => {
  dataPmbTarget.value = item;
  dataPmbOpen.value = true;
};

// ---- Data Pendidikan (ikon di kolom aksi → popup) ----
const dokumenOpen = ref(false);
const dokumenTarget = ref<CalonMahasiswa | null>(null);
const dokumenBeasiswa = ref(false);
const openDokumen = (item: CalonMahasiswa, beasiswa = false) => {
  dokumenTarget.value = item;
  dokumenBeasiswa.value = beasiswa;
  dokumenOpen.value = true;
};

const pendidikanOpen = ref(false);
const pendidikanTarget = ref<CalonMahasiswa | null>(null);
/** Lengkap = asal sekolah + jurusan, tahun lulus, jenis pengelolaan & alamat sekolah terisi (NISN opsional). */
const pendidikanLengkap = (item: CalonMahasiswa) => {
  const b = item.peserta?.biodata;
  return !!(item.asalSekolah && item.asalSekolah !== ASAL_KOSONG && b?.jurusanSekolah && b.tahunLulus && b.jenisPengelolaanSekolah && b.alamatSekolah);
};
const openPendidikan = (item: CalonMahasiswa) => {
  pendidikanTarget.value = item;
  pendidikanOpen.value = true;
};

/**
 * Alur sama dengan Status Pendaftaran di portal peserta: Pendaftaran → Kelengkapan Dokumen (Formulir Pendaftaran +
 * Kelengkapan Persyaratan) → Tes Masuk → hasil (Diterima / Ditolak / Menunggu Hasil).
 */
const progressSteps = (item: CalonMahasiswa): ProgressStep[] => {
  const tesGagal = item.peserta?.statusUjian === 'tidak_lulus';
  const base = [
    { key: 'pendaftaran', label: 'Pendaftaran', done: true, gagal: false },
    { key: 'kelengkapan', label: 'Kelengkapan Dokumen', done: item.formulirPendaftaran && item.kelengkapanPersyaratan, gagal: false },
    { key: 'tes', label: tesGagal ? 'Tidak Lulus Tes' : 'Tes Masuk', done: item.lulusTesMasuk, gagal: tesGagal },
  ];
  const firstPendingIndex = base.findIndex((s) => !s.done);
  const steps: ProgressStep[] = base.map((s, idx) => ({
    key: s.key,
    label: s.label,
    state: s.done ? 'done' : s.gagal ? 'danger' : idx === firstPendingIndex ? 'active' : 'pending',
    icon: s.done ? 'check' : s.gagal ? 'close' : 'more_horiz',
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

/** Reset password akun peserta ke nomor HP (wajib diganti peserta saat login). */
const resetPasswordPeserta = async (item: CalonMahasiswa) => {
  if (!item.peserta) return;
  const ok = await confirmAction({
    title: 'Reset password ke nomor HP?',
    text: `Password akun ${item.peserta.namaLengkap} menjadi nomor HP ${item.peserta.noTelepon}. Peserta wajib membuat password baru saat login.`,
    confirmLabel: 'Reset',
  });
  if (!ok) return;
  try {
    const r = await pesertaApi.resetPasswordDefault(item.peserta.id);
    toastSuccess(`Password direset. Login: username ${r.email} · password ${r.username} (No. HP)`);
    if (viewTarget.value?.peserta) viewTarget.value.peserta.wajibGantiPassword = true;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mereset password'));
  }
};
</script>

<template>
  <div>
    <PageHeader
      title="Peserta"
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
        <!-- min-w-0: kolom grid boleh menyempit; kotak cari dipaksa selebar kolomnya (bawaan md:w-96).
             Kotak cari & dropdown disamakan tinggi + ukuran teksnya supaya sejajar satu baris. -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 items-center [&_input]:h-10 [&_button]:h-10 [&_button]:py-0 [&_button]:text-body-sm">
          <div class="min-w-0 sm:col-span-2 xl:col-span-1 [&>div]:w-full!">
            <SearchInput v-model="search" placeholder="Cari nama siswa atau asal sekolah..." />
          </div>
          <div class="min-w-0">
            <SelectInput v-model="tahunFilter" placeholder="Semua Tahun PMB" :options="tahunOptions" @change="onFilterChange" />
          </div>
          <div class="min-w-0">
            <SelectInput v-model="gelombangFilter" placeholder="Semua Gelombang" :options="gelombangOptions" @change="onFilterChange" />
          </div>
          <div class="min-w-0">
            <SelectInput v-model="golonganFilter" placeholder="Semua Golongan Kelas" :options="golonganFilterOptions" @change="onGolonganFilterChange" />
          </div>
          <div class="min-w-0">
            <SelectInput v-model="prodiFilter" placeholder="Semua Jurusan" :options="prodiFilterOptions" @change="onFilterChange" />
          </div>
        </div>
        <p class="text-label-sm text-on-surface-variant">Menampilkan {{ items.length }} dari {{ meta.total }} data</p>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada data calon mahasiswa"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-aksi="{ item }">
          <button
            type="button"
            class="text-on-surface-variant hover:text-primary transition-colors"
            title="Lihat Detail"
            @click="openDetail(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">visibility</span>
          </button>
        </template>
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
            class="inline-flex items-center justify-center w-7 h-7 rounded-full text-white transition-opacity hover:opacity-85"
            :class="pendidikanLengkap(item) ? 'bg-[#22c55e]' : 'bg-[#dc2626]'"
            :title="pendidikanLengkap(item) ? 'Data Pendidikan: lengkap' : 'Data Pendidikan: belum lengkap'"
            @click="openPendidikan(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px; font-variation-settings: 'wght' 700">{{ pendidikanLengkap(item) ? 'check' : 'school' }}</span>
          </button>
          <button
            type="button"
            class="relative inline-flex items-center justify-center w-7 h-7 rounded-full text-white transition-opacity hover:opacity-85"
            :class="namaSumber(item) ? 'bg-[#22c55e]' : 'bg-[#dc2626]'"
            :title="namaSumber(item) ? `Sumber Informasi: ${namaSumber(item)}${item.sumberTerkunci ? ' (terkunci)' : ''}` : 'Sumber Informasi: belum diisi'"
            @click="openSumber(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px; font-variation-settings: 'wght' 700">{{ namaSumber(item) ? 'check' : 'campaign' }}</span>
            <span v-if="item.sumberTerkunci" class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-surface-container-lowest text-on-surface-variant flex items-center justify-center shadow">
              <span class="material-symbols-outlined" style="font-size: 11px">lock</span>
            </span>
          </button>
          <button
            type="button"
            class="relative inline-flex items-center justify-center w-7 h-7 rounded-full text-white transition-opacity hover:opacity-85"
            :class="dataPmbLengkap(item) ? 'bg-[#22c55e]' : 'bg-[#dc2626]'"
            :title="`Sumber Informasi 2: ${dataPmbLengkap(item) ? 'lengkap' : 'belum lengkap'}${item.dataPmbTerkunci ? ' (terkunci)' : ''}`"
            @click="openDataPmb(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px; font-variation-settings: 'wght' 700">{{ dataPmbLengkap(item) ? 'check' : 'assignment' }}</span>
            <span v-if="item.dataPmbTerkunci" class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-surface-container-lowest text-on-surface-variant flex items-center justify-center shadow">
              <span class="material-symbols-outlined" style="font-size: 11px">lock</span>
            </span>
          </button>
          <button
            v-if="item.peserta"
            type="button"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full text-white transition-opacity hover:opacity-85"
            :class="item.dokumenUmumLengkap ? 'bg-[#22c55e]' : 'bg-[#dc2626]'"
            :title="item.dokumenUmumLengkap ? 'Dokumen Pendaftaran (lengkap)' : 'Dokumen Pendaftaran (belum lengkap)'"
            @click="openDokumen(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px; font-variation-settings: 'wght' 700">{{ item.dokumenUmumLengkap ? 'check' : 'description' }}</span>
          </button>
          <button
            v-if="item.peserta"
            type="button"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full text-white transition-opacity hover:opacity-85"
            :class="item.dokumenBeasiswaLengkap ? 'bg-[#22c55e]' : 'bg-[#dc2626]'"
            :title="item.dokumenBeasiswaLengkap ? 'Dokumen Pendaftaran 2 / Beasiswa (lengkap)' : 'Dokumen Pendaftaran 2 / Beasiswa (belum lengkap)'"
            @click="openDokumen(item, true)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px; font-variation-settings: 'wght' 700">{{ item.dokumenBeasiswaLengkap ? 'check' : 'description' }}</span>
          </button>
          <button
            v-if="canUpdate"
            type="button"
            class="text-on-surface-variant hover:text-primary transition-colors"
            title="Ubah Data"
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
      :title="editingItem ? 'Ubah Peserta' : 'Tambah Peserta'"
      size="xl"
      @update:model-value="closeForm"
    >
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ formError }}
        </div>

        <div v-if="!formAkunTampil" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput v-model="form.nama" label="Nama" required :error="errors.nama" />
          <TextInput v-model="form.asalSekolah" label="Asal Sekolah" required :error="errors.asalSekolah" />
        </div>
        <div v-if="!modeBaru || !formAkunTampil" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchableSelect
            v-if="!modeBaru"
            :model-value="form.prodi"
            label="Prodi"
            required
            :error="errors.prodi"
            :options="prodiOptions"
            placeholder="-- Pilih Prodi --"
            search-placeholder="Ketik nama prodi..."
            @update:model-value="(v) => (form.prodi = v ? String(v) : '')"
          />
          <TextInput v-if="!formAkunTampil" v-model="form.noTelepon" label="No Telepon" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput v-model="form.gelombangId" label="Gelombang" placeholder="Belum dipilih" :options="gelombangFormOptions" />
          <SelectInput v-model="form.skemaPembiayaan" label="Skema Pembiayaan" :options="skemaOptions" />
        </div>

        <div class="space-y-3">
          <div v-if="modeBaru" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput
              v-model="akunBaru.golonganKelasId"
              label="Kelas Perkuliahan"
              required
              :options="kelasAkunBaruOptions"
              :error="akunErrors.golonganKelasId"
            />
            <div>
              <SelectInput
                v-model="akunBaru.jurusanId"
                label="Program Studi"
                required
                :options="jurusanAkunBaruOptions"
                :placeholder="akunBaru.golonganKelasId && !jurusanAkunBaruOptions.length ? 'Belum ada prodi untuk kelas ini' : 'Pilih...'"
                :disabled="!akunBaru.golonganKelasId || !jurusanAkunBaruOptions.length"
                :error="akunErrors.jurusanId"
              />
              <p v-if="akunBaru.golonganKelasId && !jurusanAkunBaruOptions.length" class="mt-1 text-label-sm text-[#b45309]">
                Kelas ini belum punya program studi. Tambahkan di <b>Master Data › Jurusan</b> (pilih golongan kelas ini), atau pilih kelas lain.
              </p>
            </div>
            <p class="md:col-span-2 text-label-sm text-on-surface-variant">
              Akun peserta dibuat otomatis — login dengan nomor HP, password awal = nomor HP.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 py-2 border-y border-outline-variant">
          <div v-if="form.pesertaId">
            <span class="block font-medium text-label-md text-on-surface mb-2">Formulir Pendaftaran</span>
            <StatusBadge
              :label="form.formulirPendaftaran ? 'Lengkap (mengikuti Dokumen Pendaftaran)' : 'Belum lengkap (mengikuti Dokumen Pendaftaran)'"
              :variant="form.formulirPendaftaran ? 'success' : 'neutral'"
            />
          </div>
          <CheckboxToggle v-else v-model="form.formulirPendaftaran" label="Formulir Pendaftaran" />
          <div v-if="form.pesertaId">
            <span class="block font-medium text-label-md text-on-surface mb-2">Lulus Tes Masuk</span>
            <StatusBadge
              :label="linkedLulusTesMasuk ? 'Lulus (mengikuti Peserta)' : 'Belum Lulus (mengikuti Peserta)'"
              :variant="linkedLulusTesMasuk ? 'success' : 'neutral'"
            />
          </div>
          <CheckboxToggle v-else v-model="form.lulusTesMasuk" label="Lulus Tes Masuk" />
          <div v-if="form.pesertaId">
            <span class="block font-medium text-label-md text-on-surface mb-2">Kelengkapan Persyaratan</span>
            <StatusBadge
              :label="form.kelengkapanPersyaratan ? 'Lengkap (mengikuti Dokumen Pendaftaran 2)' : 'Belum lengkap (mengikuti Dokumen Pendaftaran 2)'"
              :variant="form.kelengkapanPersyaratan ? 'success' : 'neutral'"
            />
          </div>
          <CheckboxToggle v-else v-model="form.kelengkapanPersyaratan" label="Kelengkapan Persyaratan" />
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

        <section class="border border-outline-variant rounded-lg overflow-hidden">
          <div class="px-4 py-3 bg-surface-bright border-b border-outline-variant flex flex-wrap items-center gap-2">
            <h3 class="font-semibold text-body-md text-on-surface mr-auto">Biodata Personal</h3>
            <StatusBadge
              v-if="biodataPeserta && !biodataPeserta.biodata"
              variant="neutral"
              label="Belum diisi peserta"
            />
          </div>
          <p v-if="biodataLoading" class="p-4 text-body-sm text-on-surface-variant">Memuat biodata...</p>
          <p v-else-if="!formAkunTampil" class="p-4 text-body-sm text-on-surface-variant">
            Pilih <b>Buat akun peserta baru</b> atau tautkan ke akun peserta PMB di atas untuk mengisi biodata.
          </p>
          <div v-else class="p-4 space-y-4">
            <p v-if="!biodataPeserta?.biodata" class="text-label-sm text-on-surface-variant">
              Nama, email &amp; No. HP wajib. Biodata lainnya boleh dikosongkan — hanya disimpan bila diisi.
            </p>
            <p v-if="!biodataPeserta" class="flex items-start gap-2 px-3 py-2 rounded-md bg-primary-container/40 text-body-sm text-on-surface">
              <span class="material-symbols-outlined text-primary" style="font-size: 18px">key</span>
              <span>Akun login peserta: <b>username = email</b>, <b>password awal = No. HP</b>. Peserta diminta membuat password baru saat login pertama.</span>
            </p>
            <PesertaBiodataFields :form="biodataForm" :errors="semuaErrorBiodata" :akun="akun" :sekolah="form" :tanpa-pendidikan="true" />
            <div class="border-t border-outline-variant pt-4">
              <CheckboxToggle
                v-model="biodataTerkunci"
                label="Kunci biodata"
                description="Terkunci = peserta tidak bisa mengubah biodata dari portal pendaftaran. Hilangkan centang untuk membuka kunci."
              />
            </div>
          </div>
        </section>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeForm">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <Modal
      :model-value="!!viewTarget"
      title="Detail Peserta"
      subtitle="Data pendaftaran & biodata yang tercatat untuk peserta ini."
      size="xl"
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
            <template v-if="viewTarget.peserta">
              <p class="text-body-md text-on-surface font-medium">{{ viewTarget.peserta.namaLengkap }} — {{ viewTarget.peserta.email }}</p>
              <p class="text-body-sm text-on-surface-variant mt-1">
                Login: username <b>{{ viewTarget.peserta.email }}</b> ·
                {{ viewTarget.peserta.wajibGantiPassword ? `password awal = No. HP (${viewTarget.peserta.noTelepon})` : 'password sudah diganti peserta' }}
              </p>
              <button
                v-if="canUpdate"
                type="button"
                class="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-outline-variant text-label-sm font-medium text-on-surface hover:bg-surface-container"
                @click="resetPasswordPeserta(viewTarget)"
              >
                <span class="material-symbols-outlined" style="font-size: 16px">lock_reset</span>Reset password ke nomor HP
              </button>
            </template>
            <p v-else class="text-body-md text-on-surface-variant">Belum ditautkan (status diisi manual)</p>
          </div>
        </div>

        <PesertaBiodataPanel
          v-if="viewTarget.peserta"
          :peserta-id="viewTarget.peserta.id"
          :can-update="canUpdate"
          :can-delete="canDelete"
        />

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

    <PendidikanModal v-model="pendidikanOpen" :item="pendidikanTarget" :can-update="canUpdate" @saved="fetchItems" />
    <DokumenPesertaModal v-model="dokumenOpen" :item="dokumenTarget" :beasiswa="dokumenBeasiswa" />
    <SumberInformasiModal v-model="sumberOpen" :item="sumberTarget" :can-update="canUpdate" @saved="fetchItems" />
    <DataPmbModal v-model="dataPmbOpen" :item="dataPmbTarget" :can-update="canUpdate" @saved="fetchItems" />

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

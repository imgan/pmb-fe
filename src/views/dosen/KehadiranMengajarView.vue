<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Modal from '@/components/ui/Modal.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import {
  dosenJadwalApi,
  dosenKelasApi,
  dosenPresensiApi,
  dosenRealisasiApi,
  dosenRingkasanKelasApi,
  type RealisasiMengajarPayload,
} from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import { toastSuccess, toastError, confirmAction } from '@/utils/swal';
import { openBlob } from '@/utils/download';
import type {
  DosenPortalJadwal,
  PresensiMahasiswaRow,
  RealisasiMengajar,
  RingkasanKelasDosen,
  StatusKehadiranDosen,
  StatusKehadiranMahasiswa,
} from '@/types/entities';
import type { PagingMeta } from '@/types/common';

// ---- Opsi dropdown ----

const jadwalList = ref<DosenPortalJadwal[]>([]);
const jadwalOptions = computed(() =>
  jadwalList.value.map((j) => ({ value: j.id, label: `[${j.kodeMataKuliah}]${j.namaMataKuliah}-${j.kelas}` }))
);

// "Waktu Kuliah" adalah dropdown tampilan slot jam kuliah standar — model JadwalKuliah/KehadiranDosen
// tidak punya konsep "slot waktu" tersendiri (hanya field `jam` berupa angka urutan), jadi field ini
// murni bantu UI (meniru tata letak pada rancangan) dan tidak dikirim ke backend; jam masuk/keluar
// yang sesungguhnya sudah tercatat lewat dua dropdown jam & menit di bawahnya.
const WAKTU_KULIAH_OPTIONS = [
  { value: '07:00-08:40', label: '07:00 - 08:40' },
  { value: '08:40-10:20', label: '08:40 - 10:20' },
  { value: '10:20-12:00', label: '10:20 - 12:00' },
  { value: '13:00-14:40', label: '13:00 - 14:40' },
  { value: '14:40-16:20', label: '14:40 - 16:20' },
  { value: '16:20-18:00', label: '16:20 - 18:00' },
  { value: '18:30-20:10', label: '18:30 - 20:10' },
  { value: '20:10-21:50', label: '20:10 - 21:50' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({ value: String(i).padStart(2, '0'), label: String(i).padStart(2, '0') }));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => ({ value: String(i).padStart(2, '0'), label: String(i).padStart(2, '0') }));
const PERTEMUAN_OPTIONS = Array.from({ length: 16 }, (_, i) => ({ value: i + 1, label: `Pertemuan ke-${i + 1}` }));
const STATUS_OPTIONS: { value: StatusKehadiranDosen; label: string }[] = [
  { value: 'HADIR', label: 'Hadir' },
  { value: 'TIDAK_HADIR', label: 'Tidak Hadir' },
  { value: 'IZIN', label: 'Izin' },
  { value: 'SAKIT', label: 'Sakit' },
];
const statusLabel = (status: StatusKehadiranDosen) => STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
const STATUS_VARIANTS: Record<StatusKehadiranDosen, 'success' | 'warning' | 'danger' | 'neutral'> = {
  HADIR: 'success',
  TIDAK_HADIR: 'danger',
  IZIN: 'warning',
  SAKIT: 'warning',
};

const PRESENSI_STATUS_OPTIONS: { value: StatusKehadiranMahasiswa; label: string }[] = [
  { value: 'HADIR', label: 'Hadir' },
  { value: 'IZIN', label: 'Izin' },
  { value: 'SAKIT', label: 'Sakit' },
  { value: 'ALPA', label: 'Alpa' },
];

onMounted(async () => {
  try {
    jadwalList.value = await dosenJadwalApi.listMine();
  } catch {
    jadwalList.value = [];
  }
  fetchItems();
  fetchKelasAktif();
});

// ---- Mulai / selesai kelas (start-stop) ----

const kelasAktif = ref<RealisasiMengajar | null>(null);
const startForm = reactive<{ jadwalKuliahId: number | ''; pertemuanKe: number | ''; uraian: string; rincian: string }>({
  jadwalKuliahId: '',
  pertemuanKe: '',
  uraian: '',
  rincian: '',
});
const uraianAktif = ref('');
// Rincian pembahasan → kolom Rincian di cetak Realisasi Dosen Mengajar (field keterangan).
const rincianAktif = ref('');
const kelasBusy = ref(false);

const fetchKelasAktif = async () => {
  try {
    kelasAktif.value = await dosenRealisasiApi.aktif();
    uraianAktif.value = kelasAktif.value?.uraian ?? '';
    rincianAktif.value = kelasAktif.value?.keterangan ?? '';
  } catch {
    kelasAktif.value = null;
  }
};

const handleMulaiKelas = async () => {
  if (!startForm.jadwalKuliahId) {
    toastError('Pilih matakuliah yang akan dimulai');
    return;
  }
  kelasBusy.value = true;
  try {
    kelasAktif.value = await dosenRealisasiApi.start({
      jadwalKuliahId: Number(startForm.jadwalKuliahId),
      pertemuanKe: startForm.pertemuanKe === '' ? null : Number(startForm.pertemuanKe),
      uraian: startForm.uraian.trim() || null,
      keterangan: startForm.rincian.trim() || null,
    });
    uraianAktif.value = kelasAktif.value.uraian ?? '';
    rincianAktif.value = kelasAktif.value.keterangan ?? '';
    Object.assign(startForm, { jadwalKuliahId: '', pertemuanKe: '', uraian: '', rincian: '' });
    toastSuccess(`Kelas dimulai pukul ${kelasAktif.value.jamMasuk?.slice(0, 5)}`);
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memulai kelas'));
  } finally {
    kelasBusy.value = false;
  }
};

const handleSimpanUraianAktif = async () => {
  if (!kelasAktif.value) return;
  kelasBusy.value = true;
  try {
    kelasAktif.value = await dosenRealisasiApi.update(kelasAktif.value.id, {
      uraian: uraianAktif.value.trim() || null,
      keterangan: rincianAktif.value.trim() || null,
    });
    toastSuccess('Uraian & rincian tersimpan');
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan uraian'));
  } finally {
    kelasBusy.value = false;
  }
};

const handleSelesaiKelas = async () => {
  if (!kelasAktif.value) return;
  kelasBusy.value = true;
  try {
    const selesai = await dosenRealisasiApi.stop(kelasAktif.value.id, {
      uraian: uraianAktif.value.trim() || null,
      keterangan: rincianAktif.value.trim() || null,
    });
    toastSuccess(`Kelas selesai pukul ${selesai.jamKeluar?.slice(0, 5)}`);
    kelasAktif.value = null;
    uraianAktif.value = '';
    rincianAktif.value = '';
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyelesaikan kelas'));
  } finally {
    kelasBusy.value = false;
  }
};

// Tombol Mulai/Berhenti per baris tabel realisasi.
const sedangBerjalan = (item: RealisasiMengajar) => !!item.jamMasuk && !item.jamKeluar;
const rowBusyId = ref<number | null>(null);

const handleBerhentiBaris = async (item: RealisasiMengajar) => {
  if (kelasAktif.value?.id === item.id) return handleSelesaiKelas();
  const ok = await confirmAction({
    title: 'Selesaikan kelas?',
    text: `${item.jadwalKuliah?.namaMataKuliah ?? 'Kelas'} pertemuan ke-${item.pertemuanKe ?? '-'} — jam keluar dicatat sekarang.`,
    confirmLabel: 'Ya, selesaikan',
  });
  if (!ok) return;
  rowBusyId.value = item.id;
  try {
    const selesai = await dosenRealisasiApi.stop(item.id);
    toastSuccess(`Kelas selesai pukul ${selesai.jamKeluar?.slice(0, 5)}`);
    await fetchKelasAktif();
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyelesaikan kelas'));
  } finally {
    rowBusyId.value = null;
  }
};

/** Mulai pertemuan berikutnya untuk matakuliah/kelas baris ini (nomor pertemuan otomatis). */
const handleMulaiBaris = async (item: RealisasiMengajar) => {
  if (kelasAktif.value) {
    toastError('Masih ada kelas yang berlangsung — selesaikan dulu sebelum memulai kelas lain');
    return;
  }
  const ok = await confirmAction({
    title: 'Mulai kelas?',
    text: `${item.jadwalKuliah?.namaMataKuliah ?? 'Kelas'} ${item.jadwalKuliah?.kelas ?? ''} — pertemuan berikutnya, jam masuk dicatat sekarang.`,
    confirmLabel: 'Ya, mulai',
    danger: false,
  });
  if (!ok) return;
  rowBusyId.value = item.id;
  try {
    kelasAktif.value = await dosenRealisasiApi.start({ jadwalKuliahId: item.jadwalKuliahId });
    uraianAktif.value = kelasAktif.value.uraian ?? '';
    rincianAktif.value = kelasAktif.value.keterangan ?? '';
    toastSuccess(`Kelas dimulai pukul ${kelasAktif.value.jamMasuk?.slice(0, 5)} (pertemuan ke-${kelasAktif.value.pertemuanKe ?? '-'})`);
    fetchItems();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memulai kelas'));
  } finally {
    rowBusyId.value = null;
  }
};

// Durasi kelas berjalan, diperbarui tiap detik.
const now = ref(Date.now());
const ticker = setInterval(() => {
  now.value = Date.now();
}, 1000);
onBeforeUnmount(() => clearInterval(ticker));
const durasiAktif = computed(() => {
  const k = kelasAktif.value;
  if (!k?.jamMasuk) return '-';
  const mulai = new Date(`${k.tanggalRealisasi}T${k.jamMasuk}`).getTime();
  const detik = Math.max(0, Math.floor((now.value - mulai) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(detik / 3600))}:${pad(Math.floor((detik % 3600) / 60))}:${pad(detik % 60)}`;
});

// ---- Form tambah / edit realisasi ----

interface FormState {
  tanggalPertemuan: string;
  waktuKuliah: string;
  jadwalKuliahId: number | '';
  masukJam: string;
  masukMenit: string;
  pertemuanKe: number | '';
  keluarJam: string;
  keluarMenit: string;
  status: StatusKehadiranDosen | '';
  uraian: string;
  rincian: string;
}

const emptyForm = (): FormState => ({
  tanggalPertemuan: '',
  waktuKuliah: '',
  jadwalKuliahId: '',
  masukJam: '',
  masukMenit: '',
  pertemuanKe: '',
  keluarJam: '',
  keluarMenit: '',
  status: '',
  uraian: '',
  rincian: '',
});

const form = reactive(emptyForm());
const errors = reactive<Record<string, string>>({});
const formError = ref<string | null>(null);
const submitting = ref(false);
// Terisi saat mengedit realisasi yang sudah ada; kosong = mode tambah.
const editingId = ref<number | null>(null);

const validateForm = (): boolean => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.tanggalPertemuan) errors.tanggalPertemuan = 'Tanggal pertemuan wajib diisi';
  if (!editingId.value && !form.waktuKuliah) errors.waktuKuliah = 'Waktu kuliah wajib dipilih';
  if (!form.jadwalKuliahId) errors.jadwalKuliahId = 'Matakuliah wajib dipilih';
  if (!form.masukJam || !form.masukMenit) errors.masuk = 'Jam masuk wajib diisi';
  if (!form.pertemuanKe) errors.pertemuanKe = 'Pertemuan wajib dipilih';
  if (!editingId.value && (!form.keluarJam || !form.keluarMenit)) errors.keluar = 'Jam keluar wajib diisi';
  if (editingId.value && Boolean(form.keluarJam) !== Boolean(form.keluarMenit)) errors.keluar = 'Isi jam & menit keluar';
  if (!form.status) errors.status = 'Status wajib dipilih';
  return Object.keys(errors).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  submitting.value = true;
  formError.value = null;
  try {
    const payload: RealisasiMengajarPayload = {
      jadwalKuliahId: Number(form.jadwalKuliahId),
      tanggalRealisasi: form.tanggalPertemuan,
      jamMasuk: `${form.masukJam}:${form.masukMenit}:00`,
      jamKeluar: `${form.keluarJam}:${form.keluarMenit}:00`,
      pertemuanKe: Number(form.pertemuanKe),
      status: form.status as StatusKehadiranDosen,
      uraian: form.uraian.trim() || null,
      keterangan: form.rincian.trim() || null,
    };
    if (editingId.value) {
      await dosenRealisasiApi.update(editingId.value, {
        ...payload,
        jamKeluar: form.keluarJam ? payload.jamKeluar : null,
      });
      toastSuccess('Realisasi mengajar berhasil diperbarui');
      cancelEdit();
      fetchKelasAktif();
    } else {
      await dosenRealisasiApi.create(payload);
      toastSuccess('Realisasi mengajar berhasil disimpan');
      Object.assign(form, emptyForm());
      page.value = 1;
    }
    fetchItems();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan realisasi mengajar');
  } finally {
    submitting.value = false;
  }
};

const formSection = ref<HTMLElement | null>(null);

const startEdit = (item: RealisasiMengajar) => {
  const [masukJam = '', masukMenit = ''] = (item.jamMasuk ?? '').split(':');
  const [keluarJam = '', keluarMenit = ''] = (item.jamKeluar ?? '').split(':');
  Object.keys(errors).forEach((k) => delete errors[k]);
  formError.value = null;
  editingId.value = item.id;
  Object.assign(form, {
    tanggalPertemuan: item.tanggalRealisasi,
    waktuKuliah: '',
    jadwalKuliahId: item.jadwalKuliahId,
    masukJam,
    masukMenit,
    pertemuanKe: item.pertemuanKe ?? '',
    keluarJam,
    keluarMenit,
    status: item.status,
    uraian: item.uraian ?? '',
    rincian: item.keterangan ?? '',
  });
  nextTick(() => formSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
};

const cancelEdit = () => {
  editingId.value = null;
  Object.assign(form, emptyForm());
  Object.keys(errors).forEach((k) => delete errors[k]);
  formError.value = null;
};

// ---- Filter & tabel realisasi ----

const filterJadwalId = ref<number | ''>('');
const appliedFilterJadwalId = ref<number | ''>('');

const items = ref<RealisasiMengajar[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const listError = ref<string | null>(null);

const fetchItems = async () => {
  loading.value = true;
  listError.value = null;
  try {
    const result = await dosenRealisasiApi.list({
      page: page.value,
      limit: pageSize.value,
      jadwalKuliahId: appliedFilterJadwalId.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
    loadRingkasan();
  } catch (err) {
    listError.value = extractErrorMessage(err, 'Gagal memuat realisasi mengajar');
  } finally {
    loading.value = false;
  }
};

const handleTampilkan = () => {
  appliedFilterJadwalId.value = filterJadwalId.value;
  page.value = 1;
  fetchItems();
};

watch(page, fetchItems);
watch(pageSize, () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
});

// Kepala kelas (Program Studi, Periode, Rencana Tatap Muka, ...) saat satu matakuliah dipilih.
const ringkasan = ref<RingkasanKelasDosen | null>(null);
const loadRingkasan = async () => {
  if (!appliedFilterJadwalId.value) {
    ringkasan.value = null;
    return;
  }
  try {
    ringkasan.value = await dosenRingkasanKelasApi.get(Number(appliedFilterJadwalId.value));
  } catch {
    ringkasan.value = null;
  }
};
const formatTanggalPanjang = (value: string | null) =>
  value ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value)) : '-';
const ringkasanRows = computed(() => {
  const r = ringkasan.value;
  if (!r) return [];
  return [
    ['Program Studi', r.programStudi ?? '-', 'Periode', r.periode ?? '-'],
    ['Matakuliah', `${r.namaMataKuliah} (${r.kodeMataKuliah}) (${r.sks ?? 0} sks)`, 'Rencana Tatap Muka', `${r.rencanaTatapMuka} (terealisasi ${r.jumlahPertemuan})`],
    ['Kelas', r.kelas, 'Jumlah Mahasiswa', String(r.jumlahMahasiswa)],
    ['Tanggal Mulai Efektif', formatTanggalPanjang(r.tanggalMulaiEfektif), 'Tanggal Akhir Efektif', formatTanggalPanjang(r.tanggalAkhirEfektif)],
    ['Metode Pembelajaran', r.metodePembelajaran ?? '-', 'Ruang', r.ruangan ?? '-'],
  ];
});

// Kolom mengikuti "List Pertemuan": matakuliah & kelas hanya ditampilkan saat semua matakuliah.
const columns = computed<DataTableColumn[]>(() => [
  { key: 'pertemuanKe', label: 'Pertemuan', align: 'center' },
  { key: 'tanggal', label: 'Tanggal Pertemuan' },
  { key: 'waktu', label: 'Waktu', align: 'center' },
  ...(appliedFilterJadwalId.value
    ? []
    : ([
        { key: 'mengajar', label: 'Matakuliah' },
        { key: 'kelas', label: 'Kelas' },
      ] as DataTableColumn[])),
  { key: 'ruang', label: 'Ruang Pertemuan' },
  { key: 'dosen', label: 'Dosen Pengajar' },
  { key: 'uraian', label: 'Materi yang Diajarkan' },
  { key: 'hadir', label: 'Jumlah Mahasiswa Hadir', align: 'center' },
  { key: 'mulaiBerhenti', label: 'Mulai / Berhenti', align: 'center' },
  { key: 'status', label: 'Status', align: 'center' },
]);

const formatHariTanggal = (value: string) =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
const formatWaktu = (item: RealisasiMengajar) => {
  if (!item.jamMasuk) return '-';
  return `${item.jamMasuk.slice(0, 5)} - ${item.jamKeluar ? item.jamKeluar.slice(0, 5) : 'berjalan'}`;
};

const formatTanggalJam = (item: RealisasiMengajar) => {
  const tanggal = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(item.tanggalRealisasi)
  );
  const masuk = item.jamMasuk ?? '-';
  const keluar = item.jamKeluar ?? (item.jamMasuk ? 'berjalan' : '-');
  return `${tanggal} / ${masuk}-${keluar}`;
};

// ---- Hapus realisasi ----

const deleteTarget = ref<RealisasiMengajar | null>(null);
const deleting = ref(false);

const requestDelete = (item: RealisasiMengajar) => {
  deleteTarget.value = item;
};

const cancelDelete = () => {
  deleteTarget.value = null;
};

const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await dosenRealisasiApi.remove(deleteTarget.value.id);
    toastSuccess('Realisasi mengajar berhasil dihapus');
    deleteTarget.value = null;
    if (items.value.length === 1 && page.value > 1) {
      page.value -= 1;
    }
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus realisasi mengajar'));
  } finally {
    deleting.value = false;
  }
};

// ---- Presensi mahasiswa (per realisasi/pertemuan) ----

const presensiOpen = ref(false);
const presensiTarget = ref<RealisasiMengajar | null>(null);
const presensiRows = ref<PresensiMahasiswaRow[]>([]);
const presensiLoading = ref(false);
const presensiSaving = ref(false);
const presensiError = ref<string | null>(null);

const openPresensi = async (item: RealisasiMengajar) => {
  presensiTarget.value = item;
  presensiOpen.value = true;
  presensiRows.value = [];
  presensiError.value = null;
  presensiLoading.value = true;
  try {
    presensiRows.value = await dosenPresensiApi.get(item.id);
  } catch (err) {
    presensiError.value = extractErrorMessage(err, 'Gagal memuat presensi mahasiswa');
  } finally {
    presensiLoading.value = false;
  }
};

const closePresensi = () => {
  presensiOpen.value = false;
  presensiTarget.value = null;
};

const handleSavePresensi = async () => {
  if (!presensiTarget.value) return;
  const belumDiisi = presensiRows.value.filter((r) => !r.status);
  if (belumDiisi.length) {
    toastError('Isi status kehadiran untuk semua mahasiswa terlebih dahulu');
    return;
  }

  presensiSaving.value = true;
  try {
    presensiRows.value = await dosenPresensiApi.save(
      presensiTarget.value.id,
      presensiRows.value.map((r) => ({ mahasiswaId: r.mahasiswaId, status: r.status as StatusKehadiranMahasiswa, keterangan: r.keterangan }))
    );
    toastSuccess('Presensi mahasiswa berhasil disimpan');
    closePresensi();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan presensi mahasiswa'));
  } finally {
    presensiSaving.value = false;
  }
};

// Cetak realisasi mengajar (PDF) untuk matakuliah yang sedang difilter.
const cetakRealisasiLoading = ref(false);
const handleCetakRealisasi = async () => {
  if (!appliedFilterJadwalId.value) return;
  cetakRealisasiLoading.value = true;
  try {
    openBlob(await dosenKelasApi.pdf(Number(appliedFilterJadwalId.value), 'realisasi'));
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka cetakan realisasi'));
  } finally {
    cetakRealisasiLoading.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Kehadiran Mengajar" subtitle="Dosen / Perkuliahan / Kehadiran Mengajar" />

    <!-- Mulai / selesai kelas -->
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 mb-6">
      <template v-if="kelasAktif">
        <div class="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div>
            <p class="text-label-md text-on-surface-variant flex items-center gap-2">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-error animate-pulse"></span>
              Kelas sedang berlangsung
            </p>
            <h2 class="text-headline-md font-semibold text-primary mt-1">
              {{ kelasAktif.jadwalKuliah?.namaMataKuliah ?? '-' }} &middot; {{ kelasAktif.jadwalKuliah?.kelas ?? '-' }}
            </h2>
            <p class="text-body-sm text-on-surface-variant mt-1">
              Pertemuan ke-{{ kelasAktif.pertemuanKe ?? '-' }} &middot; Mulai {{ kelasAktif.jamMasuk?.slice(0, 5) }}
              <span v-if="kelasAktif.jadwalKuliah?.ruangan">&middot; {{ kelasAktif.jadwalKuliah.ruangan }}</span>
            </p>
          </div>
          <div class="text-right">
            <p class="text-label-sm text-on-surface-variant">Durasi</p>
            <p class="font-mono text-headline-md font-semibold text-on-surface">{{ durasiAktif }}</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextareaInput v-model="uraianAktif" label="Uraian Materi" :rows="3" placeholder="Pokok bahasan yang disampaikan pada pertemuan ini" />
          <TextareaInput v-model="rincianAktif" label="Rincian" :rows="3" placeholder="Rincian pembahasan / kegiatan pada pertemuan ini" />
        </div>
        <div class="mt-4 flex flex-wrap gap-3">
          <AppButton icon="fact_check" variant="secondary" :disabled="kelasBusy" @click="openPresensi(kelasAktif)">Isi Daftar Hadir</AppButton>
          <AppButton icon="save" variant="secondary" :disabled="kelasBusy" @click="handleSimpanUraianAktif">Simpan Uraian &amp; Rincian</AppButton>
          <AppButton icon="stop_circle" variant="danger" :disabled="kelasBusy" @click="handleSelesaiKelas">Selesai Kelas</AppButton>
        </div>
      </template>

      <template v-else>
        <h2 class="text-headline-md font-semibold text-primary mb-1">Mulai Kelas</h2>
        <p class="text-body-sm text-on-surface-variant mb-4">
          Jam masuk tercatat otomatis saat kelas dimulai dan jam keluar saat kelas diselesaikan.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput v-model="startForm.jadwalKuliahId" label="Matakuliah" required placeholder="--Matakuliah--" :options="jadwalOptions" />
          <SelectInput v-model="startForm.pertemuanKe" label="Pertemuan" placeholder="Otomatis (pertemuan berikutnya)" :options="PERTEMUAN_OPTIONS" />
          <TextareaInput v-model="startForm.uraian" label="Uraian Materi" :rows="2" placeholder="Pokok bahasan — opsional, bisa dilengkapi saat kelas berlangsung" />
          <TextareaInput v-model="startForm.rincian" label="Rincian Materi" :rows="2" placeholder="Rincian pembahasan / kegiatan — tampil di kolom Rincian cetak realisasi" />
        </div>
        <div class="mt-4">
          <AppButton icon="play_circle" :disabled="kelasBusy" @click="handleMulaiKelas">{{ kelasBusy ? 'Memulai...' : 'Mulai Kelas' }}</AppButton>
        </div>
      </template>
    </section>

    <!-- Form ubah realisasi (tambah manual dihapus; realisasi baru lewat Mulai Kelas) -->
    <section v-if="editingId" ref="formSection" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 mb-6">
      <h2 class="text-headline-md font-semibold text-primary mb-4">
        Ubah Realisasi Mengajar
      </h2>

      <div v-if="formError" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
        {{ formError }}
      </div>

      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="handleSubmit">
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Tanggal Pertemuan <span class="text-error">*</span></span>
          <input
            v-model="form.tanggalPertemuan"
            type="date"
            class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors"
            :class="errors.tanggalPertemuan ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'"
          />
          <p v-if="errors.tanggalPertemuan" class="mt-1 text-label-sm text-error">{{ errors.tanggalPertemuan }}</p>
        </label>

        <SelectInput
          v-model="form.waktuKuliah"
          label="Waktu Kuliah"
          required
          placeholder="--Waktu Kuliah--"
          :options="WAKTU_KULIAH_OPTIONS"
          :error="errors.waktuKuliah"
        />

        <SelectInput
          v-model="form.jadwalKuliahId"
          label="Matakuliah"
          required
          placeholder="--Matakuliah--"
          :options="jadwalOptions"
          :error="errors.jadwalKuliahId"
        />

        <SelectInput
          v-model="form.pertemuanKe"
          label="Pertemuan"
          required
          placeholder="--Pertemuan--"
          :options="PERTEMUAN_OPTIONS"
          :error="errors.pertemuanKe"
        />

        <div>
          <span class="block font-medium text-label-md text-on-surface mb-2">Masuk <span class="text-error">*</span></span>
          <div class="flex items-center gap-2">
            <SelectInput v-model="form.masukJam" class="flex-1" placeholder="Jam" :options="HOUR_OPTIONS" />
            <span class="text-on-surface-variant">:</span>
            <SelectInput v-model="form.masukMenit" class="flex-1" placeholder="Menit" :options="MINUTE_OPTIONS" />
          </div>
          <p v-if="errors.masuk" class="mt-1 text-label-sm text-error">{{ errors.masuk }}</p>
        </div>

        <div>
          <span class="block font-medium text-label-md text-on-surface mb-2">Keluar <span class="text-error">*</span></span>
          <div class="flex items-center gap-2">
            <SelectInput v-model="form.keluarJam" class="flex-1" placeholder="Jam" :options="HOUR_OPTIONS" />
            <span class="text-on-surface-variant">:</span>
            <SelectInput v-model="form.keluarMenit" class="flex-1" placeholder="Menit" :options="MINUTE_OPTIONS" />
          </div>
          <p v-if="errors.keluar" class="mt-1 text-label-sm text-error">{{ errors.keluar }}</p>
        </div>

        <SelectInput
          v-model="form.status"
          label="Status"
          required
          placeholder="--Status--"
          :options="STATUS_OPTIONS"
          :error="errors.status"
        />

        <div class="md:col-span-2">
          <TextareaInput v-model="form.uraian" label="Uraian Materi" :rows="3" placeholder="Pokok bahasan yang disampaikan pada pertemuan ini" />
        </div>

        <div class="md:col-span-2">
          <TextareaInput v-model="form.rincian" label="Rincian" :rows="3" placeholder="Rincian pembahasan / kegiatan pada pertemuan ini" />
        </div>
      </form>

      <div class="mt-4 flex gap-3">
        <AppButton :disabled="submitting" @click="handleSubmit">
          {{ submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan' }}
        </AppButton>
        <AppButton v-if="editingId" variant="secondary" @click="cancelEdit">Batal</AppButton>
      </div>
    </section>

    <!-- Tabel realisasi -->
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-6 pt-6">
        <h2 class="text-headline-md font-semibold text-primary mb-4">Realisasi Mengajar</h2>
      </div>

      <div class="px-6 pb-4 flex flex-col md:flex-row gap-3">
        <div class="w-full md:w-96">
          <SelectInput v-model="filterJadwalId" placeholder="-- Semua Matakuliah --" :options="jadwalOptions" />
        </div>
        <AppButton icon="filter_alt" @click="handleTampilkan">Tampilkan</AppButton>
        <AppButton
          variant="secondary"
          icon="print"
          :disabled="!appliedFilterJadwalId || cetakRealisasiLoading"
          :title="appliedFilterJadwalId ? 'Cetak realisasi mengajar matakuliah ini' : 'Pilih matakuliah lalu klik Tampilkan'"
          @click="handleCetakRealisasi"
        >
          {{ cetakRealisasiLoading ? 'Membuka...' : 'Cetak Realisasi' }}
        </AppButton>
      </div>

      <div v-if="ringkasan" class="px-6 pb-4 overflow-x-auto">
        <table class="w-full border-collapse text-body-sm">
          <tbody>
            <tr v-for="row in ringkasanRows" :key="row[0]" class="border border-outline-variant">
              <th class="w-48 px-3 py-2 text-left font-semibold bg-primary text-on-primary">{{ row[0] }}</th>
              <td class="px-3 py-2 text-on-surface">{{ row[1] }}</td>
              <th class="w-48 px-3 py-2 text-left font-semibold bg-primary text-on-primary">{{ row[2] }}</th>
              <td class="px-3 py-2 text-on-surface">{{ row[3] }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="listError" class="p-4 text-body-sm text-error bg-error-container">{{ listError }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="pageSize" />
      </div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada realisasi mengajar"
        actions-align="center"
      >
        <template #cell-tanggal="{ item }"><span class="whitespace-nowrap">{{ formatHariTanggal(item.tanggalRealisasi) }}</span></template>
        <template #cell-waktu="{ item }"><span class="whitespace-nowrap tabular-nums">{{ formatWaktu(item) }}</span></template>
        <template #cell-dosen="{ item }">{{ item.dosen?.namaLengkap ?? '-' }}</template>
        <template #cell-hadir="{ item }">
          <span class="tabular-nums">{{ item.jumlahHadir ?? 0 }}</span>
          <span v-if="ringkasan" class="text-on-surface-variant tabular-nums"> / {{ ringkasan.jumlahMahasiswa }}</span>
        </template>
        <template #cell-mengajar="{ item }">
          <div class="flex items-center gap-2">
            <span>{{ item.jadwalKuliah?.namaMataKuliah ?? '-' }}</span>
            <StatusBadge label="Offline" variant="neutral" />
          </div>
        </template>
        <template #cell-pertemuanKe="{ item }">{{ item.pertemuanKe ?? '-' }}</template>
        <template #cell-ruang="{ item }">{{ item.jadwalKuliah?.ruangan ?? '-' }}</template>
        <template #cell-kelas="{ item }">{{ item.jadwalKuliah?.kelas ?? '-' }}</template>
        <template #cell-uraian="{ item }">
          <span class="line-clamp-2 max-w-xs text-on-surface-variant" :title="item.uraian ?? ''">{{ item.uraian || '-' }}</span>
        </template>
        <template #cell-mulaiBerhenti="{ item }">
          <button
            v-if="sedangBerjalan(item)"
            type="button"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-error text-on-error text-label-md font-medium whitespace-nowrap hover:opacity-90 disabled:opacity-60"
            :disabled="rowBusyId === item.id || kelasBusy"
            title="Selesaikan kelas (catat jam keluar)"
            @click="handleBerhentiBaris(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">stop_circle</span>
            Berhenti
          </button>
          <button
            v-else
            type="button"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#059669] text-white text-label-md font-medium whitespace-nowrap hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="rowBusyId === item.id || kelasBusy || !!kelasAktif"
            :title="kelasAktif ? 'Selesaikan kelas yang sedang berlangsung dulu' : 'Mulai pertemuan berikutnya untuk matakuliah ini'"
            @click="handleMulaiBaris(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">play_circle</span>
            Mulai
          </button>
        </template>
        <template #cell-status="{ item }">
          <StatusBadge :label="statusLabel(item.status)" :variant="STATUS_VARIANTS[item.status]" />
        </template>
        <template #actions="{ item }">
          <button
            type="button"
            class="text-on-surface-variant hover:text-primary transition-colors mr-3"
            title="Isi Presensi Mahasiswa"
            @click="openPresensi(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">fact_check</span>
          </button>
          <button
            type="button"
            class="text-on-surface-variant hover:text-primary transition-colors mr-3"
            title="Ubah"
            @click="startEdit(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">edit</span>
          </button>
          <button type="button" class="text-on-surface-variant hover:text-error transition-colors" title="Hapus" @click="requestDelete(item)">
            <span class="material-symbols-outlined" style="font-size: 20px">close</span>
          </button>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Realisasi Mengajar"
      :message="`Yakin ingin menghapus realisasi mengajar tanggal ${deleteTarget ? formatTanggalJam(deleteTarget) : ''}?`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />

    <Modal
      v-model="presensiOpen"
      title="Presensi Mahasiswa"
      :subtitle="presensiTarget ? `${presensiTarget.jadwalKuliah?.namaMataKuliah ?? '-'} · Pertemuan ke-${presensiTarget.pertemuanKe ?? '-'}` : ''"
      size="lg"
      @close="closePresensi"
    >
      <div v-if="presensiError" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
        {{ presensiError }}
      </div>

      <div v-if="presensiLoading" class="text-center py-8 text-body-sm text-on-surface-variant">Memuat data mahasiswa...</div>

      <p v-else-if="!presensiRows.length" class="text-center py-8 text-body-sm text-on-surface-variant">
        Belum ada mahasiswa dengan KRS disetujui pada kelas ini.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3">NIM</th>
              <th class="p-3">Nama Mahasiswa</th>
              <th class="p-3">Status</th>
              <th class="p-3">Keterangan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="row in presensiRows" :key="row.mahasiswaId">
              <td class="p-3">{{ row.nim }}</td>
              <td class="p-3">{{ row.namaLengkap }}</td>
              <td class="p-3 whitespace-nowrap">{{ row.sistemKuliah ?? '-' }}</td>
              <td class="p-3">
                <div class="flex gap-3 flex-wrap">
                  <label v-for="opt in PRESENSI_STATUS_OPTIONS" :key="opt.value" class="flex items-center gap-1.5 cursor-pointer">
                    <input v-model="row.status" type="radio" :value="opt.value" class="w-4 h-4" />
                    <span class="text-body-sm text-on-surface">{{ opt.label }}</span>
                  </label>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <AppButton variant="secondary" @click="closePresensi">Batal</AppButton>
        <AppButton :disabled="presensiSaving || presensiLoading || !presensiRows.length" @click="handleSavePresensi">
          {{ presensiSaving ? 'Menyimpan...' : 'Simpan Presensi' }}
        </AppButton>
      </template>
    </Modal>
  </div>
</template>

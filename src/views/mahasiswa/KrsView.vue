<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import AngketPelayananForm from '@/components/mahasiswa/AngketPelayananForm.vue';
import { mahasiswaAngketPelayananApi, type AngketPelayananStatus } from '@/api/mahasiswaAngketPelayanan';
import {
  mahasiswaAksesAkademikApi,
  mahasiswaJadwalApi,
  mahasiswaKrsApi,
  mahasiswaSemesterApi,
  type KuotaSks,
} from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { toastSuccess, toastError, confirmAction } from '@/utils/swal';
import type { JadwalKuliah, Krs, StatusKrs, StatusMasukMahasiswa, TahunAjaran } from '@/types/entities';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';

const STATUS_LABELS: Record<StatusKrs, string> = {
  DRAFT: 'Draft',
  DIAJUKAN: 'Diajukan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  BELUM_ISI: 'Belum Isi',
};
const STATUS_VARIANT: Record<StatusKrs, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  DIAJUKAN: 'warning',
  DISETUJUI: 'success',
  DITOLAK: 'danger',
  BELUM_ISI: 'danger',
};

const isMahasiswaTransfer = (status: StatusMasukMahasiswa) => status.startsWith('TRANSFER');

const tahunAjaranAktif = ref<TahunAjaran | null>(null);
// Semester TIDAK bisa dipilih manual — dihitung otomatis dari periode masuk mahasiswa vs
// periode tahun ajaran berjalan (beda rumus untuk mahasiswa baru vs transfer), lihat
// pmb-be/src/utils/hitungSemester.js. Nilainya diambil sekali dari server saat halaman dibuka.
const semester = ref<number | null>(null);
const statusMasuk = ref<StatusMasukMahasiswa | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const submitting = ref(false);

const currentKrs = ref<Krs | null>(null);
const jadwalTersedia = ref<JadwalKuliah[]>([]);
const selectedIds = reactive(new Set<number>());
const kuota = ref<KuotaSks | null>(null);

// KRS yang ditolak (dosen PA / BAAK) bisa diperbaiki dan diajukan ulang.
const isEditable = computed(() => !currentKrs.value || ['DRAFT', 'DITOLAK'].includes(currentKrs.value.status));

// Angket pelayanan wajib diisi per tahun ajaran sebelum KRS bisa disimpan/diajukan (dicek ulang di server).
const angket = ref<AngketPelayananStatus | null>(null);
const perluIsiAngket = computed(() => isEditable.value && !!angket.value && !angket.value.sudahDiisi);

const totalSksDipilih = computed(() =>
  jadwalTersedia.value.filter((j) => selectedIds.has(j.id)).reduce((sum, j) => sum + (j.sks ?? 0), 0)
);

// Batas SKS: semester 1-2 = 20, semester 3+ = 24 (tidak lagi berdasarkan IP) — lihat pmb-be/src/utils/sksQuota.js.
const isOverQuota = computed(() => kuota.value?.maxSks != null && totalSksDipilih.value > kuota.value.maxSks);

const loadData = async () => {
  if (!tahunAjaranAktif.value || semester.value == null) return;
  loading.value = true;
  error.value = null;
  try {
    const [krsList, jadwal, kuotaSks, angketStatus] = await Promise.all([
      mahasiswaKrsApi.list({ tahunAjaranId: tahunAjaranAktif.value.id, semester: semester.value }),
      mahasiswaJadwalApi.listTersedia({ tahunAjaranId: tahunAjaranAktif.value.id, semester: semester.value }),
      mahasiswaKrsApi.kuota(semester.value),
      mahasiswaAngketPelayananApi.status(tahunAjaranAktif.value.id),
    ]);
    currentKrs.value = krsList[0] ?? null;
    angket.value = angketStatus;
    jadwalTersedia.value = jadwal;
    kuota.value = kuotaSks;
    selectedIds.clear();
    (currentKrs.value?.detailList ?? []).forEach((d) => selectedIds.add(d.jadwalKuliahId));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data KRS');
  } finally {
    loading.value = false;
  }
};

// Peringatan batas tagihan; kegagalan cek ini tidak memblokir halaman (server tetap memvalidasi saat simpan/ajukan).
const aksesKrsPesan = ref<string | null>(null);
mahasiswaAksesAkademikApi
  .get()
  .then((akses) => (aksesKrsPesan.value = akses.krs.diizinkan ? null : akses.krs.pesan))
  .catch(() => {});

onMounted(async () => {
  try {
    // Periode KRS mengikuti Tahun FRS aktif, bisa berbeda dari tahun akademik berjalan.
    const periode = await mahasiswaSemesterApi.periodeKrs();
    tahunAjaranAktif.value = periode.tahunAjaran;
    semester.value = periode.semester;
    statusMasuk.value = periode.statusMasuk;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat semester berjalan');
    return;
  }
  await loadData();
});

const wouldExceedQuota = (jadwal: JadwalKuliah) =>
  kuota.value?.maxSks != null && totalSksDipilih.value + (jadwal.sks ?? 0) > kuota.value.maxSks;

const selectedJadwal = computed(() => jadwalTersedia.value.filter((j) => selectedIds.has(j.id)));

// Cerminan dari pengecekan di backend (pmb-be/src/utils/krsConflict.js): tidak boleh ambil dua
// kelas dari mata kuliah yang sama, atau dua kelas yang hari & jamnya bentrok. Kelas tanpa
// hari/jam yang jelas dilewati dari cek bentrok karena datanya belum cukup untuk memastikan
// ada tabrakan. Mata kuliah mengulang boleh bentrok jadwal (kebijakan kampus).
const findConflict = (jadwal: JadwalKuliah): string | null => {
  const other = selectedJadwal.value;
  const sameMataKuliah = other.find((j) =>
    jadwal.mataKuliahId != null ? j.mataKuliahId === jadwal.mataKuliahId : j.kodeMataKuliah === jadwal.kodeMataKuliah
  );
  if (sameMataKuliah) {
    return `Sudah memilih kelas lain untuk mata kuliah ${sameMataKuliah.namaMataKuliah}`;
  }

  // Mata kuliah lama & penggantinya di kurikulum baru = satu mata kuliah (Master Konversi Kurikulum).
  const setara = jadwal.mengulang
    ? other.find((j) => j.mengulang?.kodeMataKuliah === jadwal.mengulang?.kodeMataKuliah)
    : undefined;
  if (setara) {
    return `Setara dengan [${setara.kodeMataKuliah}] ${setara.namaMataKuliah} yang sudah dipilih (konversi kurikulum)`;
  }

  const bentrok = other.find(
    (j) =>
      !jadwal.mengulang &&
      !j.mengulang &&
      j.jam != null &&
      jadwal.jam != null &&
      j.jam === jadwal.jam &&
      (j.hari ?? []).some((h) => (jadwal.hari ?? []).includes(h))
  );
  if (bentrok) {
    return `Jadwal bentrok dengan [${bentrok.kodeMataKuliah}] ${bentrok.namaMataKuliah} (kelas ${bentrok.kelas})`;
  }

  return null;
};

const toggleSelect = (jadwal: JadwalKuliah) => {
  if (!isEditable.value) return;
  if (selectedIds.has(jadwal.id)) {
    selectedIds.delete(jadwal.id);
    return;
  }
  const conflict = findConflict(jadwal);
  if (conflict) {
    toastError(conflict);
    return;
  }
  if (wouldExceedQuota(jadwal)) {
    toastError(`Total SKS akan melebihi kuota maksimal ${kuota.value?.maxSks} SKS`);
    return;
  }
  selectedIds.add(jadwal.id);
};

const isBlocked = (jadwal: JadwalKuliah) =>
  !selectedIds.has(jadwal.id) && (!!findConflict(jadwal) || wouldExceedQuota(jadwal));

// Daftar MK berisi semua semester prodi (mahasiswa bisa mengambil MK semester lain yang tertinggal).
// Filter semester (default: semester berjalan) membatasi yang tampil; pilihan yang sudah dicentang
// di semester lain tetap tersimpan. Jadwal yang belum ditandai semesternya ikut tampil di semester berjalan.
const SEMUA_SEMESTER = 'semua' as const;
// Default: semua semester prodi dibuka (mahasiswa bisa mengambil MK semester mana pun di prodinya).
const filterSemester = ref<number | typeof SEMUA_SEMESTER | null>(SEMUA_SEMESTER);
const semesterTampil = computed(() => filterSemester.value ?? semester.value);
const semesterOptions = computed(() => {
  const list = new Set(jadwalTersedia.value.map((j) => j.semester).filter((s): s is number => s != null));
  if (semester.value != null) list.add(semester.value);
  return [
    { value: SEMUA_SEMESTER, label: 'Semua semester' },
    ...[...list].sort((a, b) => a - b).map((s) => ({ value: s, label: s === semester.value ? `Semester ${s} (berjalan)` : `Semester ${s}` })),
  ];
});
const jadwalSemesterIni = computed(() => {
  const target = semesterTampil.value;
  if (target === SEMUA_SEMESTER) return jadwalTersedia.value;
  return jadwalTersedia.value.filter((j) => j.semester === target || (j.semester == null && target === semester.value));
});
const dipilihTersembunyi = computed(() => {
  const tampil = new Set(jadwalSemesterIni.value.map((j) => j.id));
  return [...selectedIds].filter((id) => !tampil.has(id)).length;
});
// "Pilih semua": ambil semua kelas semester ini yang bisa dipilih (dilewati bila bentrok / melebihi kuota SKS).
const allSelected = computed(
  () => jadwalSemesterIni.value.length > 0 && jadwalSemesterIni.value.every((j) => selectedIds.has(j.id))
);
const someSelected = computed(() => selectedIds.size > 0 && !allSelected.value);
const toggleSelectAll = () => {
  if (!isEditable.value) return;
  if (allSelected.value) {
    jadwalSemesterIni.value.forEach((j) => selectedIds.delete(j.id));
    return;
  }
  let dilewati = 0;
  jadwalSemesterIni.value.forEach((j) => {
    if (selectedIds.has(j.id)) return;
    if (findConflict(j) || wouldExceedQuota(j)) {
      dilewati += 1;
      return;
    }
    selectedIds.add(j.id);
  });
  if (dilewati) toastError(`${dilewati} mata kuliah tidak dipilih karena bentrok atau melebihi kuota SKS`);
};

// Satu langkah: simpan pilihan mata kuliah lalu langsung ajukan (tanpa tombol Simpan Draft).
const handleAjukan = async () => {
  if (!tahunAjaranAktif.value) return;
  if (!selectedIds.size) {
    toastError('Pilih minimal satu mata kuliah');
    return;
  }
  const confirmed = await confirmAction({
    title: 'Ajukan KRS?',
    text: `${selectedIds.size} mata kuliah (${totalSksDipilih.value} SKS) akan diajukan. Setelah diajukan, KRS tidak dapat diubah lagi kecuali ditolak oleh pembimbing akademik.`,
  });
  if (!confirmed) return;

  submitting.value = true;
  try {
    const draft = await mahasiswaKrsApi.saveDraft({
      tahunAjaranId: tahunAjaranAktif.value.id,
      jadwalKuliahIds: [...selectedIds],
    });
    currentKrs.value = await mahasiswaKrsApi.ajukan(draft.id);
    toastSuccess('KRS berhasil diajukan');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengajukan KRS'));
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">KRS</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Kartu Rencana Studi — pilih mata kuliah semester berjalan, atau mata kuliah semester lain di prodi Anda yang belum diambil / perlu diulang.</p>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ error }}
    </div>

    <div
      v-if="aksesKrsPesan"
      class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm flex items-start gap-2"
    >
      <span class="material-symbols-outlined" style="font-size: 18px">block</span>
      <span>{{ aksesKrsPesan }}</span>
    </div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium flex items-center justify-between flex-wrap gap-2">
        <span>Tahun Ajaran {{ formatTahunAjaran(tahunAjaranAktif) }}</span>
        <StatusBadge v-if="currentKrs" :label="STATUS_LABELS[currentKrs.status]" :variant="STATUS_VARIANT[currentKrs.status]" />
      </div>

      <div class="p-4 border-b border-outline-variant flex items-end gap-4 flex-wrap">
        <div>
          <span class="block font-medium text-label-md text-on-surface mb-2">Semester Ke-</span>
          <p class="px-3 py-2 rounded-md bg-surface-container text-body-md text-on-surface font-semibold min-w-16 text-center">
            {{ semester ?? '-' }}
          </p>
          <p v-if="statusMasuk" class="text-label-sm text-on-surface-variant mt-1">
            {{ isMahasiswaTransfer(statusMasuk) ? 'Mahasiswa Transfer' : 'Mahasiswa Baru' }} &middot; dihitung otomatis
          </p>
        </div>
        <p class="text-body-sm" :class="isOverQuota ? 'text-error font-medium' : 'text-on-surface-variant'">
          Total SKS dipilih: <strong class="text-on-surface">{{ totalSksDipilih }}</strong>
          <template v-if="kuota?.maxSks != null">
            dari maksimal <strong class="text-on-surface">{{ kuota.maxSks }} SKS</strong>
          </template>
        </p>
      </div>

      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>

      <AngketPelayananForm
        v-else-if="perluIsiAngket && tahunAjaranAktif && angket"
        :tahun-ajaran-id="tahunAjaranAktif.id"
        :pertanyaan="angket.pertanyaan"
        @submitted="angket = { ...angket, sudahDiisi: true, pertanyaan: [] }"
      />

      <div v-else class="divide-y divide-outline-variant">
        <div class="flex items-center justify-between flex-wrap gap-3 px-4 py-3">
          <label class="flex items-center gap-2 text-body-sm text-on-surface-variant">
            Tampilkan MK
            <select
              v-model="filterSemester"
              class="px-3 py-1.5 rounded-md border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface"
            >
              <option v-for="o in semesterOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>
          <span v-if="dipilihTersembunyi" class="text-label-sm text-on-surface-variant">
            + {{ dipilihTersembunyi }} mata kuliah dipilih dari semester lain
          </span>
        </div>
        <label
          v-if="isEditable && jadwalSemesterIni.length && semesterTampil !== SEMUA_SEMESTER"
          class="flex items-center gap-3 px-4 py-3 bg-surface-container-low cursor-pointer hover:bg-surface-container"
        >
          <input
            type="checkbox"
            :checked="allSelected"
            :indeterminate="someSelected"
            class="w-4 h-4"
            @change="toggleSelectAll"
          />
          <span class="text-body-md font-medium text-on-surface">Pilih Semua MK Semester {{ semesterTampil }}</span>
          <span class="text-body-sm text-on-surface-variant">({{ selectedIds.size }} mata kuliah dipilih)</span>
        </label>
        <label
          v-for="j in jadwalSemesterIni"
          :key="j.id"
          class="flex items-center gap-3 px-4 py-3"
          :class="
            !isEditable || isBlocked(j) ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-surface-container'
          "
        >
          <input
            type="checkbox"
            :checked="selectedIds.has(j.id)"
            :disabled="!isEditable || isBlocked(j)"
            class="w-4 h-4"
            @change="toggleSelect(j)"
          />
          <div class="flex-1">
            <p class="text-body-md text-on-surface font-medium">
              [{{ j.kodeMataKuliah }}] {{ j.namaMataKuliah }}
              <span class="text-body-sm text-on-surface-variant">({{ j.sks ?? 0 }} SKS)</span>
              <span
                v-if="j.semester != null"
                class="ml-2 inline-block px-2 py-0.5 rounded-full text-label-sm font-medium align-middle"
                :class="j.semester === semester ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'"
              >
                Smt {{ j.semester }}
              </span>
              <span
                v-if="j.mengulang"
                class="ml-2 inline-block px-2 py-0.5 rounded-full bg-warning-container text-on-warning-container text-label-sm font-medium align-middle"
              >
                Mengulang
              </span>
            </p>
            <p v-if="j.mengulang" class="text-label-sm text-on-surface-variant">
              <template v-if="j.mengulang.bedaKurikulum">
                Pengganti [{{ j.mengulang.kodeMataKuliah }}] {{ j.mengulang.namaMataKuliah }} (kurikulum lama) &middot;
              </template>
              Nilai sebelumnya {{ j.mengulang.grade }} di semester {{ j.mengulang.semester }} &middot; hanya nilai terbaik yang dihitung
            </p>
            <p class="text-body-sm text-on-surface-variant">
              Kelas {{ j.kelas }} &middot; {{ j.dosenKordinator?.namaLengkap ?? '-' }}
              <span v-if="j.ruangan">&middot; Ruang {{ j.ruangan }}</span>
            </p>
            <p v-if="!selectedIds.has(j.id) && findConflict(j)" class="text-label-sm text-error mt-0.5">
              {{ findConflict(j) }}
            </p>
          </div>
        </label>

        <p v-if="jadwalTersedia.length && !jadwalSemesterIni.length" class="p-8 text-center text-body-sm text-on-surface-variant">
          Tidak ada mata kuliah untuk semester ini. Pilih semester lain pada "Tampilkan MK".
        </p>
        <p v-if="!jadwalTersedia.length" class="p-8 text-center text-body-sm text-on-surface-variant">
          Belum ada jadwal kuliah prodi Anda yang tersedia pada tahun ajaran ini.
        </p>
      </div>

      <div v-if="!perluIsiAngket" class="p-4 border-t border-outline-variant flex justify-end gap-3">
        <AppButton v-if="isEditable" :disabled="submitting || isOverQuota || !selectedIds.size" @click="handleAjukan">
          {{ submitting ? 'Memproses...' : 'Ajukan KRS' }}
        </AppButton>
      </div>
    </section>
  </div>
</template>

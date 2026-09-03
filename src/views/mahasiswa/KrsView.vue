<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import {
  mahasiswaJadwalApi,
  mahasiswaKrsApi,
  mahasiswaSemesterApi,
  mahasiswaTahunAjaranApi,
  type KuotaSks,
} from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { toastSuccess, toastError, confirmAction } from '@/utils/swal';
import type { JadwalKuliah, Krs, StatusKrs, StatusMasukMahasiswa, TahunAjaran } from '@/types/entities';

const STATUS_LABELS: Record<StatusKrs, string> = {
  DRAFT: 'Draft',
  DIAJUKAN: 'Diajukan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
};
const STATUS_VARIANT: Record<StatusKrs, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  DIAJUKAN: 'warning',
  DISETUJUI: 'success',
  DITOLAK: 'danger',
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

const isEditable = computed(() => !currentKrs.value || currentKrs.value.status === 'DRAFT');

const totalSksDipilih = computed(() =>
  jadwalTersedia.value.filter((j) => selectedIds.has(j.id)).reduce((sum, j) => sum + (j.sks ?? 0), 0)
);

// null maxSks berarti belum ada riwayat nilai semester sebelumnya (mis. mahasiswa baru),
// jadi belum dibatasi — lihat pmb-be/src/utils/sksQuota.js.
const isOverQuota = computed(() => kuota.value?.maxSks != null && totalSksDipilih.value > kuota.value.maxSks);

const loadData = async () => {
  if (!tahunAjaranAktif.value || semester.value == null) return;
  loading.value = true;
  error.value = null;
  try {
    const [krsList, jadwal, kuotaSks] = await Promise.all([
      mahasiswaKrsApi.list({ tahunAjaranId: tahunAjaranAktif.value.id, semester: semester.value }),
      mahasiswaJadwalApi.listTersedia({ tahunAjaranId: tahunAjaranAktif.value.id, semester: semester.value }),
      mahasiswaKrsApi.kuota(semester.value),
    ]);
    currentKrs.value = krsList[0] ?? null;
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

onMounted(async () => {
  try {
    const [tahunAjaran, semesterBerjalan] = await Promise.all([
      mahasiswaTahunAjaranApi.aktif(),
      mahasiswaSemesterApi.berjalan(),
    ]);
    tahunAjaranAktif.value = tahunAjaran;
    semester.value = semesterBerjalan.semester;
    statusMasuk.value = semesterBerjalan.statusMasuk;
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
// ada tabrakan.
const findConflict = (jadwal: JadwalKuliah): string | null => {
  const other = selectedJadwal.value;
  const sameMataKuliah = other.find((j) =>
    jadwal.mataKuliahId != null ? j.mataKuliahId === jadwal.mataKuliahId : j.kodeMataKuliah === jadwal.kodeMataKuliah
  );
  if (sameMataKuliah) {
    return `Sudah memilih kelas lain untuk mata kuliah ${sameMataKuliah.namaMataKuliah}`;
  }

  const bentrok = other.find(
    (j) =>
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

const handleSaveDraft = async () => {
  if (!tahunAjaranAktif.value) return;
  submitting.value = true;
  try {
    currentKrs.value = await mahasiswaKrsApi.saveDraft({
      tahunAjaranId: tahunAjaranAktif.value.id,
      jadwalKuliahIds: [...selectedIds],
    });
    toastSuccess('Draft KRS berhasil disimpan');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan draft KRS'));
  } finally {
    submitting.value = false;
  }
};

const handleAjukan = async () => {
  if (!currentKrs.value) return;
  const confirmed = await confirmAction({
    title: 'Ajukan KRS?',
    text: 'Setelah diajukan, KRS tidak dapat diubah lagi kecuali ditolak oleh pembimbing akademik.',
  });
  if (!confirmed) return;

  submitting.value = true;
  try {
    currentKrs.value = await mahasiswaKrsApi.ajukan(currentKrs.value.id);
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
      <p class="text-body-md text-on-surface-variant mt-1">Kartu Rencana Studi — pilih mata kuliah untuk semester berjalan.</p>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ error }}
    </div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium flex items-center justify-between flex-wrap gap-2">
        <span>Tahun Ajaran {{ tahunAjaranAktif?.nama ?? '-' }}</span>
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
            (IP semester lalu {{ kuota.ipSemesterSebelumnya?.toFixed(2) }})
          </template>
        </p>
      </div>

      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>

      <div v-else class="divide-y divide-outline-variant">
        <label
          v-for="j in jadwalTersedia"
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

        <p v-if="!jadwalTersedia.length" class="p-8 text-center text-body-sm text-on-surface-variant">
          Belum ada jadwal kuliah tersedia untuk tahun ajaran &amp; semester ini.
        </p>
      </div>

      <div class="p-4 border-t border-outline-variant flex justify-end gap-3">
        <AppButton v-if="isEditable" variant="secondary" :disabled="submitting" @click="handleSaveDraft">
          {{ submitting ? 'Menyimpan...' : 'Simpan Draft' }}
        </AppButton>
        <AppButton v-if="isEditable && currentKrs" :disabled="submitting || isOverQuota" @click="handleAjukan">
          {{ submitting ? 'Memproses...' : 'Ajukan KRS' }}
        </AppButton>
      </div>
    </section>
  </div>
</template>

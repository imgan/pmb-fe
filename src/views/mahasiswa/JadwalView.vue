<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import {
  mahasiswaKrsApi,
  mahasiswaPresensiApi,
  mahasiswaTahunAjaranApi,
  type RealisasiJadwalMahasiswa,
  type RealisasiPertemuan,
  type StatusPresensiMahasiswa,
} from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';
import type { Krs, KrsDetail, TahunAjaran } from '@/types/entities';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';

const tahunAjaranAktif = ref<TahunAjaran | null>(null);
const krsList = ref<Krs[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const HARI_LABEL: Record<string, string> = {
  SENIN: 'Senin',
  SELASA: 'Selasa',
  RABU: 'Rabu',
  KAMIS: 'Kamis',
  JUMAT: 'Jumat',
  SABTU: 'Sabtu',
  MINGGU: 'Minggu',
};

const jadwalList = computed(() =>
  krsList.value.flatMap((krs) => krs.detailList ?? []).filter((d) => d.kelasKuliah)
);

onMounted(async () => {
  try {
    tahunAjaranAktif.value = await mahasiswaTahunAjaranApi.aktif();
    krsList.value = await mahasiswaKrsApi.list(
      tahunAjaranAktif.value ? { tahunAjaranId: tahunAjaranAktif.value.id } : {}
    );
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat jadwal kuliah');
  } finally {
    loading.value = false;
  }
});

// ---- Detail: realisasi dosen mengajar per pertemuan + presensi mandiri ----
const detailOpen = ref(false);
const detailLoading = ref(false);
const detailError = ref<string | null>(null);
const detail = ref<RealisasiJadwalMahasiswa | null>(null);
const activeJadwalId = ref<number | null>(null);
const submittingId = ref<number | null>(null);

const openDetail = async (d: KrsDetail) => {
  activeJadwalId.value = d.jadwalKuliahId;
  detailOpen.value = true;
  detailLoading.value = true;
  detailError.value = null;
  detail.value = null;
  try {
    detail.value = await mahasiswaPresensiApi.realisasi(d.jadwalKuliahId);
  } catch (err) {
    detailError.value = extractErrorMessage(err, 'Gagal memuat realisasi perkuliahan');
  } finally {
    detailLoading.value = false;
  }
};

const handleHadir = async (p: RealisasiPertemuan) => {
  if (!activeJadwalId.value) return;
  submittingId.value = p.kehadiranDosenId;
  try {
    detail.value = await mahasiswaPresensiApi.hadir(activeJadwalId.value, p.kehadiranDosenId);
    toastSuccess(`Kehadiran pertemuan ke-${p.pertemuanKe} tercatat`);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mencatat kehadiran'));
  } finally {
    submittingId.value = null;
  }
};

const STATUS_DOSEN: Record<RealisasiPertemuan['statusDosen'], { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  HADIR: { label: 'Mengajar', variant: 'success' },
  TIDAK_HADIR: { label: 'Tidak Hadir', variant: 'danger' },
  IZIN: { label: 'Izin', variant: 'warning' },
  SAKIT: { label: 'Sakit', variant: 'neutral' },
};
const STATUS_SAYA: Record<StatusPresensiMahasiswa, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  HADIR: { label: 'Hadir', variant: 'success' },
  IZIN: { label: 'Izin', variant: 'warning' },
  SAKIT: { label: 'Sakit', variant: 'neutral' },
  ALPA: { label: 'Alpa', variant: 'danger' },
};

const formatTanggal = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const formatJam = (masuk: string | null, keluar: string | null) =>
  masuk || keluar ? `${masuk?.slice(0, 5) ?? '?'} - ${keluar?.slice(0, 5) ?? '?'}` : '-';
const persenHadir = computed(() => {
  const r = detail.value?.ringkasan;
  return r && r.pertemuan ? Math.round((r.hadir / r.pertemuan) * 100) : 0;
});
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Jadwal Kuliah</h1>
      <p class="text-body-md text-on-surface-variant mt-1">
        Jadwal kuliah berdasarkan KRS Anda pada tahun ajaran {{ formatTahunAjaran(tahunAjaranAktif) }}.
      </p>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ error }}
    </div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Jadwal Kuliah</div>

      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>

      <div v-else class="divide-y divide-outline-variant">
        <div v-for="d in jadwalList" :key="d.id" class="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-body-md text-on-surface font-medium">
              [{{ d.kelasKuliah?.kodeMataKuliah }}] {{ d.kelasKuliah?.namaMataKuliah }}
              <span class="text-body-sm text-on-surface-variant">({{ d.kelasKuliah?.sks ?? 0 }} SKS)</span>
            </p>
            <p class="text-body-sm text-on-surface-variant">
              Kelas {{ d.kelasKuliah?.kelas }} &middot; {{ d.kelasKuliah?.dosenKordinator?.namaLengkap ?? '-' }}
            </p>
            <p class="text-body-sm text-on-surface-variant">
              {{ (d.kelasKuliah?.hari ?? []).map((h) => HARI_LABEL[h] ?? h).join(', ') || '-' }}
              <span v-if="d.kelasKuliah?.jam">&middot; Jam ke-{{ d.kelasKuliah.jam }}</span>
              <span v-if="d.kelasKuliah?.ruangan">&middot; Ruang {{ d.kelasKuliah.ruangan }}</span>
            </p>
          </div>
          <AppButton variant="secondary" icon="fact_check" @click="openDetail(d)">Detail</AppButton>
        </div>

        <p v-if="!jadwalList.length" class="p-8 text-center text-body-sm text-on-surface-variant">
          Belum ada jadwal kuliah. Silakan isi KRS terlebih dahulu.
        </p>
      </div>
    </section>

    <Modal
      v-model="detailOpen"
      size="lg"
      title="Realisasi Perkuliahan"
      :subtitle="
        detail
          ? `[${detail.jadwal.kodeMataKuliah}] ${detail.jadwal.namaMataKuliah} · Kelas ${detail.jadwal.kelas} · ${detail.jadwal.dosen ?? '-'}`
          : undefined
      "
    >
      <div v-if="detailLoading" class="py-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <div v-else-if="detailError" class="p-3 rounded-md text-body-sm text-error bg-error-container">{{ detailError }}</div>
      <template v-else-if="detail">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div class="p-3 rounded-lg bg-surface-container">
            <p class="text-label-sm text-on-surface-variant">Pertemuan</p>
            <p class="text-headline-md font-semibold tabular-nums">{{ detail.ringkasan.pertemuan }}</p>
          </div>
          <div class="p-3 rounded-lg bg-surface-container">
            <p class="text-label-sm text-on-surface-variant">Hadir</p>
            <p class="text-headline-md font-semibold tabular-nums">{{ detail.ringkasan.hadir }}</p>
          </div>
          <div class="p-3 rounded-lg bg-surface-container">
            <p class="text-label-sm text-on-surface-variant">Izin / Sakit</p>
            <p class="text-headline-md font-semibold tabular-nums">{{ detail.ringkasan.izinSakit }}</p>
          </div>
          <div class="p-3 rounded-lg bg-surface-container">
            <p class="text-label-sm text-on-surface-variant">Kehadiran</p>
            <p class="text-headline-md font-semibold tabular-nums">{{ persenHadir }}%</p>
          </div>
        </div>

        <p v-if="detail.krsStatus !== 'DISETUJUI'" class="mb-3 px-3 py-2 rounded-md bg-warning-container text-on-warning-container text-body-sm">
          KRS Anda belum disetujui, jadi presensi belum bisa diisi.
        </p>

        <p v-if="!detail.pertemuan.length" class="py-8 text-center text-body-sm text-on-surface-variant">
          Dosen belum mencatat realisasi pertemuan untuk kelas ini.
        </p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-body-sm">
            <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
              <tr>
                <th class="p-3 text-center">Ke</th>
                <th class="p-3">Tanggal / Jam</th>
                <th class="p-3">Dosen & Materi</th>
                <th class="p-3 text-center">Dosen</th>
                <th class="p-3 text-center">Kehadiran</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant text-on-surface">
              <tr v-for="p in detail.pertemuan" :key="p.kehadiranDosenId">
                <td class="p-3 text-center tabular-nums">{{ p.pertemuanKe }}</td>
                <td class="p-3 whitespace-nowrap">
                  {{ formatTanggal(p.tanggal) }}
                  <span class="block text-label-sm text-on-surface-variant tabular-nums">{{ formatJam(p.jamMasuk, p.jamKeluar) }}</span>
                </td>
                <td class="p-3">
                  <span class="font-medium">{{ p.dosen ?? '-' }}</span>
                  <span class="block text-label-sm text-on-surface-variant">{{ p.materi || p.keteranganDosen || '-' }}</span>
                </td>
                <td class="p-3 text-center"><StatusBadge v-bind="STATUS_DOSEN[p.statusDosen]" /></td>
                <td class="p-3 text-center">
                  <StatusBadge v-if="p.statusSaya" v-bind="STATUS_SAYA[p.statusSaya]" />
                  <AppButton
                    v-else-if="p.bisaPresensi"
                    icon="how_to_reg"
                    :disabled="submittingId === p.kehadiranDosenId"
                    @click="handleHadir(p)"
                  >
                    {{ submittingId === p.kehadiranDosenId ? 'Menyimpan...' : 'Hadir' }}
                  </AppButton>
                  <span v-else class="text-label-sm text-on-surface-variant">{{ p.alasanTidakBisa ?? '-' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-3 text-label-sm text-on-surface-variant">
          Tombol Hadir hanya tersedia selama kelas berlangsung. Setelah dosen menekan Selesai, presensi ditutup dan yang belum presensi tercatat Alpa.
        </p>
      </template>
    </Modal>
  </div>
</template>

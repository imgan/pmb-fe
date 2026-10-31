<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PublicHeader from '@/components/public/PublicHeader.vue';
import PublicFooter from '@/components/public/PublicFooter.vue';
import PesertaSidebar from '@/components/public/PesertaSidebar.vue';
import { usePesertaAuthStore } from '@/stores/pesertaAuth';
import { pesertaAuthApi, type PesertaTesUjian } from '@/api/pesertaAuth';
import { extractErrorMessage } from '@/api/http';
import { formatDate, formatDateTime } from '@/utils/format';

/**
 * Tes Ujian (portal peserta): jadwal tes yang ditetapkan panitia di menu Tes Ujian admin. Nantinya peserta mengerjakan
 * soal pilihan ganda dan essay di sini; bank soal diinput dari CBT.
 */
const pesertaAuthStore = usePesertaAuthStore();

const statusUjian = computed(() => {
  const s = pesertaAuthStore.peserta?.statusUjian;
  if (s === 'lulus') return { label: 'Lulus', cls: 'bg-success-container text-on-success-container' };
  if (s === 'tidak_lulus') return { label: 'Tidak Lulus', cls: 'bg-danger-container text-on-danger-container' };
  return { label: 'Belum Ujian', cls: 'bg-warning-container text-on-warning-container' };
});

const jadwal = ref<PesertaTesUjian[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
onMounted(async () => {
  try {
    jadwal.value = await pesertaAuthApi.listMyTesUjian();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat jadwal tes ujian');
  } finally {
    loading.value = false;
  }
});

// Tanggal hari ini (WIB) dalam format YYYY-MM-DD, untuk dibandingkan dengan tanggal tes.
const hariIni = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

const badgeJadwal = (t: PesertaTesUjian) => {
  if (t.status === 'lulus') return { label: 'Lulus', cls: 'bg-success-container text-on-success-container' };
  if (t.status === 'tidak_lulus') return { label: 'Tidak Lulus', cls: 'bg-danger-container text-on-danger-container' };
  const tgl = t.tanggal.slice(0, 10);
  if (tgl === hariIni) return { label: 'Hari Ini', cls: 'bg-primary text-on-primary' };
  if (tgl < hariIni) return { label: 'Menunggu Hasil', cls: 'bg-surface-container text-on-surface-variant' };
  return { label: 'Terjadwal', cls: 'bg-warning-container text-on-warning-container' };
};

const jenisSoal = [
  { icon: 'radio_button_checked', judul: 'Pilihan Ganda', ket: 'Pilih satu jawaban yang paling tepat untuk setiap soal.' },
  { icon: 'edit_note', judul: 'Essay', ket: 'Tulis jawaban uraian sesuai pertanyaan.' },
];
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <PublicHeader />

    <!-- Grid: judul di atas kolom isi, menu kiri & isi mulai di garis yang sama. -->
    <div class="flex-1 w-full max-w-6xl mx-auto px-4 md:px-12 py-10 md:py-16 grid md:grid-cols-[15rem_minmax(0,1fr)] gap-x-10 gap-y-6 md:gap-y-0 content-start">
      <div class="md:col-start-2 w-full max-w-3xl text-center md:mb-10">
        <h1 class="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary mb-3">Tes Ujian</h1>
        <p class="text-body-md text-on-surface-variant max-w-xl mx-auto">
          Kerjakan tes seleksi masuk secara online sesuai jadwal yang ditentukan panitia PMB.
        </p>
      </div>
      <PesertaSidebar class="md:row-start-2 self-start" />
      <main class="md:row-start-2 min-w-0 w-full max-w-3xl space-y-4">
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5 md:p-6">
          <div class="flex items-center justify-between gap-3 mb-4">
            <p class="text-body-lg font-semibold text-on-background">Jadwal Tes Ujian</p>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-label-sm" :class="statusUjian.cls">
              {{ statusUjian.label }}
            </span>
          </div>
          <p v-if="loading" class="py-8 text-center text-body-sm text-on-surface-variant">Memuat jadwal tes...</p>
          <div v-else-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

          <div v-else-if="jadwal.length" class="space-y-3">
            <div v-for="t in jadwal" :key="t.id" class="border border-outline-variant rounded-lg p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-body-md font-semibold text-on-surface">{{ t.namaUjian }}</p>
                  <p class="text-label-sm text-on-surface-variant mt-0.5">{{ t.gelombang ?? '-' }} · {{ t.prodi || 'Semua Jurusan' }}</p>
                </div>
                <span class="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-label-sm" :class="badgeJadwal(t).cls">
                  {{ badgeJadwal(t).label }}
                </span>
              </div>
              <dl class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-body-sm">
                <div class="flex items-start gap-2">
                  <span class="material-symbols-outlined text-primary" style="font-size: 20px">calendar_today</span>
                  <div><dt class="text-label-sm text-on-surface-variant">Tanggal</dt><dd class="text-on-surface">{{ formatDate(t.tanggal) }}</dd></div>
                </div>
                <div class="flex items-start gap-2">
                  <span class="material-symbols-outlined text-primary" style="font-size: 20px">schedule</span>
                  <div><dt class="text-label-sm text-on-surface-variant">Waktu</dt><dd class="text-on-surface">{{ t.waktu || '-' }}</dd></div>
                </div>
                <div class="flex items-start gap-2">
                  <span class="material-symbols-outlined text-primary" style="font-size: 20px">location_on</span>
                  <div><dt class="text-label-sm text-on-surface-variant">Lokasi</dt><dd class="text-on-surface whitespace-pre-line">{{ t.lokasi || '-' }}</dd></div>
                </div>
              </dl>
              <!-- Nilai baru ditampilkan setelah panitia menetapkan hasil (essay perlu dikoreksi dulu). -->
              <p v-if="t.nilai !== null && t.status !== 'belum_ujian'" class="mt-3 text-body-sm text-on-surface">Nilai: <span class="font-semibold tabular-nums">{{ t.nilai }}</span></p>
              <div v-if="t.status === 'belum_ujian'" class="mt-4">
                <p v-if="t.ujianOnline" class="mb-2 text-label-sm text-on-surface-variant">
                  Ujian online: {{ t.ujianOnline.pg }} soal pilihan ganda, {{ t.ujianOnline.essay }} soal essay ·
                  {{ t.ujianOnline.durasiMenit ? `${t.ujianOnline.durasiMenit} menit` : 'tanpa batas waktu' }}
                </p>
                <p v-if="t.pengerjaan === 'SELESAI'" class="inline-flex items-center gap-1.5 text-body-sm text-success font-medium">
                  <span class="material-symbols-outlined" style="font-size: 18px">check_circle</span>
                  Jawaban terkirim {{ formatDateTime(t.selesaiAt) }}. Menunggu hasil dari panitia.
                </p>
                <div v-else class="flex flex-col sm:flex-row sm:items-center gap-2">
                  <RouterLink
                    v-if="t.bisaDikerjakan"
                    :to="{ name: 'pendaftaran-tes-ujian-kerjakan', params: { id: t.id } }"
                    class="inline-flex justify-center px-6 py-2.5 rounded-lg bg-primary text-on-primary text-label-md font-semibold hover:opacity-90"
                  >
                    {{ t.pengerjaan === 'MENGERJAKAN' ? 'Lanjutkan Ujian' : 'Mulai Ujian' }}
                  </RouterLink>
                  <button v-else type="button" disabled class="px-6 py-2.5 rounded-lg bg-primary text-on-primary text-label-md font-semibold opacity-50 cursor-not-allowed">
                    Mulai Ujian
                  </button>
                  <p class="text-label-sm text-on-surface-variant">
                    {{
                      !t.ujianOnline
                        ? 'Tes ini tidak memakai soal online. Ikuti tes sesuai jadwal & lokasi di atas.'
                        : t.bisaDikerjakan
                          ? 'Pastikan koneksi stabil. Jawaban tersimpan otomatis.'
                          : 'Tombol aktif pada tanggal tes.'
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="flex flex-col items-center text-center py-8 gap-3">
            <span class="material-symbols-outlined text-primary" style="font-size: 48px">quiz</span>
            <p class="text-body-lg font-semibold text-on-surface">Belum ada jadwal tes</p>
            <p class="text-body-sm text-on-surface-variant max-w-md">
              Jadwal tes akan muncul di halaman ini setelah Anda didaftarkan sebagai peserta ujian oleh panitia PMB. Pantau terus halaman ini dan Status Pendaftaran Anda.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="j in jenisSoal"
            :key="j.judul"
            class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-5 flex items-start gap-3"
          >
            <span class="material-symbols-outlined text-primary">{{ j.icon }}</span>
            <div>
              <p class="text-body-md font-semibold text-on-surface">{{ j.judul }}</p>
              <p class="text-body-sm text-on-surface-variant mt-1">{{ j.ket }}</p>
            </div>
          </div>
        </div>
      </main>
    </div>

    <PublicFooter />
  </div>
</template>

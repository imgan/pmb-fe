<script setup lang="ts">
import { computed } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import LmsFilterBar from '@/components/lms/LmsFilterBar.vue';
import ProgresBar from '@/components/lms/ProgresBar.vue';
import TrenMingguan from '@/components/lms/TrenMingguan.vue';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import { useLmsData } from '@/composables/useLmsFilter';
import { lmsConsoleApi, type LmsDashboard } from '@/api/lmsConsole';
import { materialIcon } from '@/utils/icons';
import { JENIS_KONTEN, teksAngka, waktuRelatif } from '@/utils/lmsKonten';
import { MENU } from '@/constants/menuCodes';

/**
 * Dashboard konsol LMS: ringkasan e-learning seluruh kampus pada tahun akademik terpilih (kelas berkonten, konten
 * per jenis, mahasiswa & dosen aktif, penyelesaian, nilai kuis/tugas), tren 12 minggu, kelas teraktif, dan
 * aktivitas terbaru dosen & mahasiswa.
 */
const authStore = useAuthStore();
const menuStore = useMenuStore();
const { data, loading, error } = useLmsData<LmsDashboard>(lmsConsoleApi.dashboard, undefined, 'Gagal memuat dashboard LMS');

const r = computed(() => data.value?.ringkasan);
const kartu = computed(() =>
  r.value
    ? [
        { icon: 'cast_for_education', label: 'Kelas berkonten', nilai: `${r.value.kelasDenganKonten}`, sub: `dari ${r.value.kelas} kelas aktif` },
        { icon: 'library_books', label: 'Konten terbit', nilai: `${r.value.totalKonten}`, sub: r.value.draf ? `${r.value.draf} draf` : 'tanpa draf' },
        { icon: 'groups', label: 'Mahasiswa aktif', nilai: `${r.value.mahasiswaAktif}`, sub: `${r.value.dosenAktif} dosen mengunggah konten` },
        { icon: 'task_alt', label: 'Penyelesaian', nilai: r.value.penyelesaian == null ? '–' : `${teksAngka(r.value.penyelesaian)}%`, sub: 'konten selesai dari penugasan' },
      ]
    : []
);
const trenKonten = computed(() => (data.value?.tren ?? []).map((t) => ({ awal: t.awal, nilai: t.konten })));
const trenAktivitas = computed(() => (data.value?.tren ?? []).map((t) => ({ awal: t.awal, nilai: t.aktivitas })));

const JENIS_LIST = (['materi', 'video', 'kuis', 'tugas'] as const).map((kunci) => ({ kunci, meta: JENIS_KONTEN[kunci.toUpperCase() as keyof typeof JENIS_KONTEN] }));

const AKSI: Record<string, string> = {
  KONTEN: 'mengunggah',
  KUIS: 'mengerjakan kuis',
  TUGAS: 'mengumpulkan tugas',
  SELESAI: 'menyelesaikan',
  KOMENTAR: 'mengomentari',
};

const KETERANGAN: Record<string, string> = {
  [MENU.LMS_KELAS_MANAGEMENT]: 'Pantau tiap kelas: konten, keaktifan & progres peserta.',
  [MENU.LMS_MATERI_MANAGEMENT]: 'Materi & video yang diunggah dosen beserta statistik dilihat.',
  [MENU.LMS_TUGAS_MANAGEMENT]: 'Pengumpulan, keterlambatan & penilaian tugas.',
  [MENU.LMS_KUIS_MANAGEMENT]: 'Pengerjaan & rata-rata skor kuis/ujian daring.',
  [MENU.LMS_FORUM_MANAGEMENT]: 'Diskusi dosen & mahasiswa di setiap konten.',
  [MENU.LMS_PENGUMUMAN_MANAGEMENT]: 'Berita kampus yang tampil di timeline e-learning.',
  [MENU.LMS_LAPORAN_MANAGEMENT]: 'Rekap aktivitas per prodi & per kelas, export Excel.',
};
const pintasan = computed(() => menuStore.treeFor('lms').filter((m) => m.code !== MENU.LMS_DASHBOARD && m.path));
</script>

<template>
  <div>
    <PageHeader title="Dashboard LMS" :subtitle="`Selamat datang, ${authStore.user?.name ?? 'Pengguna'} — pemantauan e-learning seluruh kampus.`" />
    <LmsFilterBar :cari="false" />

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-if="loading && !data" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat...</div>

    <template v-if="data && r">
      <!-- Kartu ringkasan -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6" :class="{ 'opacity-60': loading }">
        <div v-for="k in kartu" :key="k.label" class="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <div class="flex items-center gap-2 text-on-surface-variant text-label-md">
            <span class="material-symbols-outlined text-primary" style="font-size: 20px">{{ k.icon }}</span>{{ k.label }}
          </div>
          <p class="mt-2 text-[2rem] leading-none font-bold text-on-surface tabular-nums">{{ k.nilai }}</p>
          <p class="mt-1.5 text-label-sm text-on-surface-variant">{{ k.sub }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <!-- Tren -->
        <section class="xl:col-span-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 class="text-headline-sm font-semibold text-on-surface mb-4">Tren mingguan</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TrenMingguan judul="Konten diunggah dosen" satuan="konten" :data="trenKonten" />
            <TrenMingguan judul="Aktivitas mahasiswa" satuan="aktivitas" :data="trenAktivitas" />
          </div>
          <p class="mt-3 text-label-sm text-on-surface-variant">Aktivitas = menyelesaikan materi/video, mengerjakan kuis, mengumpulkan tugas, dan berkomentar.</p>
        </section>

        <!-- Konten per jenis & kualitas -->
        <section class="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 class="text-headline-sm font-semibold text-on-surface mb-4">Konten & penilaian</h2>
          <div class="grid grid-cols-2 gap-3">
            <div v-for="j in JENIS_LIST" :key="j.kunci" class="flex items-center gap-3 rounded-lg border border-outline-variant p-3">
              <span class="material-symbols-outlined rounded-md p-1.5" :class="j.meta.kelas" style="font-size: 20px">{{ j.meta.icon }}</span>
              <div>
                <p class="text-headline-sm font-bold text-on-surface leading-none tabular-nums">{{ r.konten[j.kunci] }}</p>
                <p class="text-label-sm text-on-surface-variant mt-1">{{ j.meta.label }}</p>
              </div>
            </div>
          </div>
          <dl class="mt-4 divide-y divide-outline-variant text-body-sm">
            <div class="flex justify-between py-2"><dt class="text-on-surface-variant">Rata-rata skor kuis</dt><dd class="font-semibold text-on-surface">{{ teksAngka(r.rataKuis) }}</dd></div>
            <div class="flex justify-between py-2"><dt class="text-on-surface-variant">Rata-rata nilai tugas</dt><dd class="font-semibold text-on-surface">{{ teksAngka(r.rataTugas) }}</dd></div>
            <div class="flex justify-between py-2">
              <dt class="text-on-surface-variant">Tugas belum dinilai</dt>
              <dd class="font-semibold" :class="r.tugasBelumDinilai ? 'text-[#b45309]' : 'text-on-surface'">{{ r.tugasBelumDinilai }}</dd>
            </div>
            <div class="flex justify-between py-2"><dt class="text-on-surface-variant">Komentar · suka</dt><dd class="font-semibold text-on-surface">{{ r.komentar }} · {{ r.suka }}</dd></div>
          </dl>
        </section>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <!-- Kelas teraktif -->
        <section class="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-headline-sm font-semibold text-on-surface">Kelas dengan penyelesaian tertinggi</h2>
            <RouterLink :to="{ name: 'lms-kelas' }" class="text-label-md font-semibold text-primary hover:underline">Semua kelas →</RouterLink>
          </div>
          <p v-if="!data.kelasTeraktif.length" class="py-6 text-center text-body-sm text-on-surface-variant">Belum ada kelas yang memiliki konten e-learning.</p>
          <RouterLink
            v-for="k in data.kelasTeraktif"
            :key="k.id"
            :to="{ name: 'lms-kelas-detail', params: { id: k.id } }"
            class="flex items-center gap-4 py-3 border-t border-outline-variant first:border-t-0 hover:bg-surface-container-low -mx-2 px-2 rounded-md"
          >
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-on-surface truncate">{{ k.namaMataKuliah }} <span class="font-normal text-on-surface-variant">· {{ k.kelas }}</span></p>
              <p class="text-label-sm text-on-surface-variant truncate">{{ k.dosen ?? '-' }} · {{ k.totalKonten }} konten · {{ k.mahasiswaAktif }}/{{ k.peserta }} mahasiswa aktif</p>
            </div>
            <div class="w-40 shrink-0"><ProgresBar :nilai="k.penyelesaian" /></div>
          </RouterLink>
          <p v-if="data.kelasTanpaKonten" class="mt-3 flex items-center gap-2 rounded-md bg-surface-container px-3 py-2 text-label-md text-on-surface-variant">
            <span class="material-symbols-outlined text-[#b45309]" style="font-size: 18px">info</span>
            {{ data.kelasTanpaKonten }} kelas belum memiliki konten e-learning.
            <RouterLink :to="{ name: 'lms-kelas', query: { status: 'KOSONG' } }" class="ml-auto font-semibold text-primary hover:underline">Lihat</RouterLink>
          </p>
        </section>

        <!-- Aktivitas terbaru -->
        <section class="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 class="text-headline-sm font-semibold text-on-surface mb-3">Aktivitas terbaru</h2>
          <p v-if="!data.aktivitasTerbaru.length" class="py-6 text-center text-body-sm text-on-surface-variant">Belum ada aktivitas.</p>
          <ul class="space-y-3">
            <li v-for="(a, i) in data.aktivitasTerbaru" :key="i" class="flex items-start gap-3">
              <span
                class="mt-0.5 w-8 h-8 shrink-0 rounded-full flex items-center justify-center"
                :class="a.peran === 'DOSEN' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'"
              >
                <span class="material-symbols-outlined" style="font-size: 18px">{{ a.peran === 'DOSEN' ? 'co_present' : 'person' }}</span>
              </span>
              <div class="min-w-0 text-body-sm">
                <p class="text-on-surface">
                  <span class="font-semibold">{{ a.pelaku ?? '-' }}</span> {{ AKSI[a.tipe] }}
                  <span v-if="a.konten" class="font-medium">“{{ a.konten.judul }}”</span>
                </p>
                <p class="text-label-sm text-on-surface-variant truncate">
                  <span v-if="a.konten">{{ JENIS_KONTEN[a.konten.jenis].label }} · </span>{{ a.kelas ? `${a.kelas.namaMataKuliah} ${a.kelas.kelas}` : '' }} · {{ waktuRelatif(a.waktu) }}
                </p>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </template>

    <!-- Pintasan menu -->
    <h2 class="text-headline-sm font-semibold text-on-surface mb-3">Menu LMS</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <RouterLink
        v-for="m in pintasan"
        :key="m.id"
        :to="`/lms${m.path}`"
        class="group rounded-lg border border-outline-variant bg-surface-container-lowest p-4 hover:border-primary hover:shadow-sm transition"
      >
        <div class="flex items-center gap-3 mb-1.5">
          <span class="material-symbols-outlined text-primary bg-primary-container/60 rounded-lg p-2" style="font-size: 20px">{{ materialIcon(m.icon) }}</span>
          <span class="font-semibold text-on-surface group-hover:text-primary">{{ m.name }}</span>
        </div>
        <p class="text-body-sm text-on-surface-variant">{{ KETERANGAN[m.code] ?? '' }}</p>
      </RouterLink>
    </div>
  </div>
</template>

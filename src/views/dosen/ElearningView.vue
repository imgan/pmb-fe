<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import ElearningShell from '@/components/elearning/ElearningShell.vue';
import KontenCard from '@/components/elearning/KontenCard.vue';
import KontenCarousel from '@/components/elearning/KontenCarousel.vue';
import KontenPreviewModal from '@/components/elearning/KontenPreviewModal.vue';
import KontenFormModal from '@/components/elearning/KontenFormModal.vue';
import BagikanPanel from '@/components/elearning/BagikanPanel.vue';
import TimelinePost from '@/components/elearning/TimelinePost.vue';
import Modal from '@/components/ui/Modal.vue';
import { dosenElearningApi, type ElearningKelas, type JenisKonten, type KontenRingkas, type PesertaKelas } from '@/api/elearning';
import { dosenPengumumanApi, type PengumumanDosen } from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import { dosenTahunAkademikStorage } from '@/api/dosenHttp';
import { formatDate } from '@/utils/format';
import MataKuliahIlustrasi from '@/components/elearning/MataKuliahIlustrasi.vue';
import { toastError } from '@/utils/swal';

/**
 * Portal Dosen → Perkuliahan → E-learning: kartu kelas yang diampu (tahun akademik terpilih) dan katalog konten
 * — satu baris kartu (bisa digeser) per kelas, bergaya katalog kursus. Klik kartu = pratinjau; Ubah = form konten.
 */
const router = useRouter();
const kelas = ref<ElearningKelas[]>([]);
const katalog = ref<{ kelas: Omit<ElearningKelas, 'semester' | 'jumlah'>; konten: KontenRingkas[] }[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const tahunAkademik = dosenTahunAkademikStorage.get();

const load = async () => {
  loading.value = true;
  try {
    [kelas.value, katalog.value] = await Promise.all([dosenElearningApi.kelas(), dosenElearningApi.kontenSaya()]);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat e-learning');
  } finally {
    loading.value = false;
  }
};
// Berita kampus = pengumuman BAAK yang tayang untuk dosen (gagal dimuat tidak mengganggu halaman).
const berita = ref<PengumumanDosen[]>([]);
onMounted(async () => {
  load();
  try {
    berita.value = await dosenPengumumanApi.list();
  } catch {
    berita.value = [];
  }
});

/** Isi pengumuman berupa HTML (editor teks kaya) → teks biasa untuk cuplikan timeline. */
const teksBiasa = (html: string) => {
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
};

/** "8 hari lalu" untuk berita / item timeline. */
const relatif = (iso: string) => {
  const hari = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (hari <= 0) return 'hari ini';
  if (hari === 1) return 'kemarin';
  return hari < 30 ? `${hari} hari lalu` : formatDate(iso);
};

// ---- Timeline beranda: konten kelas + berita kampus, terbaru di atas ----
const filterTimeline = ref<'semua' | 'kelas' | 'berita'>('semua');
type ItemTimeline =
  | { tipe: 'konten'; key: string; waktu: string; konten: KontenRingkas; mataKuliah: string; kelasNama: string }
  | { tipe: 'berita'; key: string; waktu: string; berita: PengumumanDosen };
const BATAS_TIMELINE = 15;
const timeline = computed<ItemTimeline[]>(() => {
  const konten: ItemTimeline[] = katalog.value.flatMap((g) =>
    g.konten.map((k) => ({ tipe: 'konten' as const, key: `k${k.id}`, waktu: k.createdAt, konten: k, mataKuliah: g.kelas.namaMataKuliah, kelasNama: g.kelas.kelas })),
  );
  const brt: ItemTimeline[] = berita.value.map((b) => ({ tipe: 'berita' as const, key: `b${b.id}`, waktu: b.tanggalTerbit, berita: b }));
  const sumber = filterTimeline.value === 'kelas' ? konten : filterTimeline.value === 'berita' ? brt : [...konten, ...brt];
  return sumber.sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime()).slice(0, BATAS_TIMELINE);
});
const beritaOpen = ref(false);
const beritaDipilih = ref<PengumumanDosen | null>(null);
const bukaBerita = (b: PengumumanDosen) => {
  beritaDipilih.value = b;
  beritaOpen.value = true;
};

// ---- Bagikan: pilih kelas lalu buka form konten baru ----
const pilihKelasOpen = ref(false);
const jenisBaru = ref<JenisKonten>('MATERI');
const buatBaru = ref<{ jadwalKuliahId: number; peserta: PesertaKelas[] } | null>(null);
const formBaruOpen = ref(false);
const mulaiBuat = (jenis: JenisKonten) => {
  jenisBaru.value = jenis;
  if (kelas.value.length === 1) return pilihKelas(kelas.value[0].id);
  pilihKelasOpen.value = true;
};
const pilihKelas = async (jadwalKuliahId: number) => {
  pilihKelasOpen.value = false;
  try {
    buatBaru.value = { jadwalKuliahId, peserta: (await dosenElearningApi.detailKelas(jadwalKuliahId)).peserta };
    formBaruOpen.value = true;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat peserta kelas'));
  }
};
const kontenKelasBaru = computed(() => katalog.value.find((g) => g.kelas.id === buatBaru.value?.jadwalKuliahId)?.konten ?? []);
const LABEL_JENIS: Record<JenisKonten, string> = { MATERI: 'materi', VIDEO: 'video', KUIS: 'kuis', TUGAS: 'tugas' };

// Filter katalog per jenis.
const filter = ref<'' | JenisKonten>('');
const katalogTampil = computed(() =>
  katalog.value.map((g) => ({ ...g, konten: g.konten.filter((k) => !filter.value || k.jenis === filter.value) })).filter((g) => g.konten.length),
);
const totalKonten = computed(() => katalog.value.reduce((s, g) => s + g.konten.length, 0));

// ---- Pratinjau & ubah ----
const previewOpen = ref(false);
const pilihan = ref<{ konten: KontenRingkas; mataKuliah: string } | null>(null);
const buka = (k: KontenRingkas, mataKuliah: string) => {
  pilihan.value = { konten: k, mataKuliah };
  previewOpen.value = true;
};
// Pilihan prasyarat di form: konten lain di kelas yang sama dengan konten yang diubah.
const kontenSekelas = computed(() => katalog.value.find((g) => g.kelas.id === pilihan.value?.konten.jadwalKuliahId)?.konten ?? []);
const formOpen = ref(false);
const pesertaForm = ref<PesertaKelas[]>([]);
const ubah = async (k: KontenRingkas) => {
  try {
    pesertaForm.value = (await dosenElearningApi.detailKelas(k.jadwalKuliahId)).peserta;
    pilihan.value = { konten: k, mataKuliah: pilihan.value?.mataKuliah ?? '' };
    formOpen.value = true;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat peserta kelas'));
  }
};
</script>

<template>
  <div>
    <PageHeader
      title="E-learning"
      :subtitle="`Bagikan materi, video, dan kuis ke mahasiswa kelas Anda${tahunAkademik ? ` — TA ${tahunAkademik.label}` : ''}.`"
    />
    <ElearningShell>
      <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat...</div>
      <div v-else-if="!kelas.length" class="p-8 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg">
        Anda belum mengampu kelas pada tahun akademik ini.
      </div>

      <template v-else>
        <!-- Beranda: bagikan + timeline (kiri), berita kampus (kanan) -->
        <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-6 mb-10 items-start">
          <div class="space-y-5 min-w-0">
            <BagikanPanel @buat="mulaiBuat" />

            <div class="flex items-center gap-3">
              <h2 class="flex items-center gap-2 text-headline-sm font-semibold text-on-surface">
                <span class="material-symbols-outlined" style="font-size: 22px">segment</span>Timeline
              </h2>
              <div class="ml-auto flex gap-2">
                <button
                  v-for="f in [
                    { key: 'semua', label: 'Semua' },
                    { key: 'kelas', label: 'Kelas' },
                    { key: 'berita', label: 'Berita' },
                  ] as const"
                  :key="f.key"
                  type="button"
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-label-md transition-colors"
                  :class="filterTimeline === f.key ? 'bg-primary border-primary text-on-primary font-semibold' : 'border-outline-variant text-on-surface hover:bg-surface-container'"
                  @click="filterTimeline = filterTimeline === f.key && f.key !== 'semua' ? 'semua' : f.key"
                >
                  {{ f.label }}
                  <span v-if="filterTimeline === f.key && f.key !== 'semua'" class="material-symbols-outlined" style="font-size: 15px">close</span>
                </button>
              </div>
            </div>

            <div v-if="!timeline.length" class="p-8 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-xl">
              {{ filterTimeline === 'berita' ? 'Belum ada berita kampus.' : 'Belum ada aktivitas. Bagikan materi, video, atau kuis pertama Anda di atas.' }}
            </div>
            <template v-for="it in timeline" :key="it.key">
              <TimelinePost
                v-if="it.tipe === 'konten'"
                :konten="it.konten"
                :mata-kuliah="it.mataKuliah"
                :kelas-nama="it.kelasNama"
                @buka="buka(it.konten, `${it.mataKuliah} · Kelas ${it.kelasNama}`)"
              />
              <article v-else class="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
                <div class="flex items-center gap-3">
                  <span class="w-11 h-11 rounded-full bg-[#0284c7]/12 text-[#075985] flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined" style="font-size: 22px">campaign</span>
                  </span>
                  <div class="text-body-sm">
                    <p><span class="font-semibold text-on-surface">Berita Kampus</span><span v-if="it.berita.isPenting" class="ml-2 px-1.5 py-0.5 rounded bg-[#d83b3b] text-white text-label-sm font-semibold">Penting</span></p>
                    <p class="text-label-sm text-on-surface-variant">{{ relatif(it.berita.tanggalTerbit) }}</p>
                  </div>
                </div>
                <button type="button" class="mt-3 text-left group" @click="bukaBerita(it.berita)">
                  <h3 class="text-headline-sm font-semibold text-on-surface group-hover:text-primary">{{ it.berita.judul }}</h3>
                  <p class="mt-1 text-body-sm text-on-surface-variant line-clamp-2">{{ teksBiasa(it.berita.isi) }}</p>
                </button>
              </article>
            </template>
            <div v-if="timeline.length >= BATAS_TIMELINE" class="text-center">
              <RouterLink :to="{ name: 'dosen-elearning-timeline' }" class="text-label-md font-semibold text-primary hover:underline">Lihat timeline lengkap →</RouterLink>
            </div>
          </div>

          <!-- Berita kampus -->
          <aside class="xl:sticky xl:top-36">
            <h2 class="text-headline-sm font-semibold text-on-surface mb-3">Berita Kampus</h2>
            <div class="rounded-xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant">
              <p v-if="!berita.length" class="p-5 text-body-sm text-on-surface-variant">Belum ada berita.</p>
              <button v-for="b in berita.slice(0, 6)" :key="b.id" type="button" class="w-full text-left p-4 hover:bg-surface-container-low group" @click="bukaBerita(b)">
                <p class="font-semibold text-on-surface leading-snug group-hover:text-primary line-clamp-3">{{ b.judul }}</p>
                <p class="mt-1 text-label-sm text-on-surface-variant">{{ relatif(b.tanggalTerbit) }}</p>
              </button>
            </div>
          </aside>
        </div>

        <!-- Katalog konten per kelas -->
        <div class="flex flex-col sm:flex-row sm:items-end gap-3 mb-1">
          <div>
            <h2 class="text-headline-md font-semibold text-on-surface">Materi & Video Saya</h2>
            <p class="text-body-sm text-on-surface-variant">{{ totalKonten }} konten di {{ katalog.length }} kelas — klik kartu untuk melihat pratinjau.</p>
          </div>
          <div class="sm:ml-auto inline-flex rounded-md border border-outline-variant overflow-hidden text-label-md self-start">
            <button
              v-for="f in [
                { key: '', label: 'Semua' },
                { key: 'MATERI', label: 'Materi' },
                { key: 'VIDEO', label: 'Video' },
                { key: 'KUIS', label: 'Kuis' },
                { key: 'TUGAS', label: 'Tugas' },
              ] as const"
              :key="f.key"
              type="button"
              class="px-3 py-1.5 border-l border-outline-variant first:border-l-0 transition-colors"
              :class="filter === f.key ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'"
              @click="filter = f.key"
            >
              {{ f.label }}
            </button>
          </div>
        </div>

        <div v-if="!katalogTampil.length" class="mt-4 p-8 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg">
          Belum ada konten{{ filter ? ' jenis ini' : '' }}. Gunakan panel <strong>Bagikan</strong> di atas atau buka kelas di menu <RouterLink :to="{ name: 'dosen-elearning-myclass' }" class="text-primary font-semibold hover:underline">My Class</RouterLink>.
        </div>
        <section v-for="g in katalogTampil" :key="g.kelas.id" class="mt-8">
          <h3 class="text-headline-sm font-semibold text-on-surface mb-3">
            Kelas {{ g.kelas.kelas }} —
            <RouterLink :to="{ name: 'dosen-elearning-kelas', params: { id: g.kelas.id } }" class="text-primary underline underline-offset-4 hover:opacity-80">
              {{ g.kelas.namaMataKuliah }}
            </RouterLink>
          </h3>
          <KontenCarousel>
            <KontenCard
              v-for="k in g.konten"
              :key="k.id"
              :konten="k"
              :mata-kuliah="`${g.kelas.kodeMataKuliah} · Kelas ${g.kelas.kelas}`"
              :prasyarat-judul="g.konten.find((x) => x.id === k.prasyaratId)?.judul ?? null"
              @buka="buka(k, `${g.kelas.kodeMataKuliah} — ${g.kelas.namaMataKuliah} · Kelas ${g.kelas.kelas}`)"
              @ubah="ubah(k)"
              @hasil="router.push({ name: 'dosen-elearning-kelas', params: { id: k.jadwalKuliahId } })"
            />
          </KontenCarousel>
        </section>
      </template>
    </ElearningShell>

    <!-- Bagikan: pilih kelas -->
    <Modal v-model="pilihKelasOpen" :title="`Bagikan ${LABEL_JENIS[jenisBaru]} ke kelas`" size="md">
      <div class="space-y-2">
        <button
          v-for="k in kelas"
          :key="k.id"
          type="button"
          class="w-full text-left rounded-lg border border-outline-variant p-3 hover:border-primary hover:bg-surface-container-low flex items-center gap-3"
          @click="pilihKelas(k.id)"
        >
          <MataKuliahIlustrasi :nama="k.namaMataKuliah" :kode="k.kodeMataKuliah" :ikon="k.ikon" ukuran="sm" />
          <span class="min-w-0">
            <span class="block font-semibold text-on-surface">{{ k.namaMataKuliah }}</span>
            <span class="block text-label-sm text-on-surface-variant">{{ k.kodeMataKuliah }} · Kelas {{ k.kelas }} · {{ k.peserta }} mahasiswa</span>
          </span>
        </button>
      </div>
    </Modal>
    <KontenFormModal
      v-if="buatBaru"
      v-model="formBaruOpen"
      :jadwal-kuliah-id="buatBaru.jadwalKuliahId"
      :jenis="jenisBaru"
      :konten-id="null"
      :peserta="buatBaru.peserta"
      :pilihan-prasyarat="kontenKelasBaru"
      @saved="load"
    />
    <!-- Detail berita -->
    <Modal v-model="beritaOpen" :title="beritaDipilih?.judul ?? 'Berita'" :subtitle="beritaDipilih ? formatDate(beritaDipilih.tanggalTerbit) : ''" size="lg">
      <!-- Isi pengumuman dari editor teks kaya BAAK (sama seperti halaman Pengumuman dosen). -->
      <div v-if="beritaDipilih" class="berita-isi text-body-md text-on-surface" v-html="beritaDipilih.isi" />
    </Modal>
    <KontenPreviewModal v-model="previewOpen" :konten-id="pilihan?.konten.id ?? null" :subtitle="pilihan?.mataKuliah" @ubah="pilihan && ubah(pilihan.konten)" />
    <KontenFormModal
      v-if="pilihan"
      v-model="formOpen"
      :jadwal-kuliah-id="pilihan.konten.jadwalKuliahId"
      :jenis="pilihan.konten.jenis"
      :konten-id="pilihan.konten.id"
      :peserta="pesertaForm"
      :pilihan-prasyarat="kontenSekelas"
      @saved="load"
    />
  </div>
</template>

<style scoped>
.berita-isi :deep(p) {
  margin-bottom: 0.5rem;
}
.berita-isi :deep(ul) {
  list-style: disc;
  padding-left: 1.25rem;
}
.berita-isi :deep(ol) {
  list-style: decimal;
  padding-left: 1.25rem;
}
.berita-isi :deep(a) {
  text-decoration: underline;
}
</style>

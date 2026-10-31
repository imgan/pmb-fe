<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Modal from '@/components/ui/Modal.vue';
import TimelinePost from './TimelinePost.vue';
import { mahasiswaElearningApi, type KontenMahasiswa } from '@/api/elearning';
import { mahasiswaPengumumanApi, type PengumumanMahasiswa } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';
import { useMahasiswaAuthStore } from '@/stores/mahasiswaAuth';
import { formatDate } from '@/utils/format';

/**
 * Beranda / Timeline & Berita E-learning mahasiswa — sama dengan beranda dosen tanpa panel "Bagikan": timeline
 * konten kelas yang diikuti + berita kampus (filter Semua / Kelas / Berita), suka & komentar, dan panel Berita
 * Kampus di kanan. Klik postingan → halaman kelas yang langsung membuka konten tsb. `batas` = jumlah item (null = semua).
 */
const props = withDefaults(defineProps<{ batas?: number | null }>(), { batas: 15 });
const router = useRouter();
const authStore = useMahasiswaAuthStore();

const konten = ref<KontenMahasiswa[]>([]);
const berita = ref<PengumumanMahasiswa[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
onMounted(async () => {
  loading.value = true;
  try {
    konten.value = await mahasiswaElearningApi.list();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat e-learning');
  } finally {
    loading.value = false;
  }
  // Berita kampus = pengumuman BAAK yang tayang (gagal dimuat tidak mengganggu halaman).
  try {
    berita.value = await mahasiswaPengumumanApi.list();
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
const relatif = (iso: string) => {
  const hari = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (hari <= 0) return 'hari ini';
  if (hari === 1) return 'kemarin';
  return hari < 30 ? `${hari} hari lalu` : formatDate(iso);
};

const filter = ref<'semua' | 'kelas' | 'berita'>('semua');
type Item = { tipe: 'konten'; key: string; waktu: string; konten: KontenMahasiswa } | { tipe: 'berita'; key: string; waktu: string; berita: PengumumanMahasiswa };
const timeline = computed<Item[]>(() => {
  const k: Item[] = konten.value.map((x) => ({ tipe: 'konten' as const, key: `k${x.id}`, waktu: x.createdAt, konten: x }));
  const b: Item[] = berita.value.map((x) => ({ tipe: 'berita' as const, key: `b${x.id}`, waktu: x.tanggalTerbit, berita: x }));
  const sumber = filter.value === 'kelas' ? k : filter.value === 'berita' ? b : [...k, ...b];
  const urut = sumber.sort((a, c) => new Date(c.waktu).getTime() - new Date(a.waktu).getTime());
  return props.batas ? urut.slice(0, props.batas) : urut;
});
const terpotong = computed(() => !!props.batas && konten.value.length + berita.value.length > props.batas && filter.value === 'semua');

const bukaKonten = (k: KontenMahasiswa) => router.push({ name: 'mahasiswa-elearning-kelas', params: { id: k.jadwalKuliahId }, query: { konten: k.id } });
const beritaOpen = ref(false);
const beritaDipilih = ref<PengumumanMahasiswa | null>(null);
const bukaBerita = (b: PengumumanMahasiswa) => {
  beritaDipilih.value = b;
  beritaOpen.value = true;
};
const inisialSaya = computed(() => authStore.mahasiswa?.namaLengkap ?? null);
</script>

<template>
  <div>
    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat...</div>

    <div v-else class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
      <div class="space-y-5 min-w-0">
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
              :class="filter === f.key ? 'bg-primary border-primary text-on-primary font-semibold' : 'border-outline-variant text-on-surface hover:bg-surface-container'"
              @click="filter = filter === f.key && f.key !== 'semua' ? 'semua' : f.key"
            >
              {{ f.label }}
              <span v-if="filter === f.key && f.key !== 'semua'" class="material-symbols-outlined" style="font-size: 15px">close</span>
            </button>
          </div>
        </div>

        <div v-if="!timeline.length" class="p-8 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-xl">
          {{ filter === 'berita' ? 'Belum ada berita kampus.' : 'Belum ada materi, video, kuis, atau tugas dari dosen di kelas Anda.' }}
        </div>
        <template v-for="it in timeline" :key="it.key">
          <TimelinePost
            v-if="it.tipe === 'konten'"
            portal="mahasiswa"
            :konten="it.konten"
            :mata-kuliah="it.konten.kelas.namaMataKuliah"
            :kelas-nama="it.konten.kelas.kelas"
            :inisial-saya="inisialSaya"
            @buka="bukaKonten(it.konten)"
          />
          <article v-else class="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <div class="flex items-center gap-3">
              <span class="w-11 h-11 rounded-full bg-[#0284c7]/12 text-[#075985] flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined" style="font-size: 22px">campaign</span>
              </span>
              <div class="text-body-sm">
                <p>
                  <span class="font-semibold text-on-surface">Berita Kampus</span>
                  <span v-if="it.berita.isPenting" class="ml-2 px-1.5 py-0.5 rounded bg-[#d83b3b] text-white text-label-sm font-semibold">Penting</span>
                </p>
                <p class="text-label-sm text-on-surface-variant">{{ relatif(it.berita.tanggalTerbit) }}</p>
              </div>
            </div>
            <button type="button" class="mt-3 text-left group" @click="bukaBerita(it.berita)">
              <h3 class="text-headline-sm font-semibold text-on-surface group-hover:text-primary">{{ it.berita.judul }}</h3>
              <p class="mt-1 text-body-sm text-on-surface-variant line-clamp-2">{{ teksBiasa(it.berita.isi) }}</p>
            </button>
          </article>
        </template>
        <div v-if="terpotong" class="text-center">
          <RouterLink :to="{ name: 'mahasiswa-elearning-timeline' }" class="text-label-md font-semibold text-primary hover:underline">Lihat timeline lengkap →</RouterLink>
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

    <Modal v-model="beritaOpen" :title="beritaDipilih?.judul ?? 'Berita'" :subtitle="beritaDipilih ? formatDate(beritaDipilih.tanggalTerbit) : ''" size="lg">
      <!-- Isi pengumuman dari editor teks kaya BAAK (sama dengan halaman Pengumuman mahasiswa). -->
      <div v-if="beritaDipilih" class="berita-isi text-body-md text-on-surface" v-html="beritaDipilih.isi" />
    </Modal>
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

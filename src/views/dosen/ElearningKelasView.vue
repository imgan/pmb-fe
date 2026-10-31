<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import ElearningShell from '@/components/elearning/ElearningShell.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import KontenFormModal from '@/components/elearning/KontenFormModal.vue';
import KontenCard from '@/components/elearning/KontenCard.vue';
import KontenPreviewModal from '@/components/elearning/KontenPreviewModal.vue';
import PengumpulanTugasModal from '@/components/elearning/PengumpulanTugasModal.vue';
import KomentarKontenModal from '@/components/elearning/KomentarKontenModal.vue';
import { dosenElearningApi, sampulKonten, type HasilKuis, type JenisKonten, type KontenRingkas, type PesertaKelas, type SesiPembelajaran, formatDurasi } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import { formatDateTime } from '@/utils/format';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';

/**
 * E-learning satu kelas (dosen): daftar konten (Materi / Video / Kuis) per pertemuan, tombol tambah per jenis,
 * ubah / hapus, dan hasil kuis per mahasiswa.
 */
const props = defineProps<{ id: string }>();
const router = useRouter();
const route = useRoute();

const kelas = ref<{ id: number; kelas: string; kodeMataKuliah: string; namaMataKuliah: string; sks: number | null; tahunAjaran: string } | null>(null);
const peserta = ref<PesertaKelas[]>([]);
const konten = ref<KontenRingkas[]>([]);
const sesi = ref<SesiPembelajaran[]>([]);
const tanpaSesi = ref(0);
// Sesi terpilih: null = semua sesi, 0 = konten tanpa sesi.
const sesiDipilih = ref<number | null>(null);
const error = ref<string | null>(null);
const load = async () => {
  try {
    const d = await dosenElearningApi.detailKelas(props.id);
    kelas.value = d.kelas;
    peserta.value = d.peserta;
    sesi.value = d.sesi;
    tanpaSesi.value = d.tanpaSesi;
    konten.value = d.konten;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kelas');
  }
};
onMounted(async () => {
  await load();
  bukaDariTautan();
});
// Dibuka dari lonceng notifikasi: ?konten=<id>&aksi=pengumpulan | komentar langsung membuka modal terkait.
const bukaDariTautan = () => {
  const k = konten.value.find((x) => x.id === Number(route.query.konten));
  const aksi = route.query.aksi;
  if (!k || !aksi) return;
  router.replace({ query: { ...route.query, konten: undefined, aksi: undefined } });
  if (aksi === 'pengumpulan' && k.jenis === 'TUGAS') bukaPengumpulan(k);
  else if (aksi === 'komentar') bukaKomentar(k);
};
watch(() => [route.query.konten, route.query.aksi], () => route.query.konten && bukaDariTautan());

// ---- Komentar / pertanyaan mahasiswa ----
const komentarOpen = ref(false);
const komentarKonten = ref<KontenRingkas | null>(null);
const bukaKomentar = (k: KontenRingkas) => {
  komentarKonten.value = k;
  komentarOpen.value = true;
};

const JENIS: Record<JenisKonten, { label: string; icon: string; cls: string }> = {
  MATERI: { label: 'Materi', icon: 'library_books', cls: 'bg-[#2563eb]/10 text-[#1e40af]' },
  VIDEO: { label: 'Video', icon: 'smart_display', cls: 'bg-[#d83b3b]/10 text-[#a32020]' },
  KUIS: { label: 'Kuis', icon: 'quiz', cls: 'bg-[#7c3aed]/10 text-[#5b21b6]' },
  TUGAS: { label: 'Tugas', icon: 'assignment', cls: 'bg-[#0891b2]/10 text-[#0e7490]' },
};
const filter = ref<'' | JenisKonten>('');
const tampil = computed(() =>
  konten.value.filter((k) => (!filter.value || k.jenis === filter.value) && (sesiDipilih.value === null || (k.pertemuanKe ?? 0) === sesiDipilih.value)),
);
const labelSesi = computed(() => (sesiDipilih.value === null ? '' : sesiDipilih.value === 0 ? 'tanpa sesi' : 'di Sesi ke ' + sesiDipilih.value));
const jumlah = (j: JenisKonten) => konten.value.filter((k) => k.jenis === j).length;
// Tampilan kartu (katalog) atau daftar; pilihan disimpan di browser.
const KUNCI_TAMPILAN = 'elearning-tampilan-dosen';
const bacaTampilan = (): 'kartu' | 'daftar' => {
  try {
    return localStorage.getItem(KUNCI_TAMPILAN) === 'daftar' ? 'daftar' : 'kartu';
  } catch {
    return 'kartu';
  }
};
const tampilan = ref<'kartu' | 'daftar'>(bacaTampilan());
const setTampilan = (v: 'kartu' | 'daftar') => {
  tampilan.value = v;
  try {
    localStorage.setItem(KUNCI_TAMPILAN, v);
  } catch {
    // penyimpanan browser tidak tersedia — abaikan.
  }
};
const previewOpen = ref(false);
const previewId = ref<number | null>(null);
const pratinjau = (k: KontenRingkas) => {
  previewId.value = k.id;
  previewOpen.value = true;
};

// ---- Form ----
const formOpen = ref(false);
const formJenis = ref<JenisKonten>('MATERI');
const formId = ref<number | null>(null);
const tambah = (j: JenisKonten) => {
  formJenis.value = j;
  formId.value = null;
  formOpen.value = true;
};
const ubah = (k: KontenRingkas) => {
  formJenis.value = k.jenis;
  formId.value = k.id;
  formOpen.value = true;
};
const hapus = async (k: KontenRingkas) => {
  const ok = await confirmAction({
    title: `Hapus "${k.judul}"?`,
    text: k.jenis === 'KUIS' && k.sudahMengerjakan ? `${k.sudahMengerjakan} jawaban mahasiswa ikut terhapus.` : 'Konten tidak lagi terlihat oleh mahasiswa.',
    confirmLabel: 'Ya, hapus',
  });
  if (!ok) return;
  try {
    await dosenElearningApi.hapus(k.id);
    toastSuccess('Konten dihapus');
    await load();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus'));
  }
};

// ---- Hasil kuis ----
const hasilOpen = ref(false);
const hasil = ref<HasilKuis | null>(null);
// ---- Pengumpulan tugas ----
const pengumpulanOpen = ref(false);
const pengumpulanId = ref<number | null>(null);
const bukaPengumpulan = (k: KontenRingkas) => {
  pengumpulanId.value = k.id;
  pengumpulanOpen.value = true;
};

const lihatHasil = async (k: KontenRingkas) => {
  hasil.value = null;
  hasilOpen.value = true;
  try {
    hasil.value = await dosenElearningApi.hasil(k.id);
  } catch (err) {
    hasilOpen.value = false;
    toastError(extractErrorMessage(err, 'Gagal memuat hasil kuis'));
  }
};
const angka = (v: number | null) => (v === null ? '-' : v.toLocaleString('id-ID', { maximumFractionDigits: 2 }));
/** Panic button: hapus jawaban kuis satu mahasiswa supaya bisa mengerjakan ulang. */
const mereset = ref<number | null>(null);
const resetKuis = async (r: HasilKuis['rows'][number]) => {
  if (!hasil.value) return;
  const ok = await confirmAction({
    title: `Reset kuis ${r.nama}?`,
    text: `Jawaban & skor (${angka(r.skor)}) dihapus, mahasiswa bisa mengerjakan "${hasil.value.konten.judul}" lagi dari awal. Tindakan ini tidak bisa dibatalkan.`,
    confirmLabel: 'Ya, reset',
  });
  if (!ok) return;
  mereset.value = r.id;
  try {
    await dosenElearningApi.resetKuis(hasil.value.konten.id, r.id);
    hasil.value = await dosenElearningApi.hasil(hasil.value.konten.id);
    toastSuccess(`Kuis ${r.nama} direset — mahasiswa bisa mengerjakan ulang`);
    load();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mereset kuis'));
  } finally {
    mereset.value = null;
  }
};

// ---- Hasil kuis: ranking (skor tertinggi, lalu benar terbanyak, lalu yang lebih dulu mengirim) ----
const ranking = computed(() =>
  (hasil.value?.rows ?? [])
    .filter((r) => r.sudah)
    .sort((a, b) => (b.skor ?? 0) - (a.skor ?? 0) || (b.benar ?? 0) - (a.benar ?? 0) || String(a.dikirim).localeCompare(String(b.dikirim))),
);
const belumKuis = computed(() => (hasil.value?.rows ?? []).filter((r) => !r.sudah));
const BADGE_RANK = ['bg-[#facc15] text-[#713f12]', 'bg-[#e2e8f0] text-[#334155]', 'bg-[#d97706] text-white'];
const WARNA_AVATAR = ['#16a34a', '#2563eb', '#db2777', '#7c3aed', '#ea580c', '#0891b2', '#b45309'];
const warnaAvatar = (nim: string) => WARNA_AVATAR[[...nim].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % WARNA_AVATAR.length];
const inisialNama = (nama: string) =>
  nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
</script>

<template>
  <div>
    <PageHeader
      :title="kelas ? kelas.namaMataKuliah : 'E-learning'"
      :subtitle="kelas ? `${kelas.kodeMataKuliah} · Kelas ${kelas.kelas} · ${kelas.tahunAjaran} · ${peserta.length} mahasiswa` : 'Memuat...'"
    />
    <ElearningShell>
      <div class="grid grid-cols-1 xl:grid-cols-[15rem_minmax(0,1fr)] gap-4 items-start">
        <!-- Sesi pembelajaran: klik untuk menampilkan konten sesi tsb -->
        <aside class="xl:sticky xl:top-36">
          <h2 class="text-label-md font-semibold text-on-surface-variant mb-2">Sesi Pembelajaran</h2>
          <div class="rounded-xl border border-outline-variant bg-surface-container-low p-2 max-h-[32rem] overflow-y-auto space-y-2">
            <button
              type="button"
              class="w-full text-left rounded-lg border px-3 py-2 transition-colors"
              :class="
                sesiDipilih === null ? 'border-primary bg-primary-container/60' : 'border-outline-variant bg-surface-container-lowest hover:border-primary'
              "
              @click="sesiDipilih = null"
            >
              <span class="block font-semibold text-primary">Semua Sesi</span>
              <span class="block text-label-sm text-on-surface-variant">{{ konten.length }} Materi</span>
            </button>
            <button
              v-for="s in sesi"
              :key="s.ke"
              type="button"
              class="w-full text-left rounded-lg border px-3 py-2 transition-colors"
              :class="
                sesiDipilih === s.ke ? 'border-primary bg-primary-container/60' : 'border-outline-variant bg-surface-container-lowest hover:border-primary'
              "
              :title="s.judul ?? undefined"
              @click="sesiDipilih = s.ke"
            >
              <span class="block text-label-sm text-on-surface-variant"
                >Sesi ke {{ s.ke }}<template v-if="s.jenis && s.jenis !== 'Kuliah'"> · {{ s.jenis }}</template></span
              >
              <span class="block font-semibold leading-snug line-clamp-2" :class="s.judul ? 'text-primary' : 'text-on-surface-variant'">{{
                s.judul ?? `Pertemuan ${s.ke}`
              }}</span>
              <span class="block text-label-sm" :class="s.jumlahKonten ? 'text-on-surface-variant' : 'text-on-surface-variant/60'"
                >{{ s.jumlahKonten }} Materi</span
              >
            </button>
            <button
              v-if="tanpaSesi"
              type="button"
              class="w-full text-left rounded-lg border px-3 py-2 transition-colors"
              :class="sesiDipilih === 0 ? 'border-primary bg-primary-container/60' : 'border-outline-variant bg-surface-container-lowest hover:border-primary'"
              @click="sesiDipilih = 0"
            >
              <span class="block font-semibold text-on-surface-variant">Tanpa Sesi</span>
              <span class="block text-label-sm text-on-surface-variant">{{ tanpaSesi }} Materi</span>
            </button>
          </div>
        </aside>
        <div class="min-w-0">
          <section class="bg-surface-container-lowest border border-outline-variant border-t-2 border-t-primary rounded-lg p-3 mb-4 space-y-3">
            <!-- Baris 1: kembali + tambah konten -->
            <div class="flex flex-wrap items-center gap-2">
              <AppButton variant="secondary" icon="arrow_back" @click="router.push({ name: 'dosen-elearning-myclass' })">Kembali ke My Class</AppButton>
              <div class="flex flex-wrap gap-2 sm:ml-auto">
                <AppButton icon="library_books" @click="tambah('MATERI')">Tambah Materi</AppButton>
                <AppButton icon="smart_display" @click="tambah('VIDEO')">Tambah Video</AppButton>
                <AppButton icon="quiz" @click="tambah('KUIS')">Tambah Kuis</AppButton>
                <AppButton icon="assignment" @click="tambah('TUGAS')">Tambah Tugas</AppButton>
              </div>
            </div>
            <!-- Baris 2: filter jenis + tampilan -->
            <div class="flex items-center gap-2 pt-3 border-t border-outline-variant">
              <div class="flex-1 min-w-0 overflow-x-auto">
                <div class="inline-flex rounded-md border border-outline-variant overflow-hidden text-label-md whitespace-nowrap">
                  <button
                    v-for="f in [
                      { key: '', label: `Semua (${konten.length})` },
                      { key: 'MATERI', label: `Materi (${jumlah('MATERI')})` },
                      { key: 'VIDEO', label: `Video (${jumlah('VIDEO')})` },
                      { key: 'KUIS', label: `Kuis (${jumlah('KUIS')})` },
                      { key: 'TUGAS', label: `Tugas (${jumlah('TUGAS')})` },
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
              <div class="inline-flex shrink-0 rounded-md border border-outline-variant overflow-hidden text-label-md" title="Tampilan">
                <button
                  type="button"
                  class="px-2.5 py-1.5 inline-flex items-center"
                  :class="tampilan === 'kartu' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'"
                  aria-label="Tampilan kartu"
                  @click="setTampilan('kartu')"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">grid_view</span>
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1.5 inline-flex items-center border-l border-outline-variant"
                  :class="tampilan === 'daftar' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'"
                  aria-label="Tampilan daftar"
                  @click="setTampilan('daftar')"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">view_list</span>
                </button>
              </div>
            </div>
          </section>

          <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

          <div
            v-if="!tampil.length"
            class="p-10 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg"
          >
            <span class="material-symbols-outlined block mb-2 text-on-surface-variant" style="font-size: 40px">cast_for_education</span>
            Belum ada konten{{ filter ? ` ${JENIS[filter].label.toLowerCase()}` : '' }} {{ labelSesi }}. Gunakan tombol Tambah di atas untuk membagikan materi,
            video, atau kuis.
          </div>
          <!-- Tampilan kartu -->
          <div v-else-if="tampilan === 'kartu'" class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
            <KontenCard
              v-for="k in tampil"
              :key="k.id"
              class="!w-auto"
              :konten="k"
              :mata-kuliah="kelas ? `${kelas.kodeMataKuliah} · Kelas ${kelas.kelas}` : ''"
              :prasyarat-judul="konten.find((x) => x.id === k.prasyaratId)?.judul ?? null"
              @buka="pratinjau(k)"
              @ubah="ubah(k)"
              @hasil="k.jenis === 'KUIS' ? lihatHasil(k) : bukaPengumpulan(k)"
            />
          </div>
          <div v-else class="space-y-3">
            <article
              v-for="k in tampil"
              :key="k.id"
              class="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 flex flex-col md:flex-row md:items-start gap-4"
            >
              <img v-if="sampulKonten(k)" :src="sampulKonten(k)!" :alt="k.judul" class="w-full md:w-36 aspect-video object-cover rounded-md self-start shrink-0" loading="lazy" />
              <span v-else class="material-symbols-outlined rounded-lg p-2 self-start" :class="JENIS[k.jenis].cls" style="font-size: 26px">{{
                JENIS[k.jenis].icon
              }}</span>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-semibold text-on-surface">{{ k.judul }}</h3>
                  <span class="px-2 py-0.5 rounded-full text-label-sm" :class="JENIS[k.jenis].cls">{{ JENIS[k.jenis].label }}</span>
                  <span v-if="k.isWajib" class="px-2 py-0.5 rounded text-label-sm bg-[#d83b3b] text-white font-semibold inline-flex items-center gap-0.5"
                    ><span class="material-symbols-outlined" style="font-size: 13px">priority_high</span>Wajib</span
                  >
                  <span v-for="t in k.tagline" :key="t" class="px-2 py-0.5 rounded text-label-sm bg-[#d1f0ec] text-[#0f5f56] font-semibold">{{ t }}</span>
                  <span v-if="k.kategori" class="px-2 py-0.5 rounded text-label-sm border border-outline-variant text-on-surface-variant">{{
                    k.kategori
                  }}</span>
                  <span v-if="k.pertemuanKe" class="px-2 py-0.5 rounded-full text-label-sm bg-surface-container text-on-surface-variant"
                    >Pertemuan {{ k.pertemuanKe }}</span
                  >
                  <span v-if="!k.isPublished" class="px-2 py-0.5 rounded-full text-label-sm bg-[#eda100]/20 text-[#7a5200]">Draf</span>
                </div>
                <p v-if="k.deskripsi" class="mt-1 text-body-sm text-on-surface-variant whitespace-pre-line">{{ k.deskripsi }}</p>
                <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-label-sm text-on-surface-variant">
                  <span class="inline-flex items-center gap-1">
                    <span class="material-symbols-outlined" style="font-size: 16px">group</span>
                    {{ k.target === 'SEMUA' ? 'Semua peserta' : 'Mahasiswa tertentu' }} ({{ k.jumlahPenerima }})
                  </span>
                  <span v-if="k.adaLampiran" class="inline-flex items-center gap-1"
                    ><span class="material-symbols-outlined" style="font-size: 16px">attach_file</span>{{ k.lampiranNama }}</span
                  >
                  <a v-if="k.url" :href="k.url" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-primary hover:underline">
                    <span class="material-symbols-outlined" style="font-size: 16px">link</span>Buka link
                  </a>
                  <template v-if="k.jenis === 'KUIS'">
                    <span>{{ k.jumlahSoal }} soal</span>
                    <span>Dikerjakan {{ k.sudahMengerjakan }}/{{ k.jumlahPenerima }}</span>
                    <span v-if="k.rataSkor !== null">Rata-rata skor {{ angka(k.rataSkor) }}</span>
                    <span v-if="k.tenggat">Batas {{ formatDateTime(k.tenggat) }}</span>
                  </template>
                  <template v-if="k.jenis === 'TUGAS'">
                    <span>Dikumpulkan {{ k.sudahMengerjakan }}/{{ k.jumlahPenerima }}</span>
                    <span v-if="k.rataSkor !== null">Rata-rata nilai {{ angka(k.rataSkor) }}</span>
                    <span v-if="k.tenggat">Tenggat {{ formatDateTime(k.tenggat) }}</span>
                  </template>
                  <span v-if="k.tersediaMulai || k.tersediaSampai" class="inline-flex items-center gap-1">
                    <span class="material-symbols-outlined" style="font-size: 16px">event_available</span>Tayang
                    {{ k.tersediaMulai ? formatDateTime(k.tersediaMulai) : 'sekarang' }} –
                    {{ k.tersediaSampai ? formatDateTime(k.tersediaSampai) : 'seterusnya' }}
                  </span>
                  <span v-if="k.target === 'KAMPUS'" class="inline-flex items-center gap-1"
                    ><span class="material-symbols-outlined" style="font-size: 16px">public</span>Semua mahasiswa kampus</span
                  >
                  <span class="inline-flex items-center gap-1" :title="`oleh ${k.dilihat.mahasiswa} mahasiswa`">
                    <span class="material-symbols-outlined" style="font-size: 16px">visibility</span>{{ k.dilihat.total.toLocaleString('id-ID') }}× dilihat ({{
                      k.dilihat.mahasiswa
                    }}
                    mahasiswa)
                  </span>
                  <span>{{ k.namaDosen ? `Oleh ${k.namaDosen} · ` : '' }}Dibuat {{ formatDateTime(k.createdAt) }}</span>
                </div>
              </div>
              <div class="flex gap-2 self-start">
                <AppButton v-if="k.jenis === 'KUIS'" variant="secondary" icon="leaderboard" @click="lihatHasil(k)">Hasil</AppButton>
                <AppButton v-if="k.jenis === 'TUGAS'" variant="secondary" icon="inbox" @click="bukaPengumpulan(k)">Pengumpulan</AppButton>
                <AppButton variant="secondary" icon="edit" @click="ubah(k)">Ubah</AppButton>
                <AppButton variant="danger" icon="delete" @click="hapus(k)">Hapus</AppButton>
              </div>
            </article>
          </div>
        </div>
      </div>
    </ElearningShell>

    <PengumpulanTugasModal v-model="pengumpulanOpen" :konten-id="pengumpulanId" @dinilai="load" />
    <KomentarKontenModal v-model="komentarOpen" :konten-id="komentarKonten?.id ?? null" :judul="komentarKonten?.judul" />
    <KontenPreviewModal
      v-model="previewOpen"
      :konten-id="previewId"
      :subtitle="kelas ? `${kelas.kodeMataKuliah} — ${kelas.namaMataKuliah} · Kelas ${kelas.kelas}` : ''"
      @ubah="previewId && ubah(konten.find((x) => x.id === previewId)!)"
    />
    <KontenFormModal
      v-if="kelas"
      v-model="formOpen"
      :jadwal-kuliah-id="kelas.id"
      :jenis="formJenis"
      :konten-id="formId"
      :peserta="peserta"
      :pilihan-prasyarat="konten"
      :pertemuan-awal="formId ? null : sesiDipilih || null"
      @saved="load"
    />

    <Modal v-model="hasilOpen" title="Hasil Ranking" :subtitle="hasil ? `Kuis: ${hasil.konten.judul} · ${hasil.konten.jumlahSoal} soal` : undefined" size="lg">
      <div v-if="!hasil" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat...</div>
      <template v-else>
        <div class="grid grid-cols-3 gap-3 mb-4 text-center">
          <div class="rounded-md bg-surface-container py-3">
            <p class="text-headline-sm font-semibold">{{ hasil.ringkasan.penerima }}</p>
            <p class="text-label-sm text-on-surface-variant">Penerima</p>
          </div>
          <div class="rounded-md bg-surface-container py-3">
            <p class="text-headline-sm font-semibold">{{ hasil.ringkasan.sudah }}</p>
            <p class="text-label-sm text-on-surface-variant">Sudah mengerjakan</p>
          </div>
          <div class="rounded-md bg-surface-container py-3">
            <p class="text-headline-sm font-semibold">{{ angka(hasil.ringkasan.rataSkor) }}</p>
            <p class="text-label-sm text-on-surface-variant">Rata-rata skor</p>
          </div>
        </div>
        <!-- Ranking peserta yang sudah mengerjakan -->
        <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <p v-if="!ranking.length" class="p-6 text-center text-body-sm text-on-surface-variant">Belum ada mahasiswa yang mengerjakan kuis ini.</p>
          <div
            v-for="(r, i) in ranking"
            :key="r.id"
            class="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 shadow-sm"
          >
            <span
              class="w-14 shrink-0 py-1.5 rounded-md text-center text-title-md font-semibold tabular-nums"
              :class="BADGE_RANK[i] ?? 'bg-surface-container text-on-surface-variant'"
            >
              #{{ i + 1 }}
            </span>
            <span
              class="w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-white font-bold ring-2 ring-white shadow"
              :style="{ background: warnaAvatar(r.nim) }"
            >
              {{ inisialNama(r.nama) }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-on-surface truncate">{{ r.nama }}</p>
              <p class="text-label-sm text-on-surface-variant">{{ r.nim }}</p>
              <p class="text-label-sm text-on-surface-variant">
                {{ formatDateTime(r.dikirim) }}
                <span v-if="r.grup" class="ml-1 px-1.5 rounded-full bg-[#7c3aed]/12 text-[#5b21b6]">{{ r.grup }}</span>
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-error/40 text-error text-label-md hover:bg-error-container disabled:opacity-50"
              :disabled="mereset === r.id"
              title="Reset kuis mahasiswa ini — jawaban & skor dihapus, mahasiswa bisa mengerjakan ulang"
              @click="resetKuis(r)"
            >
              <span class="material-symbols-outlined" :class="mereset === r.id ? 'animate-spin' : ''" style="font-size: 18px">restart_alt</span>
              Reset
            </button>
            <div class="grid grid-cols-4 gap-4 text-center shrink-0">
              <div>
                <p class="text-label-sm text-on-surface-variant">Nilai</p>
                <p class="text-headline-sm font-bold text-on-surface tabular-nums">{{ angka(r.skor) }}</p>
              </div>
              <div>
                <p class="text-label-sm text-on-surface-variant">Benar</p>
                <p class="text-headline-sm font-bold text-[#16a34a] tabular-nums">{{ r.benar ?? 0 }}</p>
              </div>
              <div>
                <p class="text-label-sm text-on-surface-variant">Salah</p>
                <p class="text-headline-sm font-bold text-[#dc2626] tabular-nums">{{ hasil.konten.jumlahSoal - (r.benar ?? 0) }}</p>
              </div>
              <div title="Durasi aktif membuka / mengerjakan kuis">
                <p class="text-label-sm text-on-surface-variant">Durasi</p>
                <p class="text-title-md font-bold text-on-surface tabular-nums whitespace-nowrap leading-8">{{ formatDurasi(r.durasi) }}</p>
              </div>
            </div>
          </div>

          <!-- Belum mengerjakan -->
          <template v-if="belumKuis.length">
            <p class="pt-2 text-label-md font-semibold text-on-surface-variant">Belum mengerjakan ({{ belumKuis.length }})</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="r in belumKuis"
                :key="r.id"
                class="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-outline-variant bg-surface-container text-label-md text-on-surface-variant"
              >
                <span class="w-7 h-7 rounded-full bg-outline-variant/60 text-white flex items-center justify-center text-[11px] font-bold">{{
                  inisialNama(r.nama)
                }}</span>
                {{ r.nama }} · {{ r.nim }}<template v-if="r.durasi"> · dibuka {{ formatDurasi(r.durasi) }}</template>
              </span>
            </div>
          </template>
        </div>
      </template>
    </Modal>
  </div>
</template>

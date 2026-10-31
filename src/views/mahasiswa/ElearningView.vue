<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import ElearningShell from '@/components/elearning/ElearningShell.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import FileInput from '@/components/ui/FileInput.vue';
import { mahasiswaElearningApi, sampulKonten, youtubeEmbed, type JenisKonten, type KontenMahasiswa } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import { dataUrlToBlob, downloadBlob } from '@/utils/download';
import MateriMedia from '@/components/elearning/MateriMedia.vue';
import { formatDateTime } from '@/utils/format';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';

/**
 * Portal Mahasiswa → E-learning → My Class → kelas (route mahasiswa-elearning-kelas, :id opsional = filter kelas):
 * materi, video, kuis & tugas dari dosen untuk kelas yang diikuti (KRS disetujui). ?konten=<id> membuka konten tsb
 * (dari timeline Beranda). Kuis dikerjakan sekali; setelah dikirim, skor & kunci jawaban ditampilkan.
 */
const route = useRoute();
const router = useRouter();
const list = ref<KontenMahasiswa[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const load = async () => {
  loading.value = true;
  try {
    list.value = await mahasiswaElearningApi.list();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat e-learning');
  } finally {
    loading.value = false;
  }
};
/** Dibuka dari timeline / lonceng notifikasi (?konten=<id>): langsung tampilkan kontennya. */
const bukaDariTautan = () => {
  const kontenId = Number(route.query.konten);
  const k = kontenId ? list.value.find((x) => x.id === kontenId) : null;
  if (k) {
    router.replace({ query: { ...route.query, konten: undefined } });
    buka(k);
  }
};
onMounted(async () => {
  await load();
  bukaDariTautan();
});
watch(
  () => route.query.konten,
  async (v) => {
    if (!v) return;
    if (!list.value.some((x) => x.id === Number(v))) await load();
    bukaDariTautan();
  }
);

const JENIS: Record<JenisKonten, { label: string; icon: string; cls: string }> = {
  MATERI: { label: 'Materi', icon: 'library_books', cls: 'bg-[#2563eb]/10 text-[#1e40af]' },
  VIDEO: { label: 'Video', icon: 'smart_display', cls: 'bg-[#d83b3b]/10 text-[#a32020]' },
  KUIS: { label: 'Kuis', icon: 'quiz', cls: 'bg-[#7c3aed]/10 text-[#5b21b6]' },
  TUGAS: { label: 'Tugas', icon: 'assignment', cls: 'bg-[#0891b2]/10 text-[#0e7490]' },
};
const filterJenis = ref<'' | JenisKonten>('');
const filterMk = ref(route.params.id ? String(route.params.id) : '');
watch(
  () => route.params.id,
  (v) => (filterMk.value = v ? String(v) : ''),
);
const judulKelas = computed(() => {
  const k = list.value.find((x) => String(x.jadwalKuliahId) === filterMk.value);
  return k ? `${k.kelas.namaMataKuliah} · Kelas ${k.kelas.kelas}` : null;
});
const mkOptions = computed(() => [...new Map(list.value.map((k) => [k.jadwalKuliahId, `${k.kelas.kodeMataKuliah} — ${k.kelas.namaMataKuliah}`])).entries()]);
const tampil = computed(() =>
  list.value.filter((k) => (!filterJenis.value || k.jenis === filterJenis.value) && (!filterMk.value || String(k.jadwalKuliahId) === filterMk.value)),
);
const lewat = (k: KontenMahasiswa) => !!k.tenggat && new Date(k.tenggat) < new Date();

// ---- Detail ----
const open = ref(false);
const detail = ref<KontenMahasiswa | null>(null);
const jawaban = reactive<Record<number, number | null>>({});
const AKSI: Record<JenisKonten, string> = { MATERI: 'mempelajari materi', VIDEO: 'menonton video', KUIS: 'mengerjakan kuis', TUGAS: 'mengumpulkan tugas' };
const pesanKunci = (k: KontenMahasiswa) => (k.prasyarat ? 'Selesaikan dulu dengan ' + AKSI[k.prasyarat.jenis] + ' "' + k.prasyarat.judul + '"' : '');
const buka = async (k: KontenMahasiswa) => {
  if (k.terkunci) {
    toastError(pesanKunci(k));
    return;
  }
  detail.value = null;
  open.value = true;
  Object.keys(jawaban).forEach((key) => delete jawaban[Number(key)]);
  try {
    detail.value = await mahasiswaElearningApi.detail(k.id);
    siapkanTugas(detail.value);
    muatDraf(detail.value);
  } catch (err) {
    open.value = false;
    toastError(extractErrorMessage(err, 'Gagal membuka konten'));
  }
};
const embed = computed(() => (detail.value?.jenis === 'VIDEO' ? youtubeEmbed(detail.value.url) : null));
const unduh = () => detail.value?.lampiran && downloadBlob(dataUrlToBlob(detail.value.lampiran), detail.value.lampiranNama || 'lampiran');
const HURUF = 'ABCDEF';

const mengirim = ref(false);
/** otomatis = durasi habis: kirim tanpa konfirmasi. */
const kirim = async (otomatis = false) => {
  if (!detail.value?.soal || mengirim.value) return;
  const kosong = detail.value.soal.filter((s) => jawaban[s.id] === undefined || jawaban[s.id] === null).length;
  if (!otomatis) {
    const ok = await confirmAction({
      title: 'Kirim jawaban?',
      text: kosong ? `${kosong} soal belum dijawab dan akan dihitung salah. Jawaban tidak bisa diubah setelah dikirim.` : 'Jawaban tidak bisa diubah setelah dikirim.',
      confirmLabel: 'Ya, kirim',
    });
    if (!ok) return;
  }
  mengirim.value = true;
  try {
    batalkanSimpanOtomatis();
    const r = await mahasiswaElearningApi.kirim(detail.value.id, { ...jawaban });
    toastSuccess(otomatis ? `Waktu habis — ${r.message.toLowerCase()}` : r.message);
    const id = detail.value.id;
    await load();
    detail.value = await mahasiswaElearningApi.detail(id);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengirim jawaban'));
  } finally {
    mengirim.value = false;
  }
};
const sudahDikerjakan = computed(() => !!detail.value?.hasil);

// ---- Durasi kuis: mulai, hitung mundur, kirim otomatis saat waktu habis ----
const memulai = ref(false);
const mulaiKuis = async () => {
  if (!detail.value) return;
  memulai.value = true;
  try {
    await mahasiswaElearningApi.mulaiKuis(detail.value.id);
    detail.value = await mahasiswaElearningApi.detail(detail.value.id);
    muatDraf(detail.value);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memulai kuis'));
  } finally {
    memulai.value = false;
  }
};
const sekarang = ref(Date.now());
const detakWaktu = setInterval(() => (sekarang.value = Date.now()), 1000);
onBeforeUnmount(() => clearInterval(detakWaktu));
const sisaDetik = computed(() => {
  const d = detail.value;
  if (!d || d.jenis !== 'KUIS' || d.hasil || d.perluMulai || !d.durasiMenit || !d.batasAkhir) return null;
  return Math.max(0, Math.floor((new Date(d.batasAkhir).getTime() - sekarang.value) / 1000));
});
const sisaWaktu = computed(() => {
  const v = sisaDetik.value ?? 0;
  const j = Math.floor(v / 3600);
  const m = Math.floor((v % 3600) / 60);
  return `${j ? `${j}:` : ''}${String(m).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
});
watch(sisaDetik, (v) => {
  if (v === 0 && open.value) kirim(true);
});

// ---- Draf kuis: simpan manual & otomatis, lanjutkan saat dibuka lagi ----
const drafDisimpan = ref<string | null>(null);
const menyimpanDraf = ref(false);
const drafKotor = ref(false); // ada perubahan yang belum tersimpan
let memuatDraf = false;
let timerDraf: ReturnType<typeof setTimeout> | null = null;
const bolehDraf = computed(() => detail.value?.jenis === 'KUIS' && !detail.value.hasil && !detail.value.perluMulai && !lewat(detail.value));
const muatDraf = (d: KontenMahasiswa) => {
  memuatDraf = true;
  drafKotor.value = false;
  drafDisimpan.value = d.draf?.disimpan ?? null;
  Object.entries(d.drafJawaban ?? {}).forEach(([id, v]) => {
    if (v !== null) jawaban[Number(id)] = v;
  });
  // Jangan anggap pengisian dari draf sebagai perubahan.
  setTimeout(() => (memuatDraf = false));
};
const batalkanSimpanOtomatis = () => {
  if (timerDraf) clearTimeout(timerDraf);
  timerDraf = null;
};
const simpanDraf = async (diam = false) => {
  if (!detail.value || !bolehDraf.value) return;
  batalkanSimpanOtomatis();
  menyimpanDraf.value = true;
  try {
    const r = await mahasiswaElearningApi.simpanDraf(detail.value.id, { ...jawaban });
    drafDisimpan.value = r.disimpan;
    drafKotor.value = false;
    if (!diam) toastSuccess(`Draf tersimpan (${r.terjawab}/${r.jumlahSoal} soal terjawab). Anda bisa melanjutkannya nanti.`);
  } catch (err) {
    if (!diam) toastError(extractErrorMessage(err, 'Gagal menyimpan draf'));
  } finally {
    menyimpanDraf.value = false;
  }
};
// Simpan otomatis 2 detik setelah jawaban berubah.
watch(jawaban, () => {
  if (memuatDraf || !bolehDraf.value) return;
  drafKotor.value = true;
  batalkanSimpanOtomatis();
  timerDraf = setTimeout(() => simpanDraf(true), 2000);
});
// Menutup kuis dengan perubahan tertunda: simpan dulu, lalu perbarui daftar (status draf).
watch(open, async (v) => {
  if (v) return;
  if (drafKotor.value) await simpanDraf(true);
  batalkanSimpanOtomatis();
  load();
});
onBeforeUnmount(() => {
  if (drafKotor.value) simpanDraf(true);
  batalkanSimpanOtomatis();
});
// ---- Durasi aktif membuka konten: dihitung saat detail terbuka & tab terlihat, dikirim tiap 30 detik / saat ditutup ----
let mulaiAktif: number | null = null;
const kontenAktif = computed(() => (open.value && detail.value ? detail.value.id : null));
const kirimDurasi = (id: number | null) => {
  if (!id || mulaiAktif === null) return;
  const detik = Math.round((Date.now() - mulaiAktif) / 1000);
  mulaiAktif = Date.now();
  if (detik >= 1) mahasiswaElearningApi.durasi(id, Math.min(detik, 300)).catch(() => undefined);
};
watch(kontenAktif, (baru, lama) => {
  kirimDurasi(lama ?? null);
  mulaiAktif = baru && document.visibilityState === 'visible' ? Date.now() : null;
});
const saatVisibilitas = () => {
  if (document.visibilityState === 'hidden') {
    kirimDurasi(kontenAktif.value);
    mulaiAktif = null;
  } else if (kontenAktif.value) mulaiAktif = Date.now();
};
let pingDurasi: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  document.addEventListener('visibilitychange', saatVisibilitas);
  pingDurasi = setInterval(() => kirimDurasi(kontenAktif.value), 30_000);
});
onBeforeUnmount(() => {
  kirimDurasi(kontenAktif.value);
  document.removeEventListener('visibilitychange', saatVisibilitas);
  clearInterval(pingDurasi);
});

const jamDraf = computed(() => (drafDisimpan.value ? new Date(drafDisimpan.value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''));

// ---- Tugas: jawaban teks / file ----
const tugasIsi = ref('');
// undefined = file tidak diubah, null = hapus, data URL = file baru.
const tugasFile = ref<string | null | undefined>(undefined);
const tugasFileNama = ref<string | null>(null);
const mengumpulkan = ref(false);
const siapkanTugas = (d: KontenMahasiswa) => {
  tugasIsi.value = d.jawabanTugas?.isi ?? '';
  tugasFile.value = undefined;
  tugasFileNama.value = null;
};
const unduhJawaban = () =>
  detail.value?.jawabanTugas?.lampiran && downloadBlob(dataUrlToBlob(detail.value.jawabanTugas.lampiran), detail.value.jawabanTugas.lampiranNama || 'jawaban');
const kumpulkanTugas = async () => {
  if (!detail.value) return;
  const adaFile = tugasFile.value ? true : tugasFile.value === undefined && !!detail.value.jawabanTugas?.lampiranNama;
  if (!tugasIsi.value.trim() && !adaFile) return toastError('Tulis jawaban atau unggah file tugas');
  mengumpulkan.value = true;
  try {
    const pesan = await mahasiswaElearningApi.kumpulkanTugas(detail.value.id, {
      isi: tugasIsi.value.trim() || null,
      ...(tugasFile.value !== undefined ? { lampiran: tugasFile.value, lampiranNama: tugasFileNama.value } : {}),
    });
    toastSuccess(pesan);
    const id = detail.value.id;
    await load();
    detail.value = await mahasiswaElearningApi.detail(id);
    siapkanTugas(detail.value);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengumpulkan tugas'));
  } finally {
    mengumpulkan.value = false;
  }
};

// Tandai materi / video selesai (membuka konten yang mensyaratkannya).
const menandai = ref(false);
const tandaiSelesai = async () => {
  if (!detail.value) return;
  menandai.value = true;
  try {
    await mahasiswaElearningApi.tandaiSelesai(detail.value.id);
    detail.value = { ...detail.value, selesai: true };
    toastSuccess(detail.value.jenis === 'VIDEO' ? 'Video ditandai sudah ditonton' : 'Materi ditandai sudah dipelajari');
    await load();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menandai selesai'));
  } finally {
    menandai.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader :title="judulKelas ?? 'E-learning'" subtitle="Materi, video, kuis, dan tugas dari dosen untuk kelas yang Anda ikuti." />
    <ElearningShell portal="mahasiswa">

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 mb-4 flex flex-col md:flex-row md:items-center gap-3">
      <div class="inline-flex rounded-md border border-outline-variant overflow-hidden text-label-md self-start">
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
          :class="filterJenis === f.key ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'"
          @click="filterJenis = f.key"
        >
          {{ f.label }}
        </button>
      </div>
      <select v-model="filterMk" class="md:ml-auto w-full md:w-80 px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm">
        <option value="">Semua mata kuliah</option>
        <option v-for="[id, label] in mkOptions" :key="id" :value="String(id)">{{ label }}</option>
      </select>
    </section>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat...</div>
    <div v-else-if="!tampil.length" class="p-10 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg">
      Belum ada materi, video, atau kuis dari dosen.
    </div>
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <button
        v-for="k in tampil"
        :key="k.id"
        type="button"
        class="text-left rounded-lg border border-outline-variant bg-surface-container-lowest p-4 flex gap-3 transition"
        :class="k.terkunci ? 'opacity-70 cursor-not-allowed' : 'hover:border-primary hover:shadow-sm'"
        :title="k.terkunci ? pesanKunci(k) : undefined"
        @click="buka(k)"
      >
        <img v-if="sampulKonten(k)" :src="sampulKonten(k)!" :alt="k.judul" class="w-24 sm:w-32 aspect-video object-cover rounded-md self-start shrink-0" loading="lazy" />
        <span v-else class="material-symbols-outlined rounded-lg p-2 self-start" :class="JENIS[k.jenis].cls" style="font-size: 24px">{{ JENIS[k.jenis].icon }}</span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-semibold text-on-surface">{{ k.judul }}</span>
            <span v-if="k.terkunci" class="px-2 py-0.5 rounded-full text-label-sm bg-surface-container text-on-surface-variant inline-flex items-center gap-0.5"><span class="material-symbols-outlined" style="font-size: 13px">lock</span>Terkunci</span>
            <template v-else-if="k.jenis === 'TUGAS'">
              <span v-if="k.pengumpulan?.nilai !== null && k.pengumpulan?.nilai !== undefined" class="px-2 py-0.5 rounded-full text-label-sm bg-[#059669]/15 text-[#05603a]">Nilai {{ k.pengumpulan.nilai }}</span>
              <span v-else-if="k.pengumpulan" class="px-2 py-0.5 rounded-full text-label-sm bg-[#059669]/15 text-[#05603a] inline-flex items-center gap-0.5"><span class="material-symbols-outlined" style="font-size: 13px">check_circle</span>Dikumpulkan</span>
              <span v-else-if="lewat(k)" class="px-2 py-0.5 rounded-full text-label-sm bg-error-container text-on-error-container">Lewat tenggat</span>
              <span v-else class="px-2 py-0.5 rounded-full text-label-sm bg-[#eda100]/20 text-[#7a5200]">Belum dikumpulkan</span>
              <span v-if="k.pengumpulan?.terlambat" class="px-2 py-0.5 rounded-full text-label-sm bg-[#eda100]/20 text-[#7a5200]">Terlambat</span>
            </template>
            <span v-else-if="k.jenis !== 'KUIS' && k.selesai" class="px-2 py-0.5 rounded-full text-label-sm bg-[#059669]/15 text-[#05603a] inline-flex items-center gap-0.5"><span class="material-symbols-outlined" style="font-size: 13px">check_circle</span>Selesai</span>
            <span v-else-if="k.jenis === 'KUIS' && k.hasil" class="px-2 py-0.5 rounded-full text-label-sm bg-[#059669]/15 text-[#05603a]">{{ k.hasil.skor !== null ? `Skor ${k.hasil.skor}` : 'Sudah dikerjakan' }}</span>
            <span v-else-if="k.jenis === 'KUIS' && lewat(k)" class="px-2 py-0.5 rounded-full text-label-sm bg-error-container text-on-error-container">Waktu habis</span>
            <span v-else-if="k.jenis === 'KUIS' && k.draf" class="px-2 py-0.5 rounded-full text-label-sm bg-[#2563eb]/12 text-[#1e40af] inline-flex items-center gap-0.5" :title="'Draf disimpan ' + formatDateTime(k.draf.disimpan)">
              <span class="material-symbols-outlined" style="font-size: 13px">edit_note</span>Draf · {{ k.draf.terjawab }} terjawab — lanjutkan
            </span>
            <span v-else-if="k.jenis === 'KUIS'" class="px-2 py-0.5 rounded-full text-label-sm bg-[#eda100]/20 text-[#7a5200]">Belum dikerjakan</span>
            <span v-if="k.isWajib" class="px-2 py-0.5 rounded text-label-sm bg-[#d83b3b] text-white font-semibold inline-flex items-center gap-0.5"><span class="material-symbols-outlined" style="font-size: 13px">priority_high</span>Wajib</span>
            <span v-for="t in k.tagline" :key="t" class="px-2 py-0.5 rounded text-label-sm bg-[#d1f0ec] text-[#0f5f56] font-semibold">{{ t }}</span>
            <span v-if="k.kategori" class="px-2 py-0.5 rounded text-label-sm border border-outline-variant text-on-surface-variant">{{ k.kategori }}</span>
          </div>
          <p class="text-label-sm text-on-surface-variant">
            {{ k.kelas.kodeMataKuliah }} — {{ k.kelas.namaMataKuliah }} · Kelas {{ k.kelas.kelas }}{{ k.pertemuanKe ? ` · Pertemuan ${k.pertemuanKe}` : '' }}
          </p>
          <p class="text-label-sm text-on-surface-variant">
            {{ k.kelas.dosen ?? '-' }} · {{ formatDateTime(k.createdAt) }}<template v-if="k.tenggat"> · {{ k.jenis === 'TUGAS' ? 'Tenggat' : 'Batas' }} {{ formatDateTime(k.tenggat) }}</template><template v-if="k.tersediaSampai"> · Tersedia s.d. {{ formatDateTime(k.tersediaSampai) }}</template>
          </p>
          <p v-if="k.terkunci" class="mt-1 text-label-sm text-[#b4690e] inline-flex items-center gap-1">
            <span class="material-symbols-outlined" style="font-size: 14px">lock</span>{{ pesanKunci(k) }}
          </p>
        </div>
        <!-- Penanda di kanan kartu: selesai (ceklis hijau) / terkunci -->
        <span
          v-if="k.selesai"
          class="material-symbols-outlined self-center shrink-0 text-[#059669]"
          style="font-size: 32px; font-variation-settings: 'FILL' 1"
          :title="k.jenis === 'KUIS' ? 'Kuis sudah dikerjakan' : k.jenis === 'VIDEO' ? 'Video sudah ditonton' : 'Materi sudah dipelajari'"
          aria-label="Selesai"
        >
          check_circle
        </span>
        <span v-else-if="k.terkunci" class="material-symbols-outlined self-center shrink-0 text-on-surface-variant/60" style="font-size: 28px" aria-label="Terkunci">lock</span>
      </button>
    </div>

    </ElearningShell>

    <Modal v-model="open" :title="detail?.judul ?? 'Memuat...'" :subtitle="detail ? `${detail.kelas.kodeMataKuliah} — ${detail.kelas.namaMataKuliah} · ${detail.kelas.dosen ?? ''}` : ''" size="2xl">
      <div v-if="!detail" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat...</div>
      <div v-else class="space-y-4">
        <p v-if="detail.deskripsi" class="text-body-sm whitespace-pre-line">{{ detail.deskripsi }}</p>
        <div v-if="detail.grup" class="rounded-lg border border-[#7c3aed]/30 bg-[#7c3aed]/5 p-3">
          <p class="text-label-md font-semibold text-[#5b21b6] inline-flex items-center gap-1.5">
            <span class="material-symbols-outlined" style="font-size: 18px">groups</span>
            Kamu di {{ detail.grup.nama }} · {{ detail.grup.anggota.length }} anggota
          </p>
          <ul class="mt-1.5 flex flex-wrap gap-1.5">
            <li v-for="a in detail.grup.anggota" :key="a.nim" class="px-2 py-0.5 rounded-full bg-surface-container-lowest border border-outline-variant text-label-sm">
              {{ a.nama }} <span class="text-on-surface-variant">· {{ a.nim }}</span>
            </li>
          </ul>
        </div>

        <!-- Materi -->
        <template v-if="detail.jenis === 'MATERI'">
          <div v-if="detail.isi" class="rounded-lg border border-outline-variant bg-surface-container-low/40 p-4 text-body-sm whitespace-pre-line">{{ detail.isi }}</div>
          <MateriMedia
            :video-urls="detail.videoUrls"
            :gambar="detail.gambar"
            :dokumen="detail.dokumen"
            :ambil="(berkasId) => mahasiswaElearningApi.berkas(detail!.id, berkasId)"
          />
          <div class="flex flex-wrap gap-2">
            <AppButton v-if="detail.lampiran" icon="download" @click="unduh">Unduh {{ detail.lampiranNama }}</AppButton>
            <a v-if="detail.url" :href="detail.url" target="_blank" rel="noopener">
              <AppButton variant="secondary" icon="open_in_new">Buka Link Materi</AppButton>
            </a>
          </div>
        </template>

        <!-- Video -->
        <template v-if="detail.jenis === 'VIDEO'">
          <div v-if="embed" class="aspect-video rounded-lg overflow-hidden border border-outline-variant">
            <iframe :src="embed" class="w-full h-full" :title="detail.judul" allowfullscreen />
          </div>
          <a v-if="detail.url" :href="detail.url" target="_blank" rel="noopener">
            <AppButton variant="secondary" icon="open_in_new">Buka Video di Tab Baru</AppButton>
          </a>
        </template>

        <!-- Tugas -->
        <template v-if="detail.jenis === 'TUGAS'">
          <p v-if="detail.tenggat" class="text-body-sm" :class="lewat(detail) ? 'text-error' : ''">
            Tenggat pengumpulan: <strong>{{ formatDateTime(detail.tenggat) }}</strong>{{ lewat(detail) ? ' (sudah lewat — pengumpulan ditandai terlambat)' : '' }}
          </p>
          <div v-if="detail.isi" class="rounded-lg border border-outline-variant bg-surface-container-low/40 p-4 text-body-sm whitespace-pre-line">{{ detail.isi }}</div>
          <div class="flex flex-wrap gap-2">
            <AppButton v-if="detail.lampiran" icon="download" @click="unduh">Unduh {{ detail.lampiranNama }}</AppButton>
            <a v-if="detail.url" :href="detail.url" target="_blank" rel="noopener"><AppButton variant="secondary" icon="open_in_new">Buka Link Referensi</AppButton></a>
          </div>

          <!-- Nilai dari dosen -->
          <div v-if="detail.jawabanTugas?.dinilaiAt" class="rounded-lg border border-[#059669]/40 bg-[#059669]/10 p-4">
            <p class="text-body-sm">Nilai</p>
            <p class="text-[2rem] font-bold text-[#05603a] tabular-nums leading-tight">{{ detail.jawabanTugas.nilai }}</p>
            <p v-if="detail.jawabanTugas.catatan" class="mt-1 text-body-sm whitespace-pre-line"><strong>Catatan dosen:</strong> {{ detail.jawabanTugas.catatan }}</p>
          </div>

          <!-- Jawaban mahasiswa -->
          <div class="rounded-lg border border-outline-variant p-4 space-y-3">
            <div class="flex items-center gap-2">
              <p class="font-semibold text-on-surface">Jawaban Anda</p>
              <span v-if="detail.jawabanTugas" class="text-label-sm text-on-surface-variant">
                dikumpulkan {{ formatDateTime(detail.jawabanTugas.dikumpulkan) }}{{ detail.jawabanTugas.dikumpulkanOleh ? ` oleh ${detail.jawabanTugas.dikumpulkanOleh}` : '' }}
              </span>
              <span v-if="detail.jawabanTugas?.terlambat" class="px-2 py-0.5 rounded-full text-label-sm bg-[#eda100]/20 text-[#7a5200]">Terlambat</span>
            </div>
            <p v-if="detail.grup && detail.jenis === 'TUGAS'" class="text-label-sm text-[#5b21b6] inline-flex items-center gap-1">
              <span class="material-symbols-outlined" style="font-size: 15px">groups</span>
              Tugas grup — cukup satu anggota yang mengumpulkan, otomatis berlaku untuk seluruh {{ detail.grup.nama }}.
            </p>
            <template v-if="detail.jawabanTugas?.dinilaiAt">
              <p v-if="detail.jawabanTugas.isi" class="text-body-sm whitespace-pre-line">{{ detail.jawabanTugas.isi }}</p>
              <AppButton v-if="detail.jawabanTugas.lampiran" variant="secondary" icon="download" @click="unduhJawaban">{{ detail.jawabanTugas.lampiranNama }}</AppButton>
              <p class="text-label-sm text-on-surface-variant">Tugas sudah dinilai — jawaban tidak bisa diubah.</p>
            </template>
            <template v-else>
              <textarea
                v-model="tugasIsi"
                rows="5"
                class="w-full px-3 py-2 border border-outline-variant rounded-md text-body-sm bg-surface-container-lowest"
                placeholder="Tulis jawaban (opsional bila mengunggah file)"
              />
              <FileInput v-model="tugasFile" v-model:file-name="tugasFileNama" label="File Jawaban" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg" hint="Opsional — maks. 10 MB" />
              <p v-if="detail.jawabanTugas?.lampiranNama && tugasFile === undefined" class="text-label-sm text-on-surface-variant flex items-center gap-2">
                File saat ini: <button type="button" class="font-medium text-primary hover:underline" @click="unduhJawaban">{{ detail.jawabanTugas.lampiranNama }}</button>
                <button type="button" class="text-error hover:underline" @click="tugasFile = null">Hapus file</button>
              </p>
            </template>
          </div>
        </template>

        <!-- Kuis -->
        <template v-if="detail.jenis === 'KUIS' && detail.soal">
          <div v-if="detail.hasil && detail.hasil.skor !== null" class="rounded-lg border border-[#059669]/40 bg-[#059669]/10 p-4 flex items-center gap-4">
            <p class="text-[2rem] font-bold text-[#05603a] tabular-nums">{{ detail.hasil.skor }}</p>
            <p class="text-body-sm">Benar {{ detail.hasil.benar }} dari {{ detail.hasil.jumlahSoal }} soal · dikirim {{ formatDateTime(detail.hasil.dikerjakan) }}</p>
          </div>
          <div v-else-if="detail.hasil" class="rounded-lg border border-[#059669]/40 bg-[#059669]/10 p-4 text-body-sm">
            <p class="font-semibold text-[#05603a]">Jawaban sudah terkirim · {{ formatDateTime(detail.hasil.dikerjakan) }}</p>
            <p class="text-on-surface-variant">Nilai kuis ini tidak ditampilkan oleh dosen.</p>
          </div>
          <div v-else-if="lewat(detail)" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">Batas waktu pengerjaan sudah lewat.</div>
          <div v-else-if="detail.perluMulai" class="rounded-lg border border-outline-variant p-6 text-center space-y-3">
            <span class="material-symbols-outlined text-primary" style="font-size: 40px">timer</span>
            <p class="text-body-md">
              Kuis berisi <strong>{{ detail.jumlahSoal ?? 0 }} soal</strong> dengan durasi pengerjaan <strong>{{ detail.durasiMenit }} menit</strong>.
            </p>
            <p class="text-body-sm text-on-surface-variant">
              Waktu mulai berjalan saat Anda menekan Mulai dan tidak berhenti walau halaman ditutup. Jawaban dikirim otomatis saat waktu habis.
              <template v-if="detail.tenggat"><br />Batas akhir: {{ formatDateTime(detail.tenggat) }}.</template>
            </p>
            <AppButton icon="play_arrow" :disabled="memulai" @click="mulaiKuis">{{ memulai ? 'Memulai...' : 'Mulai Kuis' }}</AppButton>
          </div>
          <p v-else-if="detail.tenggat" class="text-body-sm text-on-surface-variant">Kerjakan sebelum {{ formatDateTime(detail.tenggat) }}. Jawaban hanya bisa dikirim sekali.</p>
          <div
            v-if="sisaDetik !== null"
            class="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-body-sm font-medium"
            :class="sisaDetik <= 60 ? 'bg-error-container text-on-error-container border-error/40' : 'bg-surface-container border-outline-variant'"
          >
            <span class="inline-flex items-center gap-1"><span class="material-symbols-outlined" style="font-size: 18px">timer</span>Sisa waktu</span>
            <span class="tabular-nums text-title-sm">{{ sisaWaktu }}</span>
          </div>

          <div v-for="(s, i) in detail.soal" :key="s.id" class="rounded-lg border border-outline-variant p-4">
            <p class="font-medium mb-2 whitespace-pre-line">{{ i + 1 }}. {{ s.pertanyaan }}</p>
            <div class="space-y-1.5">
              <label
                v-for="(p, j) in s.pilihan"
                :key="j"
                class="flex items-center gap-2 px-3 py-2 rounded-md border text-body-sm"
                :class="[
                  sudahDikerjakan && s.jawabanBenar === j ? 'border-[#059669] bg-[#059669]/10' : '',
                  sudahDikerjakan && s.jawabanAnda === j && s.jawabanBenar !== j ? 'border-error bg-error-container/40' : '',
                  !sudahDikerjakan ? 'border-outline-variant cursor-pointer hover:bg-surface-container' : 'border-outline-variant',
                ]"
              >
                <input
                  v-if="!sudahDikerjakan"
                  v-model="jawaban[s.id]"
                  type="radio"
                  :name="`soal-${s.id}`"
                  :value="j"
                  class="h-4 w-4 accent-primary"
                  :disabled="lewat(detail)"
                />
                <span class="font-semibold w-5">{{ HURUF[j] }}.</span>
                <span class="flex-1">{{ p }}</span>
                <span v-if="sudahDikerjakan && s.jawabanBenar === j" class="material-symbols-outlined text-[#05603a]" style="font-size: 18px" title="Jawaban benar">check_circle</span>
                <span v-else-if="sudahDikerjakan && s.jawabanAnda === j" class="material-symbols-outlined text-error" style="font-size: 18px" title="Jawaban Anda">cancel</span>
              </label>
            </div>
          </div>
        </template>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="open = false">Tutup</AppButton>
        <template v-if="detail && (detail.jenis === 'MATERI' || detail.jenis === 'VIDEO')">
          <span v-if="detail.selesai" class="inline-flex items-center gap-1 px-3 text-label-md font-semibold text-[#05603a]"><span class="material-symbols-outlined" style="font-size: 18px">check_circle</span>Sudah selesai</span>
          <AppButton v-else icon="task_alt" :disabled="menandai" @click="tandaiSelesai">{{ detail.jenis === 'VIDEO' ? 'Tandai Sudah Ditonton' : 'Tandai Sudah Dipelajari' }}</AppButton>
        </template>
        <AppButton v-if="detail?.jenis === 'TUGAS' && !detail.jawabanTugas?.dinilaiAt" icon="upload" :disabled="mengumpulkan" @click="kumpulkanTugas">
          {{ mengumpulkan ? 'Mengirim...' : detail.jawabanTugas ? 'Perbarui Jawaban' : 'Kumpulkan Tugas' }}
        </AppButton>
        <template v-if="bolehDraf">
          <span class="mr-auto inline-flex items-center gap-1 text-label-sm text-on-surface-variant">
            <span class="material-symbols-outlined" style="font-size: 16px">{{ menyimpanDraf ? 'sync' : drafKotor ? 'edit' : 'cloud_done' }}</span>
            {{ menyimpanDraf ? 'Menyimpan draf...' : drafKotor ? 'Perubahan belum tersimpan' : drafDisimpan ? `Draf tersimpan ${jamDraf}` : 'Jawaban disimpan otomatis sebagai draf' }}
          </span>
          <AppButton variant="secondary" icon="save" :disabled="menyimpanDraf" @click="simpanDraf()">Simpan Draf</AppButton>
        </template>
        <AppButton v-if="detail?.jenis === 'KUIS' && !detail.hasil && !detail.perluMulai && !lewat(detail)" icon="send" :disabled="mengirim" @click="kirim()">
          {{ mengirim ? 'Mengirim...' : 'Kirim Jawaban' }}
        </AppButton>
      </template>
    </Modal>
  </div>
</template>

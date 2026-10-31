<script setup lang="ts">
import { ref } from 'vue';
import { dosenElearningApi, mahasiswaElearningApi, sampulKonten, type JenisKonten, type KomentarKonten, type KontenMahasiswa, type KontenRingkas } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import { formatDateTime } from '@/utils/format';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';

/**
 * Postingan timeline konten e-learning (beranda dosen): pelaku · aksi · Sesi ke-n › mata kuliah, waktu relatif, judul,
 * lalu Suka / Komentar / Bagikan dan kotak komentar (komentar dimuat saat dibuka).
 */
/**
 * portal: 'dosen' (default) atau 'mahasiswa' — menentukan API suka/komentar. Mahasiswa hanya bisa menghapus komentarnya
 * sendiri; dosen boleh memoderasi semua komentar di kontennya. inisialSaya = huruf avatar kotak komentar.
 */
const props = withDefaults(
  defineProps<{ konten: KontenRingkas | KontenMahasiswa; mataKuliah: string; kelasNama: string; portal?: 'dosen' | 'mahasiswa'; inisialSaya?: string | null }>(),
  { portal: 'dosen', inisialSaya: null },
);
const api = props.portal === 'mahasiswa' ? mahasiswaElearningApi : dosenElearningApi;
const bolehHapus = (k: KomentarKonten) => props.portal === 'dosen' || k.milikSaya;
/** Draf hanya ada di daftar konten dosen. */
const draf = 'isPublished' in props.konten && props.konten.isPublished === false;
const dilihat = props.konten.dilihat?.total ?? 0;
const emit = defineEmits<{ buka: [] }>();

const AKSI: Record<JenisKonten, { teks: string; icon: string; cls: string }> = {
  MATERI: { teks: 'menambahkan materi pada', icon: 'menu_book', cls: 'bg-[#2563eb]/10 text-[#1e40af]' },
  VIDEO: { teks: 'menambahkan video pada', icon: 'smart_display', cls: 'bg-[#db2777]/10 text-[#9d174d]' },
  KUIS: { teks: 'membuat kuis pada', icon: 'quiz', cls: 'bg-[#16a34a]/10 text-[#166534]' },
  TUGAS: { teks: 'memberikan tugas pada', icon: 'assignment', cls: 'bg-[#0891b2]/10 text-[#0e7490]' },
};

/** "4 jam lalu" dsb. */
const relatif = (iso: string) => {
  const detik = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (detik < 60) return 'baru saja';
  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 30) return `${hari} hari lalu`;
  return formatDateTime(iso);
};
const inisial = (nama?: string | null) => (nama ?? '?').trim().charAt(0).toUpperCase();

// ---- Suka ----
const suka = ref(props.konten.interaksi?.suka ?? 0);
const disukai = ref(props.konten.interaksi?.disukai ?? false);
const toggleSuka = async () => {
  // Optimistis: ubah dulu, kembalikan bila gagal.
  disukai.value = !disukai.value;
  suka.value += disukai.value ? 1 : -1;
  try {
    const r = await api.suka(props.konten.id);
    disukai.value = r.disukai;
    suka.value = r.suka;
  } catch (err) {
    disukai.value = !disukai.value;
    suka.value += disukai.value ? 1 : -1;
    toastError(extractErrorMessage(err, 'Gagal menyukai'));
  }
};

// ---- Komentar ----
const jumlahKomentar = ref(props.konten.interaksi?.komentar ?? 0);
const komentarTerbuka = ref(false);
const komentar = ref<KomentarKonten[] | null>(null);
const teks = ref('');
const mengirim = ref(false);
const bukaKomentar = async () => {
  komentarTerbuka.value = !komentarTerbuka.value;
  if (komentarTerbuka.value && !komentar.value) {
    try {
      komentar.value = await api.komentar(props.konten.id);
    } catch (err) {
      toastError(extractErrorMessage(err, 'Gagal memuat komentar'));
    }
  }
};
const kirim = async () => {
  const isi = teks.value.trim();
  if (!isi) return;
  mengirim.value = true;
  try {
    komentar.value = await api.tambahKomentar(props.konten.id, isi);
    jumlahKomentar.value = komentar.value.length;
    komentarTerbuka.value = true;
    teks.value = '';
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengirim komentar'));
  } finally {
    mengirim.value = false;
  }
};
const hapus = async (k: KomentarKonten) => {
  if (!(await confirmAction({ title: 'Hapus komentar?', text: k.isi.slice(0, 80), confirmLabel: 'Ya, hapus' }))) return;
  try {
    await api.hapusKomentar(k.id);
    komentar.value = (komentar.value ?? []).filter((x) => x.id !== k.id);
    jumlahKomentar.value = komentar.value.length;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus komentar'));
  }
};

// ---- Bagikan: salin ringkasan konten untuk dikirim ke mahasiswa ----
const bagikan = async () => {
  const link = `${window.location.origin}/mahasiswa/e-learning`;
  const isi = `${props.konten.judul}\n${props.mataKuliah} · Kelas ${props.kelasNama}\nBuka di E-learning: ${link}`;
  try {
    await navigator.clipboard.writeText(isi);
    toastSuccess('Ringkasan & link disalin — tempel ke grup kelas.');
  } catch {
    toastError('Browser tidak mengizinkan menyalin otomatis.');
  }
};
const thumb = sampulKonten(props.konten);
</script>

<template>
  <article class="rounded-xl border border-outline-variant bg-surface-container-lowest">
    <div class="p-5">
      <!-- Kepala: pelaku & konteks -->
      <div class="flex items-start gap-3">
        <span class="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-semibold shrink-0">{{ inisial(konten.namaDosen) }}</span>
        <div class="min-w-0 text-body-sm">
          <p class="text-on-surface-variant">
            <span class="font-semibold text-on-surface">{{ konten.namaDosen ?? 'Dosen' }}</span> {{ AKSI[konten.jenis].teks }}
            <template v-if="konten.pertemuanKe">
              <span class="material-symbols-outlined align-middle" style="font-size: 16px">chevron_right</span>
              <span class="text-primary font-medium">Sesi ke {{ konten.pertemuanKe }}</span>
            </template>
            <span class="material-symbols-outlined align-middle" style="font-size: 16px">chevron_right</span>
            <span class="text-primary font-medium">{{ mataKuliah }}</span>
            <span class="text-on-surface-variant"> · Kelas {{ kelasNama }}</span>
          </p>
          <p class="text-label-sm text-on-surface-variant mt-0.5" :title="formatDateTime(konten.createdAt)">
            {{ relatif(konten.createdAt) }}<template v-if="draf"> · <span class="text-[#b4690e] font-medium">Draf</span></template>
          </p>
        </div>
      </div>

      <!-- Isi -->
      <button type="button" class="mt-4 w-full text-left group" @click="emit('buka')">
        <div class="flex gap-4 items-start">
          <div class="min-w-0 flex-1">
            <h3 class="text-headline-sm font-semibold text-on-surface group-hover:text-primary flex items-center gap-2">
              <span class="material-symbols-outlined rounded-md p-1" :class="AKSI[konten.jenis].cls" style="font-size: 18px">{{ AKSI[konten.jenis].icon }}</span>
              {{ konten.judul }}
            </h3>
            <p v-if="konten.deskripsi" class="mt-1.5 text-body-sm text-on-surface line-clamp-3 whitespace-pre-line">{{ konten.deskripsi }}</p>
            <div class="mt-2 flex flex-wrap gap-1.5 text-label-sm">
              <span v-if="konten.isWajib" class="px-2 py-0.5 rounded bg-[#d83b3b] text-white font-semibold">Wajib</span>
              <span v-for="t in konten.tagline" :key="t" class="px-2 py-0.5 rounded bg-[#d1f0ec] text-[#0f5f56] font-semibold">{{ t }}</span>
              <span v-if="konten.kategori" class="px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant">{{ konten.kategori }}</span>
              <span class="px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant">👁 {{ dilihat }}× dilihat</span>
            </div>
          </div>
          <img v-if="thumb" :src="thumb" :alt="konten.judul" class="hidden sm:block w-40 aspect-video object-cover rounded-lg" loading="lazy" />
        </div>
      </button>
    </div>

    <!-- Aksi -->
    <div class="mx-5 border-t border-outline-variant py-2 flex items-center gap-2 text-label-md">
      <button type="button" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-surface-container" :class="disukai ? 'text-[#d83b3b]' : 'text-on-surface-variant'" @click="toggleSuka">
        <span class="material-symbols-outlined" :style="`font-size: 20px; font-variation-settings: 'FILL' ${disukai ? 1 : 0}`">favorite</span>
        Suka<span v-if="suka"> · {{ suka }}</span>
      </button>
      <button type="button" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-on-surface-variant hover:bg-surface-container" @click="bukaKomentar">
        <span class="material-symbols-outlined" style="font-size: 20px">chat_bubble</span>
        Komentar<span v-if="jumlahKomentar"> · {{ jumlahKomentar }}</span>
      </button>
      <button type="button" class="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-on-surface-variant hover:bg-surface-container" @click="bagikan">
        <span class="material-symbols-outlined" style="font-size: 20px">reply</span>
        Bagikan
      </button>
    </div>

    <!-- Komentar -->
    <div v-if="komentarTerbuka && komentar" class="px-5 space-y-3 pb-1">
      <p v-if="!komentar.length" class="text-label-sm text-on-surface-variant">Belum ada komentar.</p>
      <div v-for="k in komentar" :key="k.id" class="flex gap-2.5 group">
        <span class="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center text-label-md font-semibold shrink-0">{{ inisial(k.nama) }}</span>
        <div class="min-w-0 flex-1 rounded-lg bg-surface-container-low px-3 py-2">
          <p class="text-label-sm">
            <span class="font-semibold text-on-surface">{{ k.nama }}</span>
            <span class="text-on-surface-variant"> · {{ k.peran === 'DOSEN' ? 'Dosen' : 'Mahasiswa' }} · {{ relatif(k.createdAt) }}</span>
          </p>
          <p class="text-body-sm text-on-surface whitespace-pre-line">{{ k.isi }}</p>
        </div>
        <button v-if="bolehHapus(k)" type="button" class="opacity-0 group-hover:opacity-100 focus:opacity-100 text-on-surface-variant hover:text-error self-center" title="Hapus komentar" @click="hapus(k)">
          <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
        </button>
      </div>
    </div>
    <form class="px-5 pb-4 pt-2 flex items-center gap-2" @submit.prevent="kirim">
      <span class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-md font-semibold shrink-0">{{ inisial(inisialSaya ?? konten.namaDosen) }}</span>
      <input
        v-model="teks"
        maxlength="2000"
        class="flex-1 px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-body-sm focus:outline-none focus:border-primary"
        placeholder="Tambahkan komentar..."
      />
      <button type="submit" class="w-9 h-9 rounded-lg border border-outline-variant flex items-center justify-center hover:bg-surface-container disabled:opacity-50" :disabled="mengirim || !teks.trim()" aria-label="Kirim komentar">
        <span class="material-symbols-outlined" style="font-size: 18px">send</span>
      </button>
    </form>
  </article>
</template>

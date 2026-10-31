<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import ElearningShell from '@/components/elearning/ElearningShell.vue';
import Modal from '@/components/ui/Modal.vue';
import MataKuliahIlustrasi from '@/components/elearning/MataKuliahIlustrasi.vue';
import ObrolanLampiran from '@/components/elearning/ObrolanLampiran.vue';
import { obrolanApi, type KontakObrolan, type ObrolanRingkas, type PesanObrolan } from '@/api/elearningSosial';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError } from '@/utils/swal';

/**
 * E-learning → Obrolan (dosen & mahasiswa; portal dari route meta): grup per kelas (otomatis untuk kelas yang diikuti /
 * diampu) dan chat pribadi (mahasiswa–mahasiswa sekelas, dosen–mahasiswa kelasnya). Pesan teks + lampiran gambar / file;
 * pesan baru diambil berkala (polling) selama halaman terbuka & terlihat.
 */
const route = useRoute();
const router = useRouter();
const portal = route.meta.portal === 'mahasiswa' ? 'mahasiswa' : 'dosen';
const api = obrolanApi[portal];
const MAKS_LAMPIRAN = 5 * 1024 * 1024;

const daftar = ref<ObrolanRingkas[]>([]);
const loadingDaftar = ref(true);
const errorDaftar = ref<string | null>(null);
const cari = ref('');
const tab = ref<'semua' | 'KELAS' | 'PRIBADI'>('semua');

const aktifId = ref<number | null>(Number(route.query.obrolan) || null);
const aktif = computed(() => daftar.value.find((o) => o.id === aktifId.value) ?? null);
const pesan = ref<PesanObrolan[]>([]);
const adaLebihLama = ref(false);
const loadingPesan = ref(false);
const loadingLama = ref(false);
const draf = ref('');
const mengirim = ref(false);
const areaPesan = ref<HTMLElement | null>(null);
const inputPesan = ref<HTMLTextAreaElement | null>(null);
const inputFile = ref<HTMLInputElement | null>(null);
// Lampiran yang akan dikirim bersama pesan berikutnya.
const lampiran = ref<{ dataUrl: string; nama: string; tipe: string; ukuran: number } | null>(null);

const muatDaftar = async () => {
  try {
    const hasil = await api.list();
    // Obrolan yang sedang dibuka: tidak ada "belum dibaca".
    daftar.value = hasil.obrolan.map((o) => (o.id === aktifId.value ? { ...o, belumDibaca: 0 } : o));
    errorDaftar.value = null;
  } catch (err) {
    errorDaftar.value = extractErrorMessage(err, 'Gagal memuat obrolan');
  } finally {
    loadingDaftar.value = false;
  }
};

const tampil = computed(() => {
  const q = cari.value.trim().toLowerCase();
  return daftar.value.filter(
    (o) => (tab.value === 'semua' || o.jenis === tab.value) && (!q || o.nama.toLowerCase().includes(q) || o.keterangan.toLowerCase().includes(q)),
  );
});
const jumlahBelum = (jenis: 'KELAS' | 'PRIBADI') => daftar.value.filter((o) => o.jenis === jenis).reduce((s, o) => s + o.belumDibaca, 0);

const keBawah = async (halus = false) => {
  await nextTick();
  const el = areaPesan.value;
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: halus ? 'smooth' : 'auto' });
};
const dekatBawah = () => {
  const el = areaPesan.value;
  return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 160;
};

const pilih = async (id: number) => {
  aktifId.value = id;
  router.replace({ query: { ...route.query, obrolan: String(id) } });
  pesan.value = [];
  lampiran.value = null;
  loadingPesan.value = true;
  try {
    const hasil = await api.pesan(id);
    if (aktifId.value !== id) return;
    pesan.value = hasil.pesan;
    adaLebihLama.value = hasil.adaLebihLama;
    const o = daftar.value.find((x) => x.id === id);
    if (o) o.belumDibaca = 0;
    await keBawah();
    inputPesan.value?.focus();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat pesan'));
  } finally {
    loadingPesan.value = false;
  }
};
const tutup = () => {
  aktifId.value = null;
  router.replace({ query: { ...route.query, obrolan: undefined } });
};

const muatLebihLama = async () => {
  if (!aktifId.value || !pesan.value.length) return;
  loadingLama.value = true;
  const el = areaPesan.value;
  const tinggiAwal = el?.scrollHeight ?? 0;
  try {
    const hasil = await api.pesan(aktifId.value, { sebelum: pesan.value[0]!.id });
    pesan.value = [...hasil.pesan, ...pesan.value];
    adaLebihLama.value = hasil.pesan.length === 100;
    await nextTick();
    if (el) el.scrollTop = el.scrollHeight - tinggiAwal; // posisi baca tidak melompat
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat pesan sebelumnya'));
  } finally {
    loadingLama.value = false;
  }
};

const tandaiDitarik = (p: PesanObrolan) => {
  p.ditarik = true;
  p.isi = '';
  p.lampiran = null;
};

/** Tarik pesan milik sendiri (tombol ×): isi & lampiran dihapus untuk semua anggota. */
const tarikPesan = async (p: PesanObrolan) => {
  if (!aktifId.value || p.ditarik) return;
  const ok = await confirmAction({
    title: 'Tarik pesan ini?',
    text: 'Pesan akan dihapus untuk semua anggota obrolan dan diganti keterangan "Pesan ini telah ditarik".',
    confirmLabel: 'Tarik',
  });
  if (!ok) return;
  try {
    await api.tarik(aktifId.value, p.id);
    tandaiDitarik(p);
    muatDaftar();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menarik pesan'));
  }
};

/** Ambil pesan yang lebih baru dari pesan terakhir di layar. */
const ambilBaru = async () => {
  const id = aktifId.value;
  if (!id || loadingPesan.value) return;
  const terakhir = pesan.value[pesan.value.length - 1]?.id ?? 0;
  try {
    const hasil = await api.pesan(id, { setelah: terakhir, dari: pesan.value[0]?.id });
    if (aktifId.value !== id) return;
    // Pesan yang ditarik pengirimnya sejak dimuat → ganti tampilannya.
    const ditarik = new Set(hasil.ditarik ?? []);
    if (ditarik.size) pesan.value.forEach((p) => ditarik.has(p.id) && tandaiDitarik(p));
    if (!hasil.pesan.length) return;
    const ada = new Set(pesan.value.map((p) => p.id));
    const bawah = dekatBawah();
    pesan.value = [...pesan.value, ...hasil.pesan.filter((p) => !ada.has(p.id))];
    if (bawah) keBawah(true);
  } catch {
    /* polling: abaikan galat sesaat */
  }
};

// ---- Lampiran: hanya PDF, ZIP, DOCX, PPTX (maks 5 MB) — sama dengan validasi server ----
const EKSTENSI_LAMPIRAN = ['pdf', 'zip', 'docx', 'pptx'];
const pilihFile = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const ekstensi = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!EKSTENSI_LAMPIRAN.includes(ekstensi)) return toastError('File yang boleh diunggah hanya PDF, ZIP, DOCX, atau PPTX');
  if (file.size > MAKS_LAMPIRAN) return toastError('Ukuran lampiran maksimal 5 MB');
  const reader = new FileReader();
  reader.onload = () => {
    lampiran.value = { dataUrl: String(reader.result), nama: file.name, tipe: file.type || 'application/octet-stream', ukuran: file.size };
    inputPesan.value?.focus();
  };
  reader.onerror = () => toastError('Gagal membaca file');
  reader.readAsDataURL(file);
};
const ukuranTeks = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const kirim = async () => {
  const isi = draf.value.trim();
  if ((!isi && !lampiran.value) || !aktifId.value || mengirim.value) return;
  mengirim.value = true;
  try {
    const lamp = lampiran.value;
    await api.kirim(aktifId.value, { isi: isi || null, ...(lamp ? { lampiran: lamp.dataUrl, lampiranNama: lamp.nama } : {}) });
    draf.value = '';
    lampiran.value = null;
    if (inputPesan.value) inputPesan.value.style.height = 'auto';
    await ambilBaru();
    keBawah(true);
    const o = daftar.value.find((x) => x.id === aktifId.value);
    if (o) {
      o.terakhir = { isi: isi || `📎 ${lamp?.nama ?? 'lampiran'}`, waktu: new Date().toISOString(), pengirim: 'Anda', dariDosen: portal === 'dosen' };
      daftar.value = [o, ...daftar.value.filter((x) => x.id !== o.id)];
    }
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengirim pesan'));
  } finally {
    mengirim.value = false;
    inputPesan.value?.focus();
  }
};
const saatTombol = (e: KeyboardEvent) => {
  // Enter = kirim, Shift+Enter = baris baru.
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    kirim();
  }
};
const sesuaikanTinggi = (e: Event) => {
  const t = e.target as HTMLTextAreaElement;
  t.style.height = 'auto';
  t.style.height = `${t.scrollHeight}px`;
};

// ---- Polling ----
let timerPesan: ReturnType<typeof setInterval> | undefined;
let timerDaftar: ReturnType<typeof setInterval> | undefined;
onMounted(async () => {
  await muatDaftar();
  if (aktifId.value && daftar.value.some((o) => o.id === aktifId.value)) pilih(aktifId.value);
  else aktifId.value = null;
  timerPesan = setInterval(() => document.visibilityState === 'visible' && ambilBaru(), 4000);
  timerDaftar = setInterval(() => document.visibilityState === 'visible' && muatDaftar(), 15000);
});
onBeforeUnmount(() => {
  clearInterval(timerPesan);
  clearInterval(timerDaftar);
});

// ---- Pesan baru (chat pribadi) ----
const kontakOpen = ref(false);
const kontak = ref<KontakObrolan[]>([]);
const loadingKontak = ref(false);
const cariKontak = ref('');
const bukaKontak = async () => {
  kontakOpen.value = true;
  cariKontak.value = '';
  if (kontak.value.length) return;
  loadingKontak.value = true;
  try {
    kontak.value = await api.kontak();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat kontak'));
  } finally {
    loadingKontak.value = false;
  }
};
const kontakTampil = computed(() => {
  const q = cariKontak.value.trim().toLowerCase();
  return q ? kontak.value.filter((k) => k.nama.toLowerCase().includes(q) || k.nomor.toLowerCase().includes(q)) : kontak.value;
});
const kontakDosen = computed(() => kontakTampil.value.filter((k) => k.tipe === 'D'));
const kontakMahasiswa = computed(() => kontakTampil.value.filter((k) => k.tipe === 'M'));
const mulaiChat = async (k: KontakObrolan) => {
  try {
    const id = await api.mulaiPribadi({ tipe: k.tipe, id: k.id });
    kontakOpen.value = false;
    if (!daftar.value.some((o) => o.id === id)) await muatDaftar();
    pilih(id);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memulai obrolan'));
  }
};

// ---- Format ----
const inisial = (nama: string) =>
  nama
    .replace(/,.*$/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
const WARNA = ['#16a34a', '#2563eb', '#db2777', '#7c3aed', '#ea580c', '#0891b2', '#b45309'];
const warna = (teks: string) => WARNA[[...teks].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % WARNA.length];
const jam = (w: string) => new Date(w).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const tanggalKey = (w: string) => new Date(w).toDateString();
const labelTanggal = (w: string) => {
  const d = new Date(w);
  if (d.toDateString() === new Date().toDateString()) return 'Hari ini';
  if (d.toDateString() === new Date(Date.now() - 86_400_000).toDateString()) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
const waktuDaftar = (w: string) =>
  new Date(w).toDateString() === new Date().toDateString() ? jam(w) : new Date(w).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
const kunciPengirim = (p: PesanObrolan) => `${p.pengirim.tipe}${p.pengirim.nomor}`;
/** Di grup: tampilkan nama pengirim bila berbeda dari pesan sebelumnya (atau ganti hari). */
const tampilNama = (i: number) => {
  const p = pesan.value[i]!;
  if (aktif.value?.jenis !== 'KELAS' || p.saya) return false;
  const s = pesan.value[i - 1];
  return !s || kunciPengirim(s) !== kunciPengirim(p) || tanggalKey(s.waktu) !== tanggalKey(p.waktu);
};
const subjudul =
  portal === 'dosen'
    ? 'Diskusi dengan mahasiswa — grup per kelas yang Anda ampu & chat pribadi.'
    : 'Ngobrol dengan dosen & teman sekelas — grup per kelas & chat pribadi.';
</script>

<template>
  <div>
    <PageHeader title="Obrolan" :subtitle="subjudul" />
    <ElearningShell :portal="portal">
      <div
        class="grid md:grid-cols-[20rem_minmax(0,1fr)] rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden h-[calc(100vh-15rem)] min-h-[30rem]"
      >
        <!-- Daftar obrolan -->
        <aside class="flex-col min-h-0 border-r border-outline-variant" :class="aktifId ? 'hidden md:flex' : 'flex'">
          <div class="p-3 border-b border-outline-variant space-y-2">
            <div class="flex items-center gap-2">
              <div class="relative flex-1">
                <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant" style="font-size: 18px">search</span>
                <input
                  v-model="cari"
                  class="w-full pl-8 pr-2 py-1.5 border border-outline-variant rounded-md text-body-sm bg-surface-container-lowest"
                  placeholder="Cari obrolan..."
                />
              </div>
              <button
                type="button"
                class="p-1.5 rounded-md bg-primary text-on-primary hover:opacity-90"
                :title="portal === 'dosen' ? 'Pesan baru ke mahasiswa' : 'Pesan baru ke dosen / teman sekelas'"
                @click="bukaKontak"
              >
                <span class="material-symbols-outlined" style="font-size: 20px">edit_square</span>
              </button>
            </div>
            <div class="flex gap-1 text-label-md">
              <button
                v-for="t in [
                  { key: 'semua', label: 'Semua', n: 0 },
                  { key: 'KELAS', label: 'Grup Kelas', n: jumlahBelum('KELAS') },
                  { key: 'PRIBADI', label: 'Pribadi', n: jumlahBelum('PRIBADI') },
                ] as const"
                :key="t.key"
                type="button"
                class="px-2.5 py-1 rounded-full inline-flex items-center gap-1"
                :class="tab === t.key ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'"
                @click="tab = t.key"
              >
                {{ t.label }}
                <span v-if="t.n" class="min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-error text-on-error text-[10px] leading-[1.1rem] text-center">{{
                  t.n
                }}</span>
              </button>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto">
            <p v-if="loadingDaftar" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat...</p>
            <p v-else-if="errorDaftar" class="p-4 text-body-sm text-error">{{ errorDaftar }}</p>
            <p v-else-if="!tampil.length" class="p-6 text-center text-body-sm text-on-surface-variant">
              {{
                daftar.length
                  ? 'Tidak ada obrolan yang cocok.'
                  : portal === 'dosen'
                    ? 'Belum ada obrolan. Grup kelas muncul otomatis untuk kelas yang Anda ampu.'
                    : 'Belum ada obrolan. Grup kelas muncul otomatis setelah KRS disetujui.'
              }}
            </p>
            <button
              v-for="o in tampil"
              :key="o.id"
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-outline-variant/60 transition-colors"
              :class="o.id === aktifId ? 'bg-primary-container/50' : 'hover:bg-surface-container'"
              @click="pilih(o.id)"
            >
              <MataKuliahIlustrasi v-if="o.jenis === 'KELAS'" :nama="o.nama" :kode="o.kodeMataKuliah" :ikon="o.ikon" ukuran="sm" />
              <span
                v-else
                class="relative w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-white font-bold"
                :style="{ background: warna(o.keterangan) }"
              >
                {{ inisial(o.nama) }}
                <span
                  v-if="o.lawan?.tipe === 'D'"
                  class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center ring-2 ring-surface-container-lowest"
                  title="Dosen"
                >
                  <span class="material-symbols-outlined" style="font-size: 11px">school</span>
                </span>
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-baseline gap-2">
                  <span class="font-semibold text-on-surface truncate flex-1">{{ o.nama }}</span>
                  <span v-if="o.terakhir" class="text-[11px] shrink-0" :class="o.belumDibaca ? 'text-primary font-semibold' : 'text-on-surface-variant'">
                    {{ waktuDaftar(o.terakhir.waktu) }}
                  </span>
                </span>
                <span class="flex items-center gap-2">
                  <span class="text-label-sm truncate flex-1" :class="o.belumDibaca ? 'text-on-surface font-medium' : 'text-on-surface-variant'">
                    <template v-if="o.terakhir"
                      >{{ o.jenis === 'KELAS' || o.terakhir.pengirim === 'Anda' ? `${o.terakhir.pengirim}: ` : '' }}{{ o.terakhir.isi }}</template
                    >
                    <template v-else>{{ o.keterangan }}</template>
                  </span>
                  <span
                    v-if="o.belumDibaca"
                    class="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary text-on-primary text-[11px] leading-5 text-center shrink-0"
                  >
                    {{ o.belumDibaca }}
                  </span>
                </span>
              </span>
            </button>
          </div>
        </aside>

        <!-- Isi obrolan -->
        <section class="flex-col min-h-0" :class="aktifId ? 'flex' : 'hidden md:flex'">
          <div v-if="!aktif" class="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center text-on-surface-variant">
            <span class="material-symbols-outlined text-primary" style="font-size: 48px">forum</span>
            <p class="text-body-md font-medium text-on-surface">Pilih obrolan</p>
            <p class="text-body-sm">
              Pilih grup kelas di sebelah kiri, atau klik
              <span class="material-symbols-outlined align-middle" style="font-size: 16px">edit_square</span>
              untuk chat pribadi.
            </p>
          </div>
          <template v-else>
            <header class="flex items-center gap-3 px-4 py-2.5 border-b border-outline-variant">
              <button type="button" class="md:hidden text-on-surface-variant" aria-label="Kembali" @click="tutup">
                <span class="material-symbols-outlined">arrow_back</span>
              </button>
              <MataKuliahIlustrasi v-if="aktif.jenis === 'KELAS'" :nama="aktif.nama" :kode="aktif.kodeMataKuliah" :ikon="aktif.ikon" ukuran="sm" />
              <span
                v-else
                class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white font-bold"
                :style="{ background: warna(aktif.keterangan) }"
              >
                {{ inisial(aktif.nama) }}
              </span>
              <div class="min-w-0">
                <p class="font-semibold text-on-surface truncate">{{ aktif.nama }}</p>
                <p class="text-label-sm text-on-surface-variant truncate">
                  {{
                    aktif.jenis === 'KELAS'
                      ? `Grup kelas · ${aktif.keterangan}`
                      : aktif.lawan?.tipe === 'D'
                        ? `Dosen · NIDN ${aktif.keterangan}`
                        : `NIM ${aktif.keterangan}`
                  }}
                </p>
              </div>
            </header>

            <div ref="areaPesan" class="flex-1 overflow-y-auto px-4 py-3 bg-surface-container-low/60 space-y-1">
              <p v-if="loadingPesan" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat pesan...</p>
              <template v-else>
                <div v-if="adaLebihLama" class="text-center pb-2">
                  <button type="button" class="text-label-md text-primary hover:underline" :disabled="loadingLama" @click="muatLebihLama">
                    {{ loadingLama ? 'Memuat...' : 'Muat pesan sebelumnya' }}
                  </button>
                </div>
                <p v-if="!pesan.length" class="p-8 text-center text-body-sm text-on-surface-variant">Belum ada pesan. Mulai obrolan dengan menyapa 👋</p>
                <template v-for="(p, i) in pesan" :key="p.id">
                  <div v-if="i === 0 || tanggalKey(pesan[i - 1]!.waktu) !== tanggalKey(p.waktu)" class="flex justify-center py-2">
                    <span class="px-3 py-0.5 rounded-full bg-surface-container text-label-sm text-on-surface-variant">{{ labelTanggal(p.waktu) }}</span>
                  </div>
                  <div class="group flex items-end gap-2" :class="p.saya ? 'justify-end' : 'justify-start'">
                    <button
                      v-if="p.saya && !p.ditarik"
                      type="button"
                      class="self-center w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container transition md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                      title="Tarik pesan"
                      aria-label="Tarik pesan"
                      @click="tarikPesan(p)"
                    >
                      <span class="material-symbols-outlined" style="font-size: 16px">close</span>
                    </button>
                    <span
                      v-if="aktif.jenis === 'KELAS' && !p.saya"
                      class="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      :class="tampilNama(i) ? '' : 'invisible'"
                      :style="{ background: p.pengirim.tipe === 'D' ? '#8a6d2b' : warna(p.pengirim.nomor) }"
                    >
                      {{ inisial(p.pengirim.nama) }}
                    </span>
                    <div
                      class="max-w-[75%] rounded-2xl px-3 py-1.5 shadow-sm"
                      :class="
                        p.saya
                          ? 'bg-primary text-on-primary rounded-br-md'
                          : p.pengirim.tipe === 'D'
                            ? 'bg-[#fdf6e3] text-on-surface border border-[#e9c97a] rounded-bl-md'
                            : 'bg-surface-container-lowest text-on-surface border border-outline-variant/60 rounded-bl-md'
                      "
                    >
                      <p
                        v-if="tampilNama(i)"
                        class="text-label-sm font-semibold mb-0.5 flex items-center gap-1"
                        :style="{ color: p.pengirim.tipe === 'D' ? '#8a6d2b' : warna(p.pengirim.nomor) }"
                      >
                        {{ p.pengirim.nama }}
                        <span v-if="p.pengirim.tipe === 'D'" class="px-1.5 rounded bg-[#8a6d2b] text-white text-[10px] font-medium">Dosen</span>
                      </p>
                      <p v-if="p.ditarik" class="text-body-sm italic flex items-center gap-1" :class="p.saya ? 'text-on-primary/80' : 'text-on-surface-variant'">
                        <span class="material-symbols-outlined" style="font-size: 16px">block</span>
                        {{ p.saya ? 'Anda menarik pesan ini' : 'Pesan ini telah ditarik' }}
                      </p>
                      <ObrolanLampiran v-if="p.lampiran" :api="api" :obrolan-id="aktif.id" :pesan-id="p.id" :lampiran="p.lampiran" :saya="p.saya" />
                      <p v-if="p.isi" class="text-body-sm whitespace-pre-wrap break-words">{{ p.isi }}</p>
                      <p class="text-[10px] text-right mt-0.5" :class="p.saya ? 'text-on-primary/75' : 'text-on-surface-variant'">{{ jam(p.waktu) }}</p>
                    </div>
                  </div>
                </template>
              </template>
            </div>

            <!-- Lampiran yang akan dikirim -->
            <div v-if="lampiran" class="flex items-center gap-3 px-3 pt-2 border-t border-outline-variant">
              <img v-if="lampiran.tipe.startsWith('image/')" :src="lampiran.dataUrl" alt="" class="w-12 h-12 rounded-md object-cover" />
              <span v-else class="w-12 h-12 rounded-md bg-surface-container flex items-center justify-center">
                <span class="material-symbols-outlined text-on-surface-variant">attach_file</span>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-label-md font-medium truncate">{{ lampiran.nama }}</span>
                <span class="block text-label-sm text-on-surface-variant">{{ ukuranTeks(lampiran.ukuran) }}</span>
              </span>
              <button type="button" class="text-on-surface-variant hover:text-error" title="Batal lampirkan" @click="lampiran = null">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <form class="flex items-end gap-2 p-3" :class="lampiran ? '' : 'border-t border-outline-variant'" @submit.prevent="kirim">
              <input ref="inputFile" type="file" class="hidden" :accept="EKSTENSI_LAMPIRAN.map((x) => `.${x}`).join(',')" @change="pilihFile" />
              <button
                type="button"
                class="w-10 h-10 shrink-0 rounded-full text-on-surface-variant hover:bg-surface-container flex items-center justify-center"
                title="Lampirkan file PDF, ZIP, DOCX, atau PPTX (maks 5 MB)"
                @click="inputFile?.click()"
              >
                <span class="material-symbols-outlined" style="font-size: 22px">attach_file</span>
              </button>
              <textarea
                ref="inputPesan"
                v-model="draf"
                rows="1"
                maxlength="2000"
                class="flex-1 resize-none max-h-32 px-3 py-2 border border-outline-variant rounded-2xl text-body-sm bg-surface-container-lowest focus:outline-none focus:border-primary"
                placeholder="Tulis pesan... (Enter kirim, Shift+Enter baris baru)"
                @keydown="saatTombol"
                @input="sesuaikanTinggi"              />
              <button
                type="submit"
                class="w-10 h-10 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-50"
                :disabled="(!draf.trim() && !lampiran) || mengirim"
                aria-label="Kirim"
              >
                <span class="material-symbols-outlined" style="font-size: 20px">{{ mengirim ? 'hourglass_top' : 'send' }}</span>
              </button>
            </form>
          </template>
        </section>
      </div>
    </ElearningShell>

    <Modal v-model="kontakOpen" title="Pesan Baru" :subtitle="portal === 'dosen' ? 'Pilih mahasiswa kelas Anda.' : 'Pilih dosen atau teman sekelas.'" size="md">
      <input
        v-model="cariKontak"
        class="w-full mb-3 px-3 py-2 border border-outline-variant rounded-md text-body-sm bg-surface-container-lowest"
        placeholder="Cari nama, NIM, atau NIDN..."
      />
      <div class="max-h-[50vh] overflow-y-auto border border-outline-variant rounded-lg">
        <p v-if="loadingKontak" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat...</p>
        <p v-else-if="!kontakTampil.length" class="p-6 text-center text-body-sm text-on-surface-variant">
          {{ kontak.length ? 'Tidak ada yang cocok.' : 'Belum ada kontak di semester ini.' }}
        </p>
        <template
          v-for="grup in [
            { label: 'Dosen', list: kontakDosen },
            { label: portal === 'dosen' ? 'Mahasiswa' : 'Teman sekelas', list: kontakMahasiswa },
          ]"
          :key="grup.label"
        >
          <template v-if="grup.list.length">
            <p class="sticky top-0 px-3 py-1.5 bg-surface-container text-label-sm font-semibold text-on-surface-variant">
              {{ grup.label }} ({{ grup.list.length }})
            </p>
            <button
              v-for="k in grup.list"
              :key="`${k.tipe}-${k.id}`"
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-container border-b border-outline-variant/60"
              @click="mulaiChat(k)"
            >
              <span
                class="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white text-label-sm font-bold"
                :style="{ background: k.tipe === 'D' ? '#8a6d2b' : warna(k.nomor) }"
              >
                {{ inisial(k.nama) }}
              </span>
              <span class="min-w-0">
                <span class="block font-medium text-on-surface truncate">{{ k.nama }}</span>
                <span class="block text-label-sm text-on-surface-variant truncate" :title="k.keterangan">
                  {{ k.tipe === 'D' ? 'NIDN' : 'NIM' }} {{ k.nomor }} · {{ k.keterangan }}
                </span>
              </span>
            </button>
          </template>
        </template>
      </div>
    </Modal>
  </div>
</template>

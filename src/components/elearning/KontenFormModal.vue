<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import FileInput from '@/components/ui/FileInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import {
  dosenElearningApi,
  youtubeEmbed,
  videoEmbed,
  LINK_VIDEO_MATERI,
  type BerkasMateri,
  SARAN_KATEGORI,
  SARAN_TAGLINE,
  type JenisKonten,
  type PesertaKelas,
  type SoalKuis,
  type TargetKonten,
} from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';
import { downloadBlob } from '@/utils/download';

/**
 * Form tambah / ubah konten e-learning dosen: Materi (teks + lampiran file + link), Video (link, pratinjau YouTube),
 * Kuis (soal pilihan ganda + kunci jawaban, batas waktu). Penerima: seluruh peserta kelas atau mahasiswa terpilih.
 */
const props = defineProps<{
  jadwalKuliahId: number;
  jenis: JenisKonten;
  kontenId: number | null;
  peserta: PesertaKelas[];
  /** Konten lain di kelas yang sama sebagai pilihan prasyarat. */
  pilihanPrasyarat?: { id: number; judul: string; jenis: JenisKonten; pertemuanKe: number | null }[];
  /** Konten baru: nomor pertemuan awal (mis. sesi yang sedang dipilih di halaman kelas). */
  pertemuanAwal?: number | null;
}>();
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ saved: [] }>();

// Pilihan prasyarat: konten lain di kelas ini (bukan konten yang sedang diubah).
const opsiPrasyarat = computed(() => (props.pilihanPrasyarat ?? []).filter((k) => k.id !== props.kontenId));
const AKSI_PRASYARAT: Record<string, string> = { MATERI: 'mempelajari materi', VIDEO: 'menonton video', KUIS: 'mengerjakan kuis', TUGAS: 'mengumpulkan tugas' };
const prasyaratTerpilih = computed(() => opsiPrasyarat.value.find((k) => k.id === form.prasyaratId) ?? null);

// ---- Tagline (bisa lebih dari satu) ----
const MAKS_TAGLINE = 5;
const taglineBaru = ref('');
const tambahTagline = (teks: string) => {
  const t = teks.trim();
  taglineBaru.value = '';
  if (!t || form.tagline.length >= MAKS_TAGLINE || form.tagline.some((x) => x.toLowerCase() === t.toLowerCase())) return;
  form.tagline.push(t);
};
const hapusTagline = (t: string) => (form.tagline = form.tagline.filter((x) => x !== t));
const saranTagline = computed(() => SARAN_TAGLINE.filter((o) => !form.tagline.some((x) => x.toLowerCase() === o.toLowerCase())));

const LABEL: Record<JenisKonten, string> = {
  MATERI: 'Materi',
  VIDEO: 'Video',
  KUIS: 'Kuis',
  TUGAS: 'Tugas',
};
const soalKosong = (): SoalKuis => ({
  pertanyaan: '',
  pilihan: ['', '', '', ''],
  jawabanBenar: null,
});
const form = reactive({
  judul: '',
  kategori: '',
  tagline: [] as string[],
  deskripsi: '',
  isi: '',
  url: '',
  pertemuanKe: '' as string | number,
  tenggat: '',
  durasiMenit: '' as string | number,
  acakSoal: false,
  tampilkanHasil: false,
  tersediaMulai: '',
  tersediaSampai: '',
  target: 'SEMUA' as TargetKonten,
  penerima: [] as number[],
  isPublished: true,
  isWajib: false,
  prasyaratId: '' as number | '',
  soal: [soalKosong()] as SoalKuis[],
});
// Lampiran: undefined = tidak diubah (saat ubah), null = hapus, data URL = file baru.
const lampiran = ref<string | null | undefined>(undefined);
const lampiranNama = ref<string | null>(null);
const lampiranLama = ref<string | null>(null);
// ---- Materi: Gambar, Video (link YouTube / Google Drive), Dokumen — masing-masing bisa lebih dari satu ----
// Gambar & dokumen baru diunggah satu per satu setelah materi tersimpan; yang lama dihapus bila dibuang dari daftar.
interface BerkasBaru {
  kunci: number;
  nama: string;
  data: string;
  ukuran: number;
}
const videoList = ref<string[]>([]);
const gambarLama = ref<BerkasMateri[]>([]);
const dokumenLama = ref<BerkasMateri[]>([]);
const gambarBaru = ref<BerkasBaru[]>([]);
const dokumenBaru = ref<BerkasBaru[]>([]);
const berkasDihapus = ref<number[]>([]);
// Gambar dikompres server (maks. 1920 px, JPEG) sebelum disimpan; batas ini untuk file asli.
const MAKS_GAMBAR = 10 * 1024 * 1024;
const MAKS_DOKUMEN = 10 * 1024 * 1024;
const AKSEP_DOKUMEN = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt';
let kunciBerkas = 0;
const inputGambar = ref<HTMLInputElement | null>(null);
const inputDokumen = ref<HTMLInputElement | null>(null);

const pilihBerkas = async (e: Event, jenis: 'GAMBAR' | 'DOKUMEN') => {
  const input = e.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = '';
  const maks = jenis === 'GAMBAR' ? MAKS_GAMBAR : MAKS_DOKUMEN;
  for (const f of files) {
    if (jenis === 'GAMBAR' && !f.type.startsWith('image/')) {
      toastError(`${f.name} bukan file gambar`);
      continue;
    }
    if (f.size > maks) {
      toastError(`${f.name} melebihi 10 MB`);
      continue;
    }
    const item: BerkasBaru = { kunci: (kunciBerkas += 1), nama: f.name, data: await bacaFile(f), ukuran: f.size };
    (jenis === 'GAMBAR' ? gambarBaru : dokumenBaru).value.push(item);
  }
};
const buangLama = (jenis: BerkasMateri['jenis'], b: BerkasMateri) => {
  const list = jenis === 'GAMBAR' ? gambarLama : dokumenLama;
  list.value = list.value.filter((x) => x.id !== b.id);
  berkasDihapus.value.push(b.id);
};
const ukuranTeks = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const videoTerisi = computed(() => videoList.value.map((v) => v.trim()).filter(Boolean));

const soalTerkunci = ref(false);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const cariPeserta = ref('');
// Target GRUP: nama tiap grup + grupOf[mahasiswaId] = indeks grup (tidak ada = belum masuk grup).
const grupNama = ref<string[]>(['Grup 1', 'Grup 2']);
const grupOf = ref<Record<number, number>>({});
// Jadwal tayang: 'langsung' = tampil saat disimpan tanpa batas; 'periode' = atur tersedia mulai–sampai.
const modeTayang = ref<'langsung' | 'periode'>('langsung');
// Dideklarasikan sebelum reset(): watch(open) berjalan immediate saat form dibuat dalam keadaan terbuka.
const errorImpor = ref<{ row: number; message: string }[]>([]);

const reset = () => {
  Object.assign(form, {
    judul: '',
    kategori: '',
    tagline: [],
    deskripsi: '',
    isi: '',
    url: '',
    pertemuanKe: '',
    tenggat: '',
    durasiMenit: '',
    acakSoal: false,
    tampilkanHasil: false,
  tersediaMulai: '',
  tersediaSampai: '',
    target: 'SEMUA',
    penerima: [],
    isPublished: true,
    isWajib: false,
    prasyaratId: '',
    soal: [soalKosong()],
  });
  lampiran.value = undefined;
  lampiranNama.value = null;
  videoList.value = [];
  gambarLama.value = [];
  dokumenLama.value = [];
  gambarBaru.value = [];
  dokumenBaru.value = [];
  berkasDihapus.value = [];
  grupNama.value = ['Grup 1', 'Grup 2'];
  grupOf.value = {};
  lampiranLama.value = null;
  soalTerkunci.value = false;
  error.value = null;
  cariPeserta.value = '';
  errorImpor.value = [];
  modeTayang.value = 'langsung';
};
// datetime-local butuh "YYYY-MM-DDTHH:mm" waktu lokal.
const keLokal = (v: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

watch(
  open,
  async (v) => {
    if (!v) return;
    reset();
    if (!props.kontenId) {
      // Konten baru dari sesi tertentu: isi "Pertemuan ke-" otomatis.
      if (props.pertemuanAwal) form.pertemuanKe = props.pertemuanAwal;
      return;
    }
    loading.value = true;
    try {
      const k = await dosenElearningApi.konten(props.kontenId);
      Object.assign(form, {
        judul: k.judul,
        kategori: k.kategori ?? '',
        tagline: [...(k.tagline ?? [])],
        deskripsi: k.deskripsi ?? '',
        isi: k.isi ?? '',
        url: k.url ?? '',
        pertemuanKe: k.pertemuanKe ?? '',
        tenggat: keLokal(k.tenggat),
        durasiMenit: k.durasiMenit ?? '',
        acakSoal: !!k.acakSoal,
        tampilkanHasil: k.tampilkanHasil !== false,
        tersediaMulai: keLokal(k.tersediaMulai),
        tersediaSampai: keLokal(k.tersediaSampai),
        target: k.target,
        penerima: k.penerima,
        isPublished: k.isPublished,
        isWajib: k.isWajib,
        prasyaratId: k.prasyaratId ?? '',
        soal: k.soal.length ? k.soal.map((s) => ({ ...s, pilihan: [...s.pilihan] })) : [soalKosong()],
      });
      lampiranLama.value = k.lampiranNama;
      videoList.value = [...(k.videoUrls ?? [])];
      gambarLama.value = [...(k.gambar ?? [])];
      dokumenLama.value = [...(k.dokumen ?? [])];
      if (k.grup?.length) {
        grupNama.value = k.grup.map((g) => g.nama);
        grupOf.value = Object.fromEntries(k.grup.flatMap((g, i) => g.anggota.map((id) => [id, i])));
      }
      modeTayang.value = k.tersediaMulai || k.tersediaSampai ? 'periode' : 'langsung';
      soalTerkunci.value = k.soalTerkunci;
    } catch (err) {
      error.value = extractErrorMessage(err, 'Gagal memuat konten');
    } finally {
      loading.value = false;
    }
  },
  // immediate: form bisa dibuat (v-if) tepat saat dibuka — data konten tetap dimuat.
  { immediate: true },
);

// ---- Penerima ----
const pesertaTampil = computed(() => {
  const q = cariPeserta.value.trim().toLowerCase();
  return q ? props.peserta.filter((p) => p.nim.toLowerCase().includes(q) || p.nama.toLowerCase().includes(q)) : props.peserta;
});
const semuaTerpilih = computed(() => props.peserta.length > 0 && form.penerima.length === props.peserta.length);
const pilihSemua = () => (form.penerima = semuaTerpilih.value ? [] : props.peserta.map((p) => p.id));

// ---- Grup ----
const anggotaGrup = (i: number) => props.peserta.filter((p) => grupOf.value[p.id] === i);
const belumGrup = computed(() => props.peserta.filter((p) => grupOf.value[p.id] === undefined).length);
const aturGrup = (id: number, v: string) => {
  const i = Number(v);
  if (v === '' || Number.isNaN(i)) delete grupOf.value[id];
  else grupOf.value[id] = i;
};
const tambahGrup = () => grupNama.value.push(`Grup ${grupNama.value.length + 1}`);
const hapusGrup = (i: number) => {
  if (grupNama.value.length <= 1) return;
  grupNama.value.splice(i, 1);
  // Anggota grup terhapus jadi belum bergrup; indeks grup setelahnya bergeser.
  grupOf.value = Object.fromEntries(
    Object.entries(grupOf.value)
      .filter(([, g]) => g !== i)
      .map(([id, g]) => [id, g > i ? g - 1 : g]),
  );
};
const jumlahGrup = computed({
  get: () => grupNama.value.length,
  set: (n: number) => {
    const target = Math.max(1, Math.min(Number(n) || 1, Math.max(props.peserta.length, 1), 100));
    while (grupNama.value.length < target) tambahGrup();
    while (grupNama.value.length > target) hapusGrup(grupNama.value.length - 1);
  },
});
/** Bagi seluruh peserta kelas secara acak & merata ke grup yang ada. */
const acakGrup = () => {
  const ids = props.peserta.map((p) => p.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  grupOf.value = Object.fromEntries(ids.map((id, i) => [id, i % grupNama.value.length]));
};

// ---- Soal ----
const tambahSoal = () => form.soal.push(soalKosong());
const hapusSoal = (i: number) => form.soal.length > 1 && form.soal.splice(i, 1);
const tambahPilihan = (s: SoalKuis) => s.pilihan.length < 6 && s.pilihan.push('');
const hapusPilihan = (s: SoalKuis, j: number) => {
  if (s.pilihan.length <= 2) return;
  s.pilihan.splice(j, 1);
  if (s.jawabanBenar === j) s.jawabanBenar = null;
  else if (s.jawabanBenar !== null && s.jawabanBenar > j) s.jawabanBenar -= 1;
};
const HURUF = 'ABCDEF';

// ---- Import soal dari Excel ----
const fileSoalRef = ref<HTMLInputElement | null>(null);
const mengimpor = ref(false);
const unduhTemplate = async () => {
  try {
    downloadBlob(await dosenElearningApi.templateSoal(), 'template-soal-kuis.xlsx');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengunduh template'));
  }
};
const bacaFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
/** Soal hasil import ditambahkan setelah soal yang ada (soal kosong bawaan form dibuang). */
const imporSoal = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  mengimpor.value = true;
  errorImpor.value = [];
  try {
    const r = await dosenElearningApi.importSoal(await bacaFile(file));
    const terisi = form.soal.filter((s) => s.pertanyaan.trim() || s.pilihan.some((p) => p.trim()));
    form.soal = [
      ...terisi,
      ...r.soal.map((s) => ({
        pertanyaan: s.pertanyaan,
        pilihan: [...s.pilihan],
        jawabanBenar: s.jawabanBenar,
      })),
    ];
    if (!form.soal.length) form.soal = [soalKosong()];
    errorImpor.value = r.errors;
    if (r.soal.length) toastSuccess(`${r.message}. Periksa soal lalu klik Simpan.`);
    else toastError(r.message);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membaca file Excel'));
  } finally {
    mengimpor.value = false;
  }
};

const embed = computed(() => (props.jenis === 'VIDEO' ? youtubeEmbed(form.url) : null));

const simpan = async () => {
  error.value = null;
  if (!form.judul.trim()) return (error.value = 'Judul wajib diisi');
  if (props.jenis === 'VIDEO' && !form.url.trim()) return (error.value = 'Link video wajib diisi');
  if (props.jenis === 'TUGAS' && !form.isi.trim() && !form.deskripsi.trim() && !lampiran.value && !lampiranLama.value) {
    return (error.value = 'Tugas wajib berisi instruksi atau lampiran soal');
  }
  if (modeTayang.value === 'periode' && !form.tersediaMulai && !form.tersediaSampai) {
    return (error.value = 'Isi waktu tersedia mulai dan/atau sampai, atau pilih tayang langsung');
  }
  if (modeTayang.value === 'periode' && form.tersediaMulai && form.tersediaSampai && new Date(form.tersediaSampai) <= new Date(form.tersediaMulai)) {
    return (error.value = 'Akhir periode tayang harus setelah awal periode');
  }
  if (props.jenis === 'MATERI') {
    const salahVideo = videoTerisi.value.find((v) => !LINK_VIDEO_MATERI.test(v));
    if (salahVideo) return (error.value = `Link video harus dari YouTube atau Google Drive: ${salahVideo}`);
    const adaMedia = videoTerisi.value.length || gambarLama.value.length || dokumenLama.value.length || gambarBaru.value.length || dokumenBaru.value.length;
    if (!form.isi.trim() && !form.url.trim() && !lampiran.value && !lampiranLama.value && !adaMedia) {
      return (error.value = 'Materi wajib berisi teks, gambar, video, dokumen, atau link');
    }
  }
  if (form.target === 'PILIHAN' && !form.penerima.length) return (error.value = 'Pilih minimal satu mahasiswa penerima');
  if (form.target === 'GRUP' && !Object.keys(grupOf.value).length) return (error.value = 'Masukkan mahasiswa ke grup, atau klik Acak anggota');
  if (props.jenis === 'KUIS') {
    const salah = form.soal.findIndex((s) => !s.pertanyaan.trim() || s.pilihan.some((p) => !p.trim()) || s.jawabanBenar === null);
    if (salah >= 0) return (error.value = `Soal ${salah + 1}: lengkapi pertanyaan, semua pilihan, dan tandai jawaban yang benar`);
  }
  saving.value = true;
  try {
    const { pesan, id: kontenId } = await dosenElearningApi.simpan(
      props.jadwalKuliahId,
      {
        jenis: props.jenis,
        judul: form.judul.trim(),
        kategori: form.kategori.trim() || null,
        tagline: form.tagline,
        deskripsi: form.deskripsi.trim() || null,
        isi: form.isi.trim() || null,
        url: form.url.trim() || null,
        ...(lampiran.value !== undefined ? { lampiran: lampiran.value, lampiranNama: lampiranNama.value } : {}),
        ...(props.jenis === 'MATERI' ? { videoUrls: videoTerisi.value, jumlahBerkasBaru: gambarBaru.value.length + dokumenBaru.value.length } : {}),
        pertemuanKe: form.pertemuanKe ? Number(form.pertemuanKe) : null,
        tenggat: form.tenggat ? new Date(form.tenggat).toISOString() : null,
        ...(props.jenis === 'KUIS' ? { durasiMenit: form.durasiMenit ? Number(form.durasiMenit) : null, acakSoal: form.acakSoal, tampilkanHasil: form.tampilkanHasil } : {}),
        tersediaMulai: modeTayang.value === 'periode' && form.tersediaMulai ? new Date(form.tersediaMulai).toISOString() : null,
        tersediaSampai: modeTayang.value === 'periode' && form.tersediaSampai ? new Date(form.tersediaSampai).toISOString() : null,
        target: form.target,
        penerima: form.target === 'PILIHAN' ? form.penerima : [],
        grup: form.target === 'GRUP' ? grupNama.value.map((nama, i) => ({ nama: nama.trim() || `Grup ${i + 1}`, anggota: anggotaGrup(i).map((p) => p.id) })) : [],
        isPublished: form.isPublished,
        isWajib: form.isWajib,
        prasyaratId: form.prasyaratId || null,
        soal:
          props.jenis === 'KUIS'
            ? form.soal.map((s) => ({
                pertanyaan: s.pertanyaan.trim(),
                pilihan: s.pilihan.map((p) => p.trim()),
                jawabanBenar: s.jawabanBenar,
              }))
            : [],
      },
      props.kontenId ?? undefined,
    );
    if (props.jenis === 'MATERI') {
      // Gambar & dokumen: hapus yang dibuang, lalu unggah yang baru satu per satu.
      const gagal: string[] = [];
      for (const id of berkasDihapus.value) await dosenElearningApi.hapusBerkas(kontenId, id).catch(() => undefined);
      const unggah = [
        ...gambarBaru.value.map((b) => ({ ...b, jenis: 'GAMBAR' as const })),
        ...dokumenBaru.value.map((b) => ({ ...b, jenis: 'DOKUMEN' as const })),
      ];
      for (const b of unggah) {
        try {
          await dosenElearningApi.tambahBerkas(kontenId, { jenis: b.jenis, nama: b.nama, data: b.data });
        } catch (err) {
          gagal.push(`${b.nama} (${extractErrorMessage(err, 'gagal')})`);
        }
      }
      if (gagal.length) toastError(`Materi tersimpan, tetapi ${gagal.length} file gagal diunggah: ${gagal.join('; ')}`);
    }
    toastSuccess(pesan);
    open.value = false;
    emit('saved');
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal menyimpan konten');
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Modal v-model="open" :title="`${kontenId ? 'Ubah' : 'Tambah'} ${LABEL[jenis]}`" size="2xl">
    <div v-if="loading" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat...</div>
    <div v-else class="space-y-4">
      <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
        {{ error }}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-[1fr_9rem] gap-4">
        <TextInput v-model="form.judul" label="Judul" required :placeholder="jenis === 'KUIS' ? 'mis. Kuis Pertemuan 3' : 'mis. Pengantar Komunikasi Publik'" />
        <TextInput v-model="form.pertemuanKe" label="Pertemuan ke-" type="number" placeholder="opsional" />
      </div>
      <!-- Prasyarat -->
      <div class="rounded-lg border border-outline-variant px-4 py-3">
        <label class="block">
          <span class="block text-label-md font-medium text-on-surface mb-1">Prasyarat</span>
          <select v-model="form.prasyaratId" class="w-full px-3 py-2 border border-outline-variant rounded-md text-body-md bg-surface-container-lowest">
            <option value="">Tanpa prasyarat — bisa langsung dibuka</option>
            <option v-for="k in opsiPrasyarat" :key="k.id" :value="k.id">
              {{ LABEL[k.jenis] }}{{ k.pertemuanKe ? ` · P${k.pertemuanKe}` : '' }} — {{ k.judul }}
            </option>
          </select>
        </label>
        <p class="mt-1 text-label-sm text-on-surface-variant">
          <template v-if="prasyaratTerpilih">
            Mahasiswa harus {{ AKSI_PRASYARAT[prasyaratTerpilih.jenis] }} <strong>{{ prasyaratTerpilih.judul }}</strong> sebelum bisa membuka konten ini.
          </template>
          <template v-else-if="!opsiPrasyarat.length">Belum ada konten lain di kelas ini yang bisa dijadikan prasyarat.</template>
          <template v-else>Pilih video / materi / kuis sebelumnya yang wajib diselesaikan lebih dulu.</template>
        </p>
      </div>

      <!-- Wajib / opsional -->
      <div class="rounded-lg border border-outline-variant px-4 py-2">
        <CheckboxToggle
          v-model="form.isWajib"
          :label="form.isWajib ? 'Wajib' : 'Tidak wajib (opsional)'"
          :description="
            form.isWajib
              ? 'Mahasiswa wajib ' + (jenis === 'KUIS' ? 'mengerjakan kuis ini.' : jenis === 'VIDEO' ? 'menonton video ini.' : 'mempelajari materi ini.')
              : 'Konten tambahan / pengayaan, boleh dilewati mahasiswa.'
          "
        />
      </div>

      <!-- Kategori & tagline: pilih dari saran atau ketik sendiri -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="block">
          <span class="block text-label-md font-medium text-on-surface mb-1">Kategori</span>
          <input
            v-model="form.kategori"
            list="saran-kategori"
            maxlength="50"
            class="w-full px-3 py-2 border border-outline-variant rounded-md text-body-md bg-surface-container-lowest"
            placeholder="mis. Kuliah, Praktikum, Pengayaan"
          />
          <datalist id="saran-kategori">
            <option v-for="o in SARAN_KATEGORI" :key="o" :value="o" />
          </datalist>
        </label>
        <div>
          <span class="block text-label-md font-medium text-on-surface mb-1">Tagline <span class="font-normal text-on-surface-variant">(bisa lebih dari satu)</span></span>
          <!-- Chip terpilih + ketik tagline baru (Enter / koma untuk menambah) -->
          <div
            class="w-full min-h-[42px] px-2 py-1.5 border border-outline-variant rounded-md bg-surface-container-lowest flex flex-wrap items-center gap-1.5 focus-within:border-primary"
          >
            <span v-for="t in form.tagline" :key="t" class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded bg-[#d1f0ec] text-[#0f5f56] text-label-sm font-semibold">
              {{ t }}
              <button type="button" class="hover:text-error leading-none" :aria-label="`Hapus tagline ${t}`" @click="hapusTagline(t)">
                <span class="material-symbols-outlined" style="font-size: 15px">close</span>
              </button>
            </span>
            <input
              v-if="form.tagline.length < MAKS_TAGLINE"
              v-model="taglineBaru"
              maxlength="30"
              class="flex-1 min-w-[8rem] px-1 py-0.5 text-body-md bg-transparent outline-none"
              :placeholder="form.tagline.length ? 'Tambah lagi...' : 'Ketik lalu Enter, mis. Wajib'"
              @keydown.enter.prevent="tambahTagline(taglineBaru)"
              @keydown="(e: KeyboardEvent) => e.key === ',' && (e.preventDefault(), tambahTagline(taglineBaru))"
              @keydown.backspace="!taglineBaru && form.tagline.length && form.tagline.pop()"
              @blur="tambahTagline(taglineBaru)"
            />
          </div>
          <!-- Saran: klik untuk menambah -->
          <div v-if="saranTagline.length && form.tagline.length < MAKS_TAGLINE" class="mt-1.5 flex flex-wrap gap-1.5">
            <button
              v-for="o in saranTagline"
              :key="o"
              type="button"
              class="px-2 py-0.5 rounded border border-dashed border-outline-variant text-label-sm text-on-surface-variant hover:border-primary hover:text-primary"
              @click="tambahTagline(o)"
            >
              + {{ o }}
            </button>
          </div>
          <span class="block mt-1 text-label-sm text-on-surface-variant">Tampil sebagai badge sorotan di kartu konten (maks. {{ MAKS_TAGLINE }}).</span>
        </div>
      </div>
      <TextareaInput v-model="form.deskripsi" label="Deskripsi / Petunjuk" :rows="2" placeholder="opsional" />

      <!-- Materi -->
      <template v-if="jenis === 'MATERI'">
        <TextareaInput v-model="form.isi" label="Isi Materi" :rows="6" placeholder="Tulis ringkasan / isi materi (opsional bila ada gambar, video, dokumen, atau link)" />

        <!-- Gambar -->
        <div>
          <span class="block font-medium text-label-md text-on-surface mb-1.5">Gambar</span>
          <div v-if="gambarLama.length || gambarBaru.length" class="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
            <div v-for="g in gambarLama" :key="`l${g.id}`" class="relative rounded-md border border-outline-variant bg-surface-container p-2 text-label-sm">
              <span class="material-symbols-outlined text-on-surface-variant">image</span>
              <span class="block truncate" :title="g.nama">{{ g.nama }}</span>
              <button type="button" class="absolute top-1 right-1 text-on-surface-variant hover:text-error" title="Hapus gambar" @click="buangLama('GAMBAR', g)">
                <span class="material-symbols-outlined" style="font-size: 16px">close</span>
              </button>
            </div>
            <div v-for="g in gambarBaru" :key="`b${g.kunci}`" class="relative rounded-md overflow-hidden border border-outline-variant aspect-video">
              <img :src="g.data" :alt="g.nama" class="w-full h-full object-cover" />
              <button
                type="button"
                class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                title="Batal"
                @click="gambarBaru = gambarBaru.filter((x) => x.kunci !== g.kunci)"
              >
                <span class="material-symbols-outlined" style="font-size: 14px">close</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            class="w-full py-5 rounded-lg border border-dashed border-outline-variant bg-surface-container-low text-primary text-label-md font-medium underline hover:bg-surface-container"
            @click="inputGambar?.click()"
          >
            Tambahkan Gambar
          </button>
          <input ref="inputGambar" type="file" accept="image/*" multiple class="hidden" @change="pilihBerkas($event, 'GAMBAR')" />
          <span class="block mt-1 text-label-sm text-on-surface-variant">JPG / PNG, bisa lebih dari satu — maks. 10 MB per gambar (otomatis dikompres saat disimpan).</span>
        </div>

        <!-- Video -->
        <div>
          <span class="block font-medium text-label-md text-on-surface mb-1.5">Video</span>
          <div v-for="(_, i) in videoList" :key="i" class="flex items-start gap-2 mb-2">
            <div class="flex-1">
              <TextInput v-model="videoList[i]" :placeholder="`Link YouTube / Google Drive video ${i + 1}`" />
              <div v-if="videoEmbed(videoList[i])" class="mt-2 aspect-video max-w-md rounded-lg overflow-hidden border border-outline-variant bg-black">
                <iframe :src="videoEmbed(videoList[i])!" class="w-full h-full" :title="`Pratinjau video ${i + 1}`" allowfullscreen />
              </div>
            </div>
            <button type="button" class="mt-2.5 text-on-surface-variant hover:text-error" title="Hapus video" @click="videoList.splice(i, 1)">
              <span class="material-symbols-outlined" style="font-size: 20px">close</span>
            </button>
          </div>
          <button
            type="button"
            class="w-full py-5 rounded-lg border border-dashed border-outline-variant bg-surface-container-low text-primary text-label-md font-medium underline hover:bg-surface-container disabled:opacity-50"
            :disabled="videoList.length >= 10"
            @click="videoList.push('')"
          >
            Tambahkan Video
          </button>
          <span class="block mt-1 text-label-sm text-on-surface-variant">
            Tempel link YouTube atau Google Drive (pastikan file Drive dibagikan "Siapa saja yang memiliki link") — maks. 10 video.
          </span>
        </div>

        <!-- Dokumen -->
        <div>
          <span class="block font-medium text-label-md text-on-surface mb-1.5">Dokumen</span>
          <ul v-if="dokumenLama.length || dokumenBaru.length || (lampiranLama && lampiran === undefined)" class="mb-2 divide-y divide-outline-variant border border-outline-variant rounded-lg">
            <li v-if="lampiranLama && lampiran === undefined" class="flex items-center gap-2 px-3 py-2 text-body-sm">
              <span class="material-symbols-outlined text-primary" style="font-size: 18px">attach_file</span>
              <span class="flex-1 truncate">{{ lampiranLama }}</span>
              <button type="button" class="text-on-surface-variant hover:text-error" title="Hapus lampiran" @click="((lampiran = null), (lampiranLama = null))">
                <span class="material-symbols-outlined" style="font-size: 18px">close</span>
              </button>
            </li>
            <li v-for="d in dokumenLama" :key="`l${d.id}`" class="flex items-center gap-2 px-3 py-2 text-body-sm">
              <span class="material-symbols-outlined text-primary" style="font-size: 18px">description</span>
              <span class="flex-1 truncate">{{ d.nama }}</span>
              <span class="text-label-sm text-on-surface-variant">{{ ukuranTeks(d.ukuran) }}</span>
              <button type="button" class="text-on-surface-variant hover:text-error" title="Hapus dokumen" @click="buangLama('DOKUMEN', d)">
                <span class="material-symbols-outlined" style="font-size: 18px">close</span>
              </button>
            </li>
            <li v-for="d in dokumenBaru" :key="`b${d.kunci}`" class="flex items-center gap-2 px-3 py-2 text-body-sm">
              <span class="material-symbols-outlined text-primary" style="font-size: 18px">upload_file</span>
              <span class="flex-1 truncate">{{ d.nama }}</span>
              <span class="text-label-sm text-on-surface-variant">{{ ukuranTeks(d.ukuran) }}</span>
              <button type="button" class="text-on-surface-variant hover:text-error" title="Batal" @click="dokumenBaru = dokumenBaru.filter((x) => x.kunci !== d.kunci)">
                <span class="material-symbols-outlined" style="font-size: 18px">close</span>
              </button>
            </li>
          </ul>
          <button
            type="button"
            class="w-full py-5 rounded-lg border border-dashed border-outline-variant bg-surface-container-low text-primary text-label-md font-medium underline hover:bg-surface-container"
            @click="inputDokumen?.click()"
          >
            Tambahkan Dokumen
          </button>
          <input ref="inputDokumen" type="file" :accept="AKSEP_DOKUMEN" multiple class="hidden" @change="pilihBerkas($event, 'DOKUMEN')" />
          <span class="block mt-1 text-label-sm text-on-surface-variant">PDF, Word, PowerPoint, Excel, ZIP, atau TXT, bisa lebih dari satu — maks. 10 MB per file.</span>
        </div>

        <TextInput v-model="form.url" label="Link Materi" placeholder="https://... (website, Google Drive folder, dll — opsional)" />
      </template>

      <!-- Tugas -->
      <template v-if="jenis === 'TUGAS'">
        <TextareaInput v-model="form.isi" label="Instruksi Tugas" :rows="6" placeholder="Jelaskan tugas: apa yang dikerjakan, format jawaban, kriteria penilaian..." />
        <div>
          <FileInput
            v-model="lampiran"
            v-model:file-name="lampiranNama"
            label="Lampiran Soal"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg"
            hint="Opsional — PDF, Word, PowerPoint, Excel, ZIP, atau gambar, maks. 10 MB"
          />
          <p v-if="lampiranLama && lampiran === undefined" class="mt-1 text-label-sm text-on-surface-variant flex items-center gap-2">
            Lampiran saat ini:
            <span class="font-medium">{{ lampiranLama }}</span>
            <button type="button" class="text-error hover:underline" @click="((lampiran = null), (lampiranLama = null))">Hapus lampiran</button>
          </p>
        </div>
        <TextInput v-model="form.url" label="Link Referensi" placeholder="https://... (opsional)" />
        <TextInput
          v-model="form.tenggat"
          label="Tenggat Pengumpulan"
          type="datetime-local"
          hint="Kosongkan bila tanpa tenggat. Pengumpulan setelah tenggat tetap diterima tetapi ditandai terlambat."
        />
      </template>

      <!-- Video -->
      <template v-if="jenis === 'VIDEO'">
        <TextInput v-model="form.url" label="Link Video" required placeholder="https://www.youtube.com/watch?v=..." />
        <div v-if="embed" class="aspect-video rounded-lg overflow-hidden border border-outline-variant">
          <iframe :src="embed" class="w-full h-full" title="Pratinjau video" allowfullscreen />
        </div>
        <p v-else-if="form.url" class="text-label-sm text-on-surface-variant">
          Pratinjau hanya untuk link YouTube; link lain dibuka di tab baru oleh mahasiswa.
        </p>
      </template>

      <!-- Kuis -->
      <template v-if="jenis === 'KUIS'">
        <div class="grid sm:grid-cols-2 gap-4">
          <TextInput
            v-model="form.durasiMenit"
            label="Durasi Pengerjaan (menit)"
            type="number"
            min="1"
            max="600"
            placeholder="mis. 30"
            hint="Dihitung sejak mahasiswa menekan Mulai. Kosongkan bila tanpa durasi."
          />
          <TextInput v-model="form.tenggat" label="Batas Waktu Pengerjaan" type="datetime-local" hint="Kosongkan bila tanpa batas waktu" />
        </div>
        <div class="rounded-lg border border-outline-variant px-4 py-2 divide-y divide-outline-variant">
          <CheckboxToggle
            v-model="form.acakSoal"
            :label="form.acakSoal ? 'Acak pertanyaan' : 'Urutan pertanyaan tetap'"
            description="Bila aktif, urutan pertanyaan diacak setiap kali mahasiswa membuka kuis."
          />
          <CheckboxToggle
            v-model="form.tampilkanHasil"
            :label="form.tampilkanHasil ? 'Nilai ditampilkan ke mahasiswa' : 'Nilai tidak ditampilkan ke mahasiswa'"
            description="Bila aktif, setelah kuis dikirim mahasiswa melihat nilai, jumlah benar & pembahasan (kunci jawaban)."
          />
        </div>
        <div v-if="soalTerkunci" class="px-3 py-2 rounded-md border border-[#eda100]/50 bg-[#eda100]/10 text-body-sm">
          Sudah ada mahasiswa yang mengerjakan kuis ini — soal & kunci jawaban tidak bisa diubah (judul, deskripsi, batas waktu & penerima masih bisa).
        </div>
        <!-- Import soal dari Excel -->
        <div v-if="!soalTerkunci" class="rounded-lg border border-dashed border-outline-variant p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex-1 text-body-sm">
            <p class="font-medium text-on-surface">Import soal dari Excel</p>
            <p class="text-label-sm text-on-surface-variant">
              Unduh template, isi Pertanyaan, Pilihan A–F, dan Jawaban Benar (huruf), lalu import. Soal ditambahkan ke daftar di bawah.
            </p>
          </div>
          <div class="flex gap-2">
            <AppButton variant="secondary" icon="download" @click="unduhTemplate">Unduh Template</AppButton>
            <AppButton variant="secondary" icon="upload_file" :disabled="mengimpor" @click="fileSoalRef?.click()">{{
              mengimpor ? 'Membaca...' : 'Import Excel'
            }}</AppButton>
            <input ref="fileSoalRef" type="file" accept=".xlsx" class="hidden" @change="imporSoal" />
          </div>
        </div>
        <div v-if="errorImpor.length" class="px-3 py-2 rounded-md border border-[#eda100]/50 bg-[#eda100]/10 text-body-sm">
          <p class="font-medium mb-1">{{ errorImpor.length }} baris tidak diimpor:</p>
          <ul class="list-disc pl-5 space-y-0.5">
            <li v-for="e in errorImpor" :key="e.row">Baris {{ e.row }}: {{ e.message }}</li>
          </ul>
        </div>

        <div class="space-y-3">
          <div v-for="(s, i) in form.soal" :key="i" class="rounded-lg border border-outline-variant p-4 bg-surface-container-low/40">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-semibold text-primary">Soal {{ i + 1 }}</span>
              <button v-if="!soalTerkunci && form.soal.length > 1" type="button" class="ml-auto text-error text-label-md hover:underline" @click="hapusSoal(i)">
                Hapus soal
              </button>
            </div>
            <textarea
              v-model="s.pertanyaan"
              rows="2"
              class="w-full px-3 py-2 border border-outline-variant rounded-md text-body-sm bg-surface-container-lowest disabled:opacity-70"
              placeholder="Tulis pertanyaan"
              :disabled="soalTerkunci"
            />
            <p class="mt-3 mb-1 text-label-sm text-on-surface-variant">Pilihan jawaban — klik lingkaran untuk menandai jawaban benar</p>
            <div class="space-y-2">
              <div v-for="(_, j) in s.pilihan" :key="j" class="flex items-center gap-2">
                <input
                  v-model="s.jawabanBenar"
                  type="radio"
                  :name="`benar-${i}`"
                  :value="j"
                  class="h-4 w-4 accent-[#2e7d5b]"
                  :disabled="soalTerkunci"
                  :title="'Tandai sebagai jawaban benar'"
                />
                <span class="w-5 text-label-md font-semibold text-on-surface-variant">{{ HURUF[j] }}.</span>
                <input
                  v-model="s.pilihan[j]"
                  class="flex-1 px-3 py-1.5 border rounded-md text-body-sm bg-surface-container-lowest"
                  :class="s.jawabanBenar === j ? 'border-[#2e7d5b] ring-1 ring-[#2e7d5b]/40' : 'border-outline-variant'"
                  :placeholder="`Pilihan ${HURUF[j]}`"
                  :disabled="soalTerkunci"
                />
                <button
                  v-if="!soalTerkunci && s.pilihan.length > 2"
                  type="button"
                  class="text-on-surface-variant hover:text-error"
                  title="Hapus pilihan"
                  @click="hapusPilihan(s, j)"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">close</span>
                </button>
              </div>
            </div>
            <button
              v-if="!soalTerkunci && s.pilihan.length < 6"
              type="button"
              class="mt-2 text-primary text-label-md hover:underline"
              @click="tambahPilihan(s)"
            >
              + Tambah pilihan
            </button>
          </div>
          <AppButton v-if="!soalTerkunci" variant="secondary" icon="add" @click="tambahSoal">Tambah Soal</AppButton>
        </div>
      </template>

      <!-- Jadwal tayang: langsung / per periode -->
      <div class="rounded-lg border border-outline-variant p-4">
        <p class="text-label-md font-semibold text-on-surface mb-2">Jadwal Tayang</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label
            v-for="m in [
              { key: 'langsung', judul: 'Langsung', ket: 'Tampil begitu disimpan, tanpa batas waktu.', icon: 'bolt' },
              { key: 'periode', judul: 'Per periode', ket: 'Tampil hanya di antara waktu yang diatur.', icon: 'date_range' },
            ] as const"
            :key="m.key"
            class="flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors"
            :class="modeTayang === m.key ? 'border-primary bg-primary-container/40' : 'border-outline-variant hover:bg-surface-container-low'"
          >
            <input v-model="modeTayang" type="radio" :value="m.key" class="mt-1 h-4 w-4 accent-primary" />
            <span>
              <span class="flex items-center gap-1 font-semibold text-on-surface">
                <span class="material-symbols-outlined" style="font-size: 18px">{{ m.icon }}</span>{{ m.judul }}
              </span>
              <span class="block text-label-sm text-on-surface-variant">{{ m.ket }}</span>
            </span>
          </label>
        </div>
        <template v-if="modeTayang === 'periode'">
          <p class="mt-3 mb-2 text-label-sm text-on-surface-variant">
            Mahasiswa hanya melihat {{ LABEL[jenis].toLowerCase() }} ini di antara waktu berikut{{ jenis === 'KUIS' ? ' — kuis hanya bisa dibuka & dikerjakan di periode ini' : '' }}.
            Salah satu boleh dikosongkan.
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput v-model="form.tersediaMulai" label="Tersedia mulai" type="datetime-local" />
            <TextInput v-model="form.tersediaSampai" label="Tersedia sampai" type="datetime-local" />
          </div>
        </template>
      </div>

      <!-- Penerima -->
      <div class="rounded-lg border border-outline-variant p-4">
        <p class="text-label-md font-semibold text-on-surface mb-2">Ditujukan kepada</p>
        <div class="flex flex-wrap gap-5 text-body-sm">
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input v-model="form.target" type="radio" value="SEMUA" class="h-4 w-4 accent-primary" />
            Semua peserta kelas ({{ peserta.length }} mahasiswa)
          </label>
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input v-model="form.target" type="radio" value="PILIHAN" class="h-4 w-4 accent-primary" />
            Mahasiswa tertentu
          </label>
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input v-model="form.target" type="radio" value="KAMPUS" class="h-4 w-4 accent-primary" />
            Semua mahasiswa kampus
          </label>
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input v-model="form.target" type="radio" value="GRUP" class="h-4 w-4 accent-primary" />
            Grup
          </label>
        </div>
        <p v-if="form.target === 'KAMPUS'" class="mt-2 text-label-sm text-on-surface-variant">
          Terlihat oleh seluruh mahasiswa aktif di kampus (semua prodi), termasuk yang tidak mengambil kelas ini.
        </p>
        <div v-if="form.target === 'PILIHAN'" class="mt-3">
          <div class="flex items-center gap-3 mb-2">
            <input
              v-model="cariPeserta"
              class="flex-1 px-3 py-1.5 border border-outline-variant rounded-md text-body-sm bg-surface-container-lowest"
              placeholder="Cari NIM / nama..."
            />
            <button type="button" class="text-primary text-label-md hover:underline whitespace-nowrap" @click="pilihSemua">
              {{ semuaTerpilih ? 'Batal pilih semua' : 'Pilih semua' }}
            </button>
            <span class="text-label-sm text-on-surface-variant whitespace-nowrap">{{ form.penerima.length }} dipilih</span>
          </div>
          <div class="max-h-56 overflow-y-auto border border-outline-variant rounded-md divide-y divide-outline-variant">
            <label v-for="p in pesertaTampil" :key="p.id" class="flex items-center gap-3 px-3 py-2 text-body-sm cursor-pointer hover:bg-surface-container">
              <input v-model="form.penerima" type="checkbox" :value="p.id" class="h-4 w-4 accent-primary" />
              <span class="w-32 text-on-surface-variant">{{ p.nim }}</span>
              <span>{{ p.nama }}</span>
            </label>
            <p v-if="!pesertaTampil.length" class="px-3 py-4 text-center text-body-sm text-on-surface-variant">Tidak ada peserta.</p>
          </div>
        </div>
        <!-- Grup: atur anggota manual per mahasiswa, atau acak merata -->
        <div v-if="form.target === 'GRUP'" class="mt-3 space-y-3">
          <div class="flex flex-wrap items-center gap-3">
            <label class="inline-flex items-center gap-2 text-body-sm">
              Jumlah grup
              <input
                v-model.lazy.number="jumlahGrup"
                type="number"
                min="1"
                :max="Math.max(peserta.length, 1)"
                class="w-20 px-2 py-1.5 border border-outline-variant rounded-md text-body-sm bg-surface-container-lowest"
              />
            </label>
            <AppButton variant="secondary" icon="shuffle" :disabled="!peserta.length" @click="acakGrup">Acak anggota</AppButton>
            <AppButton variant="secondary" icon="add" :disabled="grupNama.length >= Math.max(peserta.length, 1)" @click="tambahGrup">Tambah grup</AppButton>
            <span class="text-label-sm" :class="belumGrup ? 'text-[#7a5200]' : 'text-on-surface-variant'">
              {{ belumGrup ? `${belumGrup} mahasiswa belum masuk grup (tidak menerima konten)` : 'Semua peserta sudah masuk grup' }}
            </span>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="(_, i) in grupNama" :key="i" class="rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
              <div class="flex items-center gap-2 mb-2">
                <span class="material-symbols-outlined text-primary" style="font-size: 18px">groups</span>
                <input
                  v-model="grupNama[i]"
                  class="flex-1 min-w-0 px-2 py-1 border border-outline-variant rounded-md text-body-sm font-semibold bg-transparent"
                  :placeholder="`Grup ${i + 1}`"
                  maxlength="60"
                />
                <span class="text-label-sm text-on-surface-variant whitespace-nowrap">{{ anggotaGrup(i).length }} orang</span>
                <button
                  type="button"
                  class="text-on-surface-variant hover:text-error disabled:opacity-40"
                  :disabled="grupNama.length <= 1"
                  title="Hapus grup"
                  @click="hapusGrup(i)"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
                </button>
              </div>
              <ul class="space-y-1 max-h-36 overflow-y-auto">
                <li v-for="p in anggotaGrup(i)" :key="p.id" class="flex items-center gap-2 text-body-sm">
                  <span class="truncate flex-1">{{ p.nama }}</span>
                  <span class="text-label-sm text-on-surface-variant">{{ p.nim }}</span>
                  <button type="button" class="text-on-surface-variant hover:text-error" title="Keluarkan dari grup" @click="aturGrup(p.id, '')">
                    <span class="material-symbols-outlined" style="font-size: 16px">close</span>
                  </button>
                </li>
                <li v-if="!anggotaGrup(i).length" class="text-label-sm text-on-surface-variant italic">Belum ada anggota</li>
              </ul>
            </div>
          </div>

          <div>
            <input
              v-model="cariPeserta"
              class="w-full mb-2 px-3 py-1.5 border border-outline-variant rounded-md text-body-sm bg-surface-container-lowest"
              placeholder="Cari NIM / nama untuk mengatur grupnya..."
            />
            <div class="max-h-56 overflow-y-auto border border-outline-variant rounded-md divide-y divide-outline-variant">
              <div v-for="p in pesertaTampil" :key="p.id" class="flex items-center gap-3 px-3 py-2 text-body-sm">
                <span class="w-32 text-on-surface-variant">{{ p.nim }}</span>
                <span class="flex-1">{{ p.nama }}</span>
                <select
                  :value="grupOf[p.id] ?? ''"
                  class="px-2 py-1 border border-outline-variant rounded-md text-body-sm bg-surface-container-lowest"
                  @change="aturGrup(p.id, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">— Belum ada grup —</option>
                  <option v-for="(nama, i) in grupNama" :key="i" :value="i">{{ nama || `Grup ${i + 1}` }}</option>
                </select>
              </div>
              <p v-if="!pesertaTampil.length" class="px-3 py-4 text-center text-body-sm text-on-surface-variant">Tidak ada peserta.</p>
            </div>
          </div>
        </div>
      </div>

      <label class="inline-flex items-center gap-2 text-body-sm cursor-pointer">
        <input v-model="form.isPublished" type="checkbox" class="h-4 w-4 accent-primary" />
        Terbitkan sekarang (bila tidak dicentang, tersimpan sebagai draf dan belum terlihat mahasiswa)
      </label>
    </div>

    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="open = false">Batal</AppButton>
      <AppButton icon="save" :disabled="saving || loading" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
    </template>
  </Modal>
</template>

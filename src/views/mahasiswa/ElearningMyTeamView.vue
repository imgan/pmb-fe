<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import ElearningShell from '@/components/elearning/ElearningShell.vue';
import MataKuliahIlustrasi from '@/components/elearning/MataKuliahIlustrasi.vue';
import { mahasiswaElearningApi, type JenisKonten, type KontenTim } from '@/api/elearning';
import { extractErrorMessage } from '@/api/http';
import { formatDateTime } from '@/utils/format';

/**
 * Portal Mahasiswa → E-learning → My Team: tugas & konten grup (target GRUP) yang memuat mahasiswa ini —
 * nama grup, anggota satu tim (tugas: siapa saja yang sudah mengumpulkan), tenggat & status. Klik → buka kontennya.
 */
const list = ref<KontenTim[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const filter = ref<'semua' | 'belum' | 'selesai'>('semua');

onMounted(async () => {
  loading.value = true;
  try {
    list.value = await mahasiswaElearningApi.tim();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat My Team');
  } finally {
    loading.value = false;
  }
});

const jumlahBelum = computed(() => list.value.filter((k) => !k.selesai).length);
const tampil = computed(() => {
  const rows = filter.value === 'semua' ? list.value : list.value.filter((k) => (filter.value === 'selesai' ? k.selesai : !k.selesai));
  // Belum selesai dulu, tenggat terdekat di atas.
  return [...rows].sort((a, b) => Number(a.selesai) - Number(b.selesai) || (a.tenggat ?? '9999').localeCompare(b.tenggat ?? '9999'));
});

const JENIS: Record<JenisKonten, { label: string; icon: string; cls: string }> = {
  MATERI: { label: 'Materi', icon: 'library_books', cls: 'bg-[#2563eb]/10 text-[#1e40af]' },
  VIDEO: { label: 'Video', icon: 'smart_display', cls: 'bg-[#d83b3b]/10 text-[#a32020]' },
  KUIS: { label: 'Kuis', icon: 'quiz', cls: 'bg-[#7c3aed]/10 text-[#5b21b6]' },
  TUGAS: { label: 'Tugas', icon: 'assignment', cls: 'bg-[#0891b2]/10 text-[#0e7490]' },
};
const lewatTenggat = (k: KontenTim) => !!k.tenggat && !k.selesai && new Date(k.tenggat) < new Date();
const status = (k: KontenTim) => {
  if (k.jenis === 'TUGAS') {
    if (k.pengumpulan?.nilai !== null && k.pengumpulan?.nilai !== undefined) return { label: `Nilai ${k.pengumpulan.nilai}`, cls: 'bg-[#16a34a]/12 text-[#166534]' };
    if (k.pengumpulan) return { label: k.pengumpulan.terlambat ? 'Dikumpulkan (terlambat)' : 'Dikumpulkan', cls: 'bg-[#16a34a]/12 text-[#166534]' };
    return lewatTenggat(k) ? { label: 'Lewat tenggat', cls: 'bg-error-container text-on-error-container' } : { label: 'Belum dikumpulkan', cls: 'bg-[#eda100]/20 text-[#7a5200]' };
  }
  if (k.jenis === 'KUIS' && k.hasil) return { label: k.hasil.skor !== null ? `Skor ${k.hasil.skor}` : 'Sudah dikerjakan', cls: 'bg-[#16a34a]/12 text-[#166534]' };
  return k.selesai ? { label: 'Selesai', cls: 'bg-[#16a34a]/12 text-[#166534]' } : { label: 'Belum selesai', cls: 'bg-surface-container text-on-surface-variant' };
};
/** Anggota yang mengunggah tugas grup (satu pengumpulan berlaku untuk seluruh tim). */
const pengunggah = (k: KontenTim) => k.grup.anggota.find((a) => a.pengunggah) ?? k.grup.anggota.find((a) => a.dikumpulkan) ?? null;
const inisial = (nama: string) =>
  nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
</script>

<template>
  <div>
    <PageHeader title="My Team" subtitle="Tugas dan konten kelompok yang dibagikan dosen ke grup Anda." />
    <ElearningShell portal="mahasiswa">
      <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat...</div>
      <div
        v-else-if="!list.length"
        class="p-10 text-center bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col items-center gap-2 text-on-surface-variant"
      >
        <span class="material-symbols-outlined text-primary" style="font-size: 40px">groups</span>
        <p class="text-body-sm">Belum ada tugas grup. Saat dosen membagikan tugas / konten per grup, tim Anda akan tampil di sini.</p>
      </div>
      <template v-else>
        <div class="flex flex-wrap gap-2 mb-4">
          <button
            v-for="f in [
              { key: 'semua', label: `Semua (${list.length})` },
              { key: 'belum', label: `Perlu dikerjakan (${jumlahBelum})` },
              { key: 'selesai', label: `Selesai (${list.length - jumlahBelum})` },
            ] as const"
            :key="f.key"
            type="button"
            class="px-3 py-1.5 rounded-full text-label-md border transition-colors"
            :class="filter === f.key ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface hover:bg-surface-container'"
            @click="filter = f.key"
          >
            {{ f.label }}
          </button>
        </div>
        <p v-if="!tampil.length" class="p-6 text-center text-body-sm text-on-surface-variant">Tidak ada data.</p>
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <RouterLink
            v-for="k in tampil"
            :key="k.id"
            :to="{ name: 'mahasiswa-elearning-kelas', params: { id: k.jadwalKuliahId }, query: { konten: k.id } }"
            class="group rounded-xl border border-outline-variant bg-surface-container-lowest p-4 hover:border-primary hover:shadow-sm transition flex flex-col gap-3"
          >
            <div class="flex items-start gap-3">
              <MataKuliahIlustrasi :nama="k.kelas.namaMataKuliah" :kode="k.kelas.kodeMataKuliah" :ikon="k.ikon" ukuran="sm" />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <span class="px-2 py-0.5 rounded text-label-sm font-medium inline-flex items-center gap-0.5" :class="JENIS[k.jenis].cls">
                    <span class="material-symbols-outlined" style="font-size: 13px">{{ JENIS[k.jenis].icon }}</span>{{ JENIS[k.jenis].label }}
                  </span>
                  <span class="px-2 py-0.5 rounded-full text-label-sm" :class="status(k).cls">{{ status(k).label }}</span>
                  <span v-if="k.terkunci" class="px-2 py-0.5 rounded-full text-label-sm bg-surface-container text-on-surface-variant inline-flex items-center gap-0.5">
                    <span class="material-symbols-outlined" style="font-size: 13px">lock</span>Terkunci
                  </span>
                </div>
                <p class="font-semibold text-on-surface leading-snug">{{ k.judul }}</p>
                <p class="text-label-sm text-on-surface-variant truncate">
                  {{ k.kelas.namaMataKuliah }} · Kelas {{ k.kelas.kelas }}{{ k.kelas.dosen ? ` · ${k.kelas.dosen}` : '' }}
                </p>
                <p v-if="k.tenggat" class="text-label-sm mt-0.5" :class="lewatTenggat(k) ? 'text-error font-medium' : 'text-on-surface-variant'">
                  Tenggat {{ formatDateTime(k.tenggat) }}
                </p>
              </div>
            </div>

            <div class="rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20 p-3">
              <p class="text-label-md font-semibold text-[#5b21b6] inline-flex items-center gap-1.5 mb-2">
                <span class="material-symbols-outlined" style="font-size: 18px">groups</span>
                {{ k.grup.nama }} · {{ k.grup.anggota.length }} anggota
              </p>
              <ul class="flex flex-wrap gap-2">
                <li
                  v-for="a in k.grup.anggota"
                  :key="a.nim"
                  class="inline-flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full bg-surface-container-lowest border text-label-sm"
                  :class="a.saya ? 'border-[#7c3aed]' : 'border-outline-variant'"
                  :title="k.jenis === 'TUGAS' ? (a.dikumpulkan ? (a.pengunggah ? `Mengunggah ${formatDateTime(a.dikumpulkan)}` : 'Sudah terkumpul (tugas grup)') : 'Belum mengumpulkan') : a.nim"
                >
                  <span class="w-6 h-6 rounded-full bg-[#7c3aed]/15 text-[#5b21b6] flex items-center justify-center text-[10px] font-bold">{{ inisial(a.nama) }}</span>
                  {{ a.nama }}<span v-if="a.saya" class="text-[#5b21b6] font-medium">(Anda)</span>
                  <span v-if="k.jenis === 'TUGAS' && a.pengunggah" class="material-symbols-outlined text-[#5b21b6]" style="font-size: 15px" title="Mengunggah tugas">upload</span>
                  <span
                    v-if="k.jenis === 'TUGAS'"
                    class="material-symbols-outlined"
                    :class="a.dikumpulkan ? 'text-[#16a34a]' : 'text-on-surface-variant/50'"
                    style="font-size: 15px; font-variation-settings: 'FILL' 1"
                  >
                    {{ a.dikumpulkan ? 'check_circle' : 'radio_button_unchecked' }}
                  </span>
                </li>
              </ul>
              <p v-if="k.jenis === 'TUGAS'" class="mt-2 text-label-sm text-on-surface-variant">
                <template v-if="pengunggah(k)">
                  Sudah dikumpulkan untuk seluruh tim oleh <strong class="text-on-surface">{{ pengunggah(k)!.saya ? 'Anda' : pengunggah(k)!.nama }}</strong>
                  · {{ formatDateTime(pengunggah(k)!.dikumpulkan) }}
                </template>
                <template v-else>Belum dikumpulkan — cukup satu anggota yang mengunggah untuk seluruh tim.</template>
              </p>
            </div>
          </RouterLink>
        </div>
      </template>
    </ElearningShell>
  </div>
</template>

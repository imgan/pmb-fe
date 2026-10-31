<script setup lang="ts">
import { computed, ref } from 'vue';
import type { JenisKonten } from '@/api/elearning';
import { toastInfo } from '@/utils/swal';

/**
 * "Bagikan sesuatu di kelas Anda": tombol cepat membuat konten. Materi / Tugas / Video Interaktif / Kuis membuka form
 * (emit 'buat'); menu lain belum tersedia (label "Segera"). Baris kedua tampil lewat "Lihat menu lengkap".
 */
const emit = defineEmits<{ buat: [jenis: JenisKonten] }>();

const AKSI: { label: string; icon: string; warna: string; jenis?: JenisKonten; segera?: boolean; baru?: boolean }[] = [
  { label: 'Materi', icon: 'menu_book', warna: 'bg-[#2563eb]/12 text-[#1e40af]', jenis: 'MATERI' },
  { label: 'Tugas', icon: 'assignment', warna: 'bg-[#0891b2]/12 text-[#0e7490]', jenis: 'TUGAS' },
  { label: 'Live Conference', icon: 'video_camera_front', warna: 'bg-[#4f46e5]/12 text-[#3730a3]', segera: true },
  { label: 'Ujian CBT', icon: 'fact_check', warna: 'bg-[#059669]/12 text-[#05603a]', segera: true, baru: true },
  { label: 'Video Interaktif', icon: 'smart_display', warna: 'bg-[#db2777]/12 text-[#9d174d]', jenis: 'VIDEO' },
  { label: 'Kuis', icon: 'quiz', warna: 'bg-[#16a34a]/12 text-[#166534]', jenis: 'KUIS' },
  { label: 'Survei', icon: 'ballot', warna: 'bg-[#ca8a04]/15 text-[#854d0e]', segera: true },
  { label: 'Info', icon: 'campaign', warna: 'bg-[#0284c7]/12 text-[#075985]', segera: true },
];
const lengkap = ref(false);
const tampil = computed(() => (lengkap.value ? AKSI : AKSI.slice(0, 4)));
const pilih = (a: (typeof AKSI)[number]) => {
  if (a.jenis) emit('buat', a.jenis);
  else toastInfo(`${a.label} segera hadir.`);
};
</script>

<template>
  <section class="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
    <h2 class="text-label-md font-semibold text-primary mb-4">Bagikan sesuatu di kelas Anda:</h2>
    <div class="grid grid-cols-4 gap-y-5 gap-x-2">
      <button v-for="a in tampil" :key="a.label" type="button" class="group relative flex flex-col items-center gap-2 text-center" @click="pilih(a)">
        <span class="relative w-12 h-12 rounded-xl flex items-center justify-center transition group-hover:scale-105" :class="[a.warna, a.segera ? 'opacity-70' : '']">
          <span class="material-symbols-outlined" style="font-size: 26px; font-variation-settings: 'FILL' 1">{{ a.icon }}</span>
          <span v-if="a.baru" class="absolute -top-2 -right-5 px-1.5 py-0.5 rounded-full bg-[#d83b3b] text-white text-[10px] font-bold shadow">Baru!</span>
        </span>
        <span class="text-label-sm text-on-surface-variant leading-tight">{{ a.label }}</span>
        <span v-if="a.segera" class="text-[10px] text-on-surface-variant/70 -mt-1.5">Segera</span>
      </button>
    </div>
    <div class="mt-4 text-center">
      <button type="button" class="inline-flex items-center gap-1 text-label-md font-semibold text-primary hover:underline" @click="lengkap = !lengkap">
        {{ lengkap ? 'Tutup menu lengkap' : 'Lihat menu lengkap' }}
        <span class="material-symbols-outlined" style="font-size: 18px">{{ lengkap ? 'expand_less' : 'expand_more' }}</span>
      </button>
    </div>
  </section>
</template>

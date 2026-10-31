<script setup lang="ts">
import { computed } from 'vue';
import { temaIkon } from '@/utils/ikonMataKuliah';

/**
 * Ilustrasi animasi kecil untuk kartu mata kuliah: tema pilihan mata kuliah, atau ditebak dari kata kunci nama (basis data, jaringan,
 * web, pemrograman, bahasa, grafika, audio visual, matematika, kesehatan, manajemen, ...). Latar gradasi + ikon utama
 * yang "bernapas" + dua ikon kecil yang melayang. Animasi dimatikan bila pengguna memilih reduced motion.
 */
/** ikon: kunci tema pilihan mata kuliah (mata_kuliah.ikon); kosong = otomatis dari nama. */
const props = withDefaults(defineProps<{ nama: string; kode?: string | null; ikon?: string | null; ukuran?: 'sm' | 'md' | 'lg' }>(), { ukuran: 'md' });

const tema = computed(() => temaIkon(props.nama, props.kode, props.ikon));
const UKURAN = { sm: { kotak: 'w-11 h-11', utama: 24, kecil: 13 }, md: { kotak: 'w-14 h-14', utama: 30, kecil: 15 }, lg: { kotak: 'w-20 h-20', utama: 42, kecil: 20 } };
const u = computed(() => UKURAN[props.ukuran]);
</script>

<template>
  <span
    class="ilustrasi relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm"
    :class="u.kotak"
    :style="{ background: `linear-gradient(135deg, ${tema.dari}, ${tema.ke})` }"
    aria-hidden="true"
  >
    <!-- Kilau latar -->
    <span class="kilau absolute -top-1/2 -left-1/2 h-full w-full rounded-full bg-white/25 blur-md" />
    <!-- Ikon kecil melayang -->
    <span class="melayang-1 material-symbols-outlined absolute top-1 right-1 text-white/80" :style="{ fontSize: `${u.kecil}px` }">{{ tema.kecil[0] }}</span>
    <span class="melayang-2 material-symbols-outlined absolute bottom-1 left-1 text-white/70" :style="{ fontSize: `${u.kecil}px` }">{{ tema.kecil[1] }}</span>
    <!-- Ikon utama -->
    <span class="napas material-symbols-outlined relative text-white drop-shadow" :style="{ fontSize: `${u.utama}px`, fontVariationSettings: `'FILL' 1` }">{{ tema.utama }}</span>
  </span>
</template>

<style scoped>
.napas {
  animation: napas 3.2s ease-in-out infinite;
}
.melayang-1 {
  animation: melayang 4s ease-in-out infinite;
}
.melayang-2 {
  animation: melayang 4.6s ease-in-out infinite reverse;
}
.kilau {
  animation: kilau 6s ease-in-out infinite;
}
/* Animasi lebih hidup saat kartu disorot. */
:global(.group:hover) .ilustrasi .napas {
  animation-duration: 1.4s;
}
@keyframes napas {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
  }
  50% {
    transform: scale(1.1) rotate(-4deg);
  }
}
@keyframes melayang {
  0%,
  100% {
    transform: translate(0, 0);
    opacity: 0.6;
  }
  50% {
    transform: translate(-2px, -3px);
    opacity: 1;
  }
}
@keyframes kilau {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(35%, 35%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .napas,
  .melayang-1,
  .melayang-2,
  .kilau {
    animation: none;
  }
}
</style>

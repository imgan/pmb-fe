<script setup lang="ts">
import { ref } from 'vue';

/**
 * Tooltip ringan untuk tombol/ikon: hover atau fokus pada isi slot menampilkan teks di bawahnya.
 * Di-teleport ke body dengan posisi tetap agar tidak terpotong wadah tabel yang bisa digulir.
 */
defineProps<{ text: string; sub?: string }>();

const posisi = ref<{ top: number; left: number } | null>(null);
const tampil = (e: Event) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  // Lebar maks 16rem (256px): dipusatkan di bawah elemen, dijaga tetap di dalam layar.
  const left = Math.min(Math.max(r.left + r.width / 2 - 128, 8), window.innerWidth - 264);
  posisi.value = { top: r.bottom + 6, left };
};
const sembunyi = () => (posisi.value = null);
</script>

<template>
  <span class="inline-flex" @mouseenter="tampil" @mouseleave="sembunyi" @focusin="tampil" @focusout="sembunyi">
    <slot />
  </span>
  <Teleport to="body">
    <div
      v-if="posisi"
      role="tooltip"
      class="fixed z-[100] w-64 px-3 py-2 rounded-md shadow-lg bg-inverse-surface text-inverse-on-surface text-left text-label-sm leading-snug pointer-events-none"
      :style="{ top: `${posisi.top}px`, left: `${posisi.left}px` }"
    >
      <p class="font-semibold">{{ text }}</p>
      <p v-if="sub" class="mt-0.5 opacity-90">{{ sub }}</p>
    </div>
  </Teleport>
</template>

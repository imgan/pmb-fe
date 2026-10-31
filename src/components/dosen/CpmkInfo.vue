<script setup lang="ts">
import { ref } from 'vue';

/**
 * Ikon ⓘ kecil di header kolom CPMK: hover / fokus / ketuk menampilkan kode & deskripsi CPMK. Tooltip
 * di-teleport ke body dengan posisi tetap agar tidak terpotong wadah tabel yang bisa digulir.
 */
defineProps<{ kode: string; deskripsi: string | null | undefined }>();

const posisi = ref<{ top: number; left: number } | null>(null);
const tampil = (e: Event) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  // Lebar tooltip 18rem (288px): dipusatkan di bawah ikon, dijaga tetap di dalam layar.
  const left = Math.min(Math.max(r.left + r.width / 2 - 144, 8), window.innerWidth - 296);
  posisi.value = { top: r.bottom + 6, left };
};
const sembunyi = () => (posisi.value = null);
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center w-4 h-4 rounded-full text-on-surface-variant hover:text-primary focus:text-primary focus:outline-none align-middle"
    :aria-label="`Deskripsi ${kode}`"
    @mouseenter="tampil"
    @mouseleave="sembunyi"
    @focus="tampil"
    @blur="sembunyi"
    @click.stop="posisi ? sembunyi() : tampil($event)"
  >
    <span class="material-symbols-outlined" style="font-size: 14px">info</span>
  </button>
  <Teleport to="body">
    <div
      v-if="posisi"
      role="tooltip"
      class="fixed z-[100] w-72 px-3 py-2 rounded-md shadow-lg bg-inverse-surface text-inverse-on-surface text-left text-label-sm font-normal normal-case whitespace-normal leading-snug pointer-events-none"
      :style="{ top: `${posisi.top}px`, left: `${posisi.left}px` }"
    >
      <p class="font-semibold mb-0.5">{{ kode }}</p>
      <p>{{ deskripsi || 'Deskripsi CPMK belum diisi.' }}</p>
    </div>
  </Teleport>
</template>

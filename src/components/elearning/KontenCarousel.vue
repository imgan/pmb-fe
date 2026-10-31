<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

/** Baris kartu yang bisa digeser horizontal, dengan tombol panah kiri/kanan (muncul bila masih ada isi di sisi itu). */
const track = ref<HTMLElement | null>(null);
const bisaKiri = ref(false);
const bisaKanan = ref(false);
const perbarui = () => {
  const el = track.value;
  if (!el) return;
  bisaKiri.value = el.scrollLeft > 4;
  bisaKanan.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
};
const geser = (arah: 1 | -1) => track.value?.scrollBy({ left: arah * track.value.clientWidth * 0.8, behavior: 'smooth' });
let observer: ResizeObserver | null = null;
onMounted(() => {
  perbarui();
  if (track.value) {
    observer = new ResizeObserver(perbarui);
    observer.observe(track.value);
  }
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div class="relative">
    <div ref="track" class="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [scrollbar-width:thin]" @scroll="perbarui">
      <slot />
    </div>
    <button
      v-if="bisaKiri"
      type="button"
      class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-11 h-11 rounded-full bg-surface-container-lowest border border-outline-variant shadow-md flex items-center justify-center hover:bg-surface-container"
      aria-label="Geser ke kiri"
      @click="geser(-1)"
    >
      <span class="material-symbols-outlined">chevron_left</span>
    </button>
    <button
      v-if="bisaKanan"
      type="button"
      class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-11 h-11 rounded-full bg-surface-container-lowest border border-outline-variant shadow-md flex items-center justify-center hover:bg-surface-container"
      aria-label="Geser ke kanan"
      @click="geser(1)"
    >
      <span class="material-symbols-outlined">chevron_right</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

/**
 * Grafik batang satu seri per minggu (SVG) — dipakai berdampingan untuk ukuran berbeda (konten dibuat vs aktivitas
 * mahasiswa) agar tidak ada sumbu ganda. Batang tipis dengan ujung membulat, grid samar, tooltip saat hover.
 */
const props = defineProps<{ judul: string; satuan: string; data: { awal: string; nilai: number }[]; warna?: string }>();

const W = 360;
const H = 150;
const KIRI = 28;
const BAWAH = 22;
const ATAS = 8;
// Skala bulat: langkah 1 / 2 / kelipatan 5 supaya label sumbu selalu bilangan bulat.
const langkah = computed(() => {
  const m = Math.max(1, ...props.data.map((d) => d.nilai));
  return m <= 4 ? 1 : m <= 10 ? 2 : Math.ceil(m / 4 / 5) * 5;
});
const maks = computed(() => Math.ceil(Math.max(1, ...props.data.map((d) => d.nilai)) / langkah.value) * langkah.value);
const garis = computed(() => Array.from({ length: maks.value / langkah.value + 1 }, (_, i) => i * langkah.value));
const lebarArea = W - KIRI - 4;
const tinggiArea = H - BAWAH - ATAS;
const slot = computed(() => lebarArea / Math.max(props.data.length, 1));
const y = (v: number) => ATAS + tinggiArea - (v / maks.value) * tinggiArea;
const label = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
const total = computed(() => props.data.reduce((s, d) => s + d.nilai, 0));

const aktif = ref<number | null>(null);
const batang = (v: number, i: number) => {
  const lebar = Math.min(18, slot.value - 4);
  const x = KIRI + i * slot.value + (slot.value - lebar) / 2;
  const tinggi = Math.max((v / maks.value) * tinggiArea, v ? 2 : 0);
  const r = Math.min(4, lebar / 2, tinggi);
  const yb = ATAS + tinggiArea;
  // Ujung atas membulat, dasar rata di garis nol.
  return { x, lebar, d: tinggi ? `M${x},${yb} V${yb - tinggi + r} Q${x},${yb - tinggi} ${x + r},${yb - tinggi} H${x + lebar - r} Q${x + lebar},${yb - tinggi} ${x + lebar},${yb - tinggi + r} V${yb} Z` : '' };
};
</script>

<template>
  <div class="relative">
    <div class="flex items-baseline justify-between mb-1">
      <p class="text-label-md font-semibold text-on-surface">{{ judul }}</p>
      <p class="text-label-sm text-on-surface-variant">{{ total }} {{ satuan }} · 12 minggu</p>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full h-auto" role="img" :aria-label="`${judul}: ${data.map((d) => `${label(d.awal)} ${d.nilai}`).join(', ')}`" @mouseleave="aktif = null">
      <g v-for="g in garis" :key="g">
        <line :x1="KIRI" :x2="W - 4" :y1="y(g)" :y2="y(g)" class="stroke-outline-variant" stroke-width="1" :stroke-dasharray="g ? '2 3' : undefined" />
        <text :x="KIRI - 6" :y="y(g) + 3" text-anchor="end" class="fill-on-surface-variant" font-size="9">{{ g }}</text>
      </g>
      <g v-for="(d, i) in data" :key="d.awal">
        <rect :x="KIRI + i * slot" :y="ATAS" :width="slot" :height="tinggiArea" fill="transparent" @mouseenter="aktif = i" />
        <path v-if="d.nilai" :d="batang(d.nilai, i).d" :fill="warna ?? '#2563eb'" :opacity="aktif === null || aktif === i ? 1 : 0.45" class="pointer-events-none" />
        <text v-if="i % 2 === 0 || data.length <= 6" :x="KIRI + i * slot + slot / 2" :y="H - 6" text-anchor="middle" class="fill-on-surface-variant" font-size="9">{{ label(d.awal) }}</text>
      </g>
    </svg>
    <div
      v-if="aktif !== null && data[aktif]"
      class="pointer-events-none absolute top-6 z-10 rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 shadow-md text-label-sm whitespace-nowrap"
      :style="{ left: `${Math.min(((KIRI + aktif * slot + slot / 2) / W) * 100, 72)}%` }"
    >
      <p class="text-on-surface-variant">Minggu {{ label(data[aktif].awal) }}</p>
      <p class="font-semibold text-on-surface">{{ data[aktif].nilai }} {{ satuan }}</p>
    </div>
  </div>
</template>

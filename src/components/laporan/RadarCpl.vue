<script setup lang="ts">
import { computed, ref } from 'vue';

/**
 * Spiderchart rerata CPL: satu sumbu per CPL (skala 0–100), seri Capaian (area biru) vs Target (garis amber
 * putus-putus — beda warna + pola, jadi tidak bergantung warna saja). Label sumbu = kode + nilai (warna teks);
 * hover / fokus titik menampilkan tooltip. Palet divalidasi (CVD ΔE 32) dan ramah cetak.
 */
const props = defineProps<{ data: { kode: string; capaian: number | null; target: number }[] }>();

const W = 420;
const H = 360;
const CX = W / 2;
const CY = 180;
const R = 125;
const GRID = [20, 40, 60, 80, 100];
const CAPAIAN = '#2563eb';
const TARGET = '#d97706';

const n = computed(() => props.data.length);
const sudut = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n.value;
const titik = (i: number, v: number) => {
  const r = (Math.max(0, Math.min(100, v)) / 100) * R;
  return { x: CX + r * Math.cos(sudut(i)), y: CY + r * Math.sin(sudut(i)) };
};
const poligon = (vals: number[]) => vals.map((v, i) => titik(i, v)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
const gridPoly = (v: number) => poligon(props.data.map(() => v));
const capaianPoly = computed(() => poligon(props.data.map((d) => d.capaian ?? 0)));
const targetPoly = computed(() => poligon(props.data.map((d) => d.target)));
const label = (i: number) => {
  const a = sudut(i);
  const p = { x: CX + (R + 22) * Math.cos(a), y: CY + (R + 22) * Math.sin(a) };
  const anchor = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
  return { ...p, anchor };
};
const angka = (v: number | null) => (v === null ? 'belum dinilai' : v.toLocaleString('id-ID', { maximumFractionDigits: 2 }));

const aktif = ref<number | null>(null);
</script>

<template>
  <figure class="m-0">
    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full max-w-[420px] h-auto mx-auto block" role="img" aria-label="Spiderchart rerata CPL: capaian dibanding target per CPL">
      <!-- Grid & sumbu (recessive) -->
      <polygon v-for="g in GRID" :key="g" :points="gridPoly(g)" fill="none" stroke="#e5e7eb" stroke-width="1" />
      <line
        v-for="(d, i) in data"
        :key="`ax${d.kode}`"
        :x1="CX"
        :y1="CY"
        :x2="titik(i, 100).x"
        :y2="titik(i, 100).y"
        stroke="#e5e7eb"
        stroke-width="1"
      />
      <text v-for="g in [20, 60, 100]" :key="`t${g}`" :x="CX + 3" :y="CY - (g / 100) * R - 2" font-size="9" fill="#9ca3af">{{ g }}</text>

      <!-- Seri -->
      <polygon :points="targetPoly" fill="none" :stroke="TARGET" stroke-width="2" stroke-dasharray="6 4" stroke-linejoin="round" />
      <polygon :points="capaianPoly" :fill="CAPAIAN" fill-opacity="0.18" :stroke="CAPAIAN" stroke-width="2" stroke-linejoin="round" />

      <!-- Titik capaian (hover target besar, ring permukaan) -->
      <g v-for="(d, i) in data" :key="`p${d.kode}`">
        <circle
          v-if="d.capaian !== null"
          :cx="titik(i, d.capaian).x"
          :cy="titik(i, d.capaian).y"
          r="4.5"
          :fill="CAPAIAN"
          stroke="#ffffff"
          stroke-width="2"
        />
        <circle
          :cx="titik(i, d.capaian ?? 0).x"
          :cy="titik(i, d.capaian ?? 0).y"
          r="12"
          fill="transparent"
          tabindex="0"
          class="cursor-pointer outline-none"
          @mouseenter="aktif = i"
          @mouseleave="aktif = null"
          @focus="aktif = i"
          @blur="aktif = null"
        >
          <title>{{ d.kode }} — Capaian {{ angka(d.capaian) }}, Target {{ angka(d.target) }}</title>
        </circle>
      </g>

      <!-- Label sumbu: kode + nilai (warna teks) -->
      <g v-for="(d, i) in data" :key="`l${d.kode}`">
        <text :x="label(i).x" :y="label(i).y - 2" :text-anchor="label(i).anchor" font-size="11" font-weight="600" fill="#111827">{{ d.kode }}</text>
        <text :x="label(i).x" :y="label(i).y + 11" :text-anchor="label(i).anchor" font-size="10" :fill="d.capaian === null ? '#9ca3af' : '#4b5563'">
          {{ d.capaian === null ? '–' : angka(d.capaian) }}
        </text>
      </g>

      <!-- Tooltip -->
      <g v-if="aktif !== null" pointer-events="none">
        <rect x="4" y="4" width="170" height="38" rx="6" fill="#111827" fill-opacity="0.92" />
        <text x="12" y="19" font-size="11" font-weight="600" fill="#ffffff">{{ data[aktif].kode }}</text>
        <text x="12" y="34" font-size="10" fill="#e5e7eb">
          Capaian {{ angka(data[aktif].capaian) }} · Target {{ angka(data[aktif].target) }}
        </text>
      </g>
    </svg>
    <figcaption class="mt-1 flex justify-center gap-5 text-[11px] text-[#4b5563]">
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block w-5 h-3 rounded-sm border-2" :style="{ borderColor: CAPAIAN, background: `${CAPAIAN}2e` }" />
        Capaian
      </span>
      <span class="inline-flex items-center gap-1.5">
        <svg width="22" height="10" aria-hidden="true"><line x1="0" y1="5" x2="22" y2="5" :stroke="TARGET" stroke-width="2" stroke-dasharray="6 4" /></svg>
        Target
      </span>
    </figcaption>
  </figure>
</template>

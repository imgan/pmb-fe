<script setup lang="ts">
import { computed, ref } from 'vue';

export interface BarDatum {
  label: string;
  value: number;
}

const props = withDefaults(
  defineProps<{
    data: BarDatum[];
    color?: string;
    valueSuffix?: string;
  }>(),
  { color: '#b1913f', valueSuffix: '' }
);

const width = 600;
const rowHeight = 36;
const padding = { top: 8, right: 48, bottom: 8, left: 160 };
const height = computed(() => props.data.length * rowHeight + padding.top + padding.bottom);
const plotW = computed(() => width - padding.left - padding.right);

const niceMax = (value: number): number => {
  if (value <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
};

const maxValue = computed(() => niceMax(Math.max(1, ...props.data.map((d) => d.value))));

const barY = (i: number) => padding.top + i * rowHeight + rowHeight * 0.22;
const barThickness = rowHeight * 0.56;
const barW = (v: number) => Math.max((v / maxValue.value) * plotW.value, 2);

/** Rounded right end, square at the baseline (left, y-axis). */
const barPath = (i: number, v: number) => {
  const y = barY(i);
  const h = barThickness;
  const x = padding.left;
  const w = barW(v);
  const r = Math.min(4, h / 2, w);
  if (w <= r) {
    return `M${x},${y} H${x + w} V${y + h} H${x} Z`;
  }
  return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
};

const hovered = ref<number | null>(null);

const tooltipStyle = computed(() => {
  if (hovered.value === null) return {};
  const d = props.data[hovered.value];
  const leftPct = ((padding.left + barW(d.value)) / width) * 100;
  const topPct = ((barY(hovered.value) + barThickness / 2) / height.value) * 100;
  return { left: `${leftPct}%`, top: `${topPct}%` };
});
</script>

<template>
  <div class="relative">
    <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-auto" role="img" aria-label="Grafik batang horizontal">
      <text
        v-for="(d, i) in data"
        :key="`label-${d.label}`"
        :x="padding.left - 12"
        :y="barY(i) + barThickness / 2 + 4"
        text-anchor="end"
        font-size="12"
        fill="#52514e"
      >
        {{ d.label }}
      </text>

      <path
        v-for="(d, i) in data"
        :key="d.label"
        :d="barPath(i, d.value)"
        :fill="color"
        :opacity="hovered === null || hovered === i ? 1 : 0.45"
        class="transition-opacity duration-150 cursor-pointer"
        tabindex="0"
        :aria-label="`${d.label}: ${d.value}${valueSuffix}`"
        @mouseenter="hovered = i"
        @mouseleave="hovered = null"
        @focus="hovered = i"
        @blur="hovered = null"
      />

      <text
        v-for="(d, i) in data"
        :key="`value-${d.label}`"
        :x="padding.left + barW(d.value) + 8"
        :y="barY(i) + barThickness / 2 + 4"
        font-size="12"
        font-weight="600"
        fill="#0b0b0b"
      >
        {{ d.value }}
      </text>
    </svg>

    <div
      v-if="hovered !== null"
      class="absolute -translate-x-1/2 -translate-y-full -mt-2 px-3 py-2 rounded-md bg-inverse-surface text-inverse-on-surface text-label-sm shadow-lg pointer-events-none whitespace-nowrap z-10"
      :style="tooltipStyle"
    >
      <span class="font-semibold">{{ data[hovered].value }}{{ valueSuffix }}</span>
      <span class="opacity-80"> · {{ data[hovered].label }}</span>
    </div>
  </div>
</template>

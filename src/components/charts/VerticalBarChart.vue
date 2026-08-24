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
const height = 260;
const padding = { top: 24, right: 16, bottom: 32, left: 16 };
const plotW = width - padding.left - padding.right;
const plotH = height - padding.top - padding.bottom;

const niceMax = (value: number): number => {
  if (value <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
};

const maxValue = computed(() => niceMax(Math.max(1, ...props.data.map((d) => d.value))));
const gridSteps = computed(() => [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxValue.value * f)));

const bandWidth = computed(() => (props.data.length ? plotW / props.data.length : plotW));
const barWidth = computed(() => Math.min(28, bandWidth.value * 0.5));

const barX = (i: number) => padding.left + i * bandWidth.value + (bandWidth.value - barWidth.value) / 2;
const barY = (v: number) => padding.top + plotH - (v / maxValue.value) * plotH;
const barH = (v: number) => (v / maxValue.value) * plotH;

/** Rounded-top, square-bottom bar path — spec: 4px data-end radius, square at baseline. */
const barPath = (i: number, v: number) => {
  const x = barX(i);
  const w = barWidth.value;
  const y = barY(v);
  const h = Math.max(barH(v), 1);
  const r = Math.min(4, w / 2, h);
  const bottom = padding.top + plotH;
  if (h <= r) {
    return `M${x},${bottom} V${y} H${x + w} V${bottom} Z`;
  }
  return `M${x},${bottom} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${bottom} Z`;
};

const hovered = ref<number | null>(null);

const tooltipStyle = computed(() => {
  if (hovered.value === null) return {};
  const d = props.data[hovered.value];
  const leftPct = ((barX(hovered.value) + barWidth.value / 2) / width) * 100;
  const topPct = (barY(d.value) / height) * 100;
  return { left: `${leftPct}%`, top: `${topPct}%` };
});
</script>

<template>
  <div class="relative">
    <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-auto" role="img" aria-label="Grafik batang">
      <g v-for="(g, gi) in gridSteps" :key="gi">
        <line
          :x1="padding.left"
          :x2="width - padding.right"
          :y1="padding.top + plotH - (g / maxValue) * plotH"
          :y2="padding.top + plotH - (g / maxValue) * plotH"
          stroke="#e1e0d9"
          stroke-width="1"
        />
      </g>

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
        :key="`label-${d.label}`"
        :x="barX(i) + barWidth / 2"
        :y="height - 10"
        text-anchor="middle"
        font-size="11"
        fill="#898781"
      >
        {{ d.label }}
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

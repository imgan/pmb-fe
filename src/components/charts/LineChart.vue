<script setup lang="ts">
import { computed, ref } from 'vue';

export interface LineDatum {
  label: string;
  value: number;
}

const props = withDefaults(
  defineProps<{
    data: LineDatum[];
    color?: string;
    valueSuffix?: string;
    /** Formats the exact value shown in the hover tooltip. Defaults to the raw number. */
    formatValue?: (value: number) => string;
    /** Formats the (rounded) grid tick values on the y-axis; falls back to formatValue. */
    formatAxisValue?: (value: number) => string;
  }>(),
  { color: '#2a78d6', valueSuffix: '', formatValue: (value: number) => String(value) }
);

const axisFormatter = computed(() => props.formatAxisValue ?? props.formatValue);

const width = 600;
const height = 260;
const padding = { top: 24, right: 16, bottom: 32, left: 52 };
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
const minValue = computed(() => Math.min(0, ...props.data.map((d) => d.value)));
const gridSteps = computed(() => [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxValue.value * f)));

const stepX = computed(() => (props.data.length > 1 ? plotW / (props.data.length - 1) : 0));
const pointX = (i: number) => padding.left + i * stepX.value;
const pointY = (v: number) => {
  const range = maxValue.value - minValue.value || 1;
  return padding.top + plotH - ((v - minValue.value) / range) * plotH;
};

const linePath = computed(() =>
  props.data.map((d, i) => `${i === 0 ? 'M' : 'L'}${pointX(i)},${pointY(d.value)}`).join(' ')
);

const areaPath = computed(() => {
  if (props.data.length === 0) return '';
  const baseline = padding.top + plotH;
  const first = `M${pointX(0)},${baseline}`;
  const line = props.data.map((d, i) => `L${pointX(i)},${pointY(d.value)}`).join(' ');
  const last = `L${pointX(props.data.length - 1)},${baseline} Z`;
  return `${first} ${line} ${last}`;
});

const hovered = ref<number | null>(null);

const tooltipStyle = computed(() => {
  if (hovered.value === null) return {};
  const d = props.data[hovered.value];
  return {
    left: `${(pointX(hovered.value) / width) * 100}%`,
    top: `${(pointY(d.value) / height) * 100}%`,
  };
});
</script>

<template>
  <div class="relative">
    <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-auto" role="img" aria-label="Grafik garis">
      <g v-for="(g, gi) in gridSteps" :key="gi">
        <line
          :x1="padding.left"
          :x2="width - padding.right"
          :y1="pointY(g)"
          :y2="pointY(g)"
          stroke="#e1e0d9"
          stroke-width="1"
        />
        <text :x="padding.left - 8" :y="pointY(g) + 3" text-anchor="end" font-size="10" fill="#898781">{{ axisFormatter(g) }}</text>
      </g>

      <path :d="areaPath" :fill="color" fill-opacity="0.12" stroke="none" />
      <path :d="linePath" fill="none" :stroke="color" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />

      <circle
        v-for="(d, i) in data"
        :key="d.label"
        :cx="pointX(i)"
        :cy="pointY(d.value)"
        :r="hovered === i ? 5 : 3.5"
        :fill="color"
        stroke="white"
        stroke-width="1.5"
        class="transition-all duration-150 cursor-pointer"
        tabindex="0"
        :aria-label="`${d.label}: ${formatValue(d.value)}${valueSuffix}`"
        @mouseenter="hovered = i"
        @mouseleave="hovered = null"
        @focus="hovered = i"
        @blur="hovered = null"
      />

      <text
        v-for="(d, i) in data"
        :key="`label-${d.label}`"
        :x="pointX(i)"
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
      <span class="font-semibold">{{ formatValue(data[hovered].value) }}{{ valueSuffix }}</span>
      <span class="opacity-80"> · {{ data[hovered].label }}</span>
    </div>
  </div>
</template>

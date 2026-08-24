<script setup lang="ts">
import { computed, ref } from 'vue';

export interface DonutDatum {
  label: string;
  value: number;
  color?: string;
}

const props = defineProps<{ data: DonutDatum[] }>();

/** First three slots of the validated categorical palette (all-pairs safe in both modes). */
const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7'];

const size = 200;
const center = size / 2;
const outerR = 88;
const innerR = 54;
const gapDeg = 2;

const total = computed(() => props.data.reduce((sum, d) => sum + d.value, 0));

const segments = computed(() => {
  let angle = -90;
  return props.data.map((d, i) => {
    const fraction = total.value > 0 ? d.value / total.value : 0;
    const sweep = fraction * 360;
    const start = angle + gapDeg / 2;
    const end = angle + sweep - gapDeg / 2;
    angle += sweep;
    return { ...d, start, end: Math.max(end, start), color: d.color ?? PALETTE[i % PALETTE.length], pct: fraction * 100 };
  });
});

const toXY = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return [center + r * Math.cos(rad), center + r * Math.sin(rad)];
};

const arcPath = (start: number, end: number) => {
  const largeArc = end - start > 180 ? 1 : 0;
  const [x1, y1] = toXY(start, outerR);
  const [x2, y2] = toXY(end, outerR);
  const [x3, y3] = toXY(end, innerR);
  const [x4, y4] = toXY(start, innerR);
  return `M${x1},${y1} A${outerR},${outerR} 0 ${largeArc} 1 ${x2},${y2} L${x3},${y3} A${innerR},${innerR} 0 ${largeArc} 0 ${x4},${y4} Z`;
};

const hovered = ref<number | null>(null);
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center gap-6">
    <div class="relative shrink-0" :style="{ width: `${size}px`, height: `${size}px` }">
      <svg :viewBox="`0 0 ${size} ${size}`" class="w-full h-full" role="img" aria-label="Grafik donat">
        <path
          v-for="(seg, i) in segments"
          :key="seg.label"
          :d="arcPath(seg.start, seg.end)"
          :fill="seg.color"
          :opacity="hovered === null || hovered === i ? 1 : 0.4"
          class="transition-opacity duration-150 cursor-pointer"
          tabindex="0"
          :aria-label="`${seg.label}: ${seg.value} (${seg.pct.toFixed(0)}%)`"
          @mouseenter="hovered = i"
          @mouseleave="hovered = null"
          @focus="hovered = i"
          @blur="hovered = null"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <template v-if="hovered !== null">
          <span class="font-bold text-headline-md text-on-surface">{{ segments[hovered].value }}</span>
          <span class="text-label-sm text-on-surface-variant text-center px-4">{{ segments[hovered].label }}</span>
        </template>
        <template v-else>
          <span class="font-bold text-headline-md text-on-surface">{{ total }}</span>
          <span class="text-label-sm text-on-surface-variant">Total</span>
        </template>
      </div>
    </div>

    <ul class="flex flex-col gap-2.5 text-body-sm w-full">
      <li
        v-for="(seg, i) in segments"
        :key="seg.label"
        class="flex items-center gap-2.5 cursor-pointer"
        :class="hovered !== null && hovered !== i ? 'opacity-45' : ''"
        tabindex="0"
        @mouseenter="hovered = i"
        @mouseleave="hovered = null"
        @focus="hovered = i"
        @blur="hovered = null"
      >
        <span class="w-3 h-3 rounded-sm shrink-0" :style="{ backgroundColor: seg.color }" />
        <span class="text-on-surface flex-1">{{ seg.label }}</span>
        <span class="font-semibold text-on-surface tabular-nums">{{ seg.value }}</span>
        <span class="text-on-surface-variant text-label-sm tabular-nums w-10 text-right">{{ seg.pct.toFixed(0) }}%</span>
      </li>
    </ul>
  </div>
</template>

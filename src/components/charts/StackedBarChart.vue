<script setup lang="ts">
import { computed, ref } from 'vue';

/**
 * Batang horizontal bertumpuk (mis. AKM per angkatan). Satu baris per kategori sumbu, segmen per
 * series dengan celah 2px, ujung kanan batang membulat 4px, total di ujung batang, legenda di bawah,
 * dan tooltip per baris berisi rincian semua series (identitas tidak hanya lewat warna).
 */
export interface StackedSeries {
  key: string;
  label: string;
  color: string;
}
export interface StackedRow {
  label: string;
  values: Record<string, number>;
}

const props = defineProps<{ rows: StackedRow[]; series: StackedSeries[]; ariaLabel?: string }>();

const width = 640;
const rowHeight = 34;
const padding = { top: 8, right: 56, bottom: 28, left: 150 };
const height = computed(() => props.rows.length * rowHeight + padding.top + padding.bottom);
const plotW = width - padding.left - padding.right;
const GAP = 2;
const thickness = rowHeight * 0.58;

const totalOf = (r: StackedRow) => props.series.reduce((sum, s) => sum + (r.values[s.key] ?? 0), 0);
const niceMax = (v: number) => {
  if (v <= 0) return 4;
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
};
const maxValue = computed(() => niceMax(Math.max(1, ...props.rows.map(totalOf))));
const ticks = computed(() => Array.from({ length: 6 }, (_, i) => Math.round((maxValue.value / 5) * i)));
const xOf = (v: number) => padding.left + (v / maxValue.value) * plotW;
const rowY = (i: number) => padding.top + i * rowHeight + (rowHeight - thickness) / 2;

/** Segmen per baris; segmen terakhir yang terisi membulat di kanan, baseline tetap tegak. */
const segments = computed(() =>
  props.rows.map((r, i) => {
    let acc = 0;
    const filled = props.series.filter((s) => (r.values[s.key] ?? 0) > 0);
    const last = filled[filled.length - 1]?.key;
    return filled.map((s) => {
      const v = r.values[s.key];
      const x0 = xOf(acc) + (acc > 0 ? GAP / 2 : 0);
      acc += v;
      const x1 = xOf(acc) - (s.key !== last ? GAP / 2 : 0);
      const w = Math.max(x1 - x0, 1);
      const y = rowY(i);
      const h = thickness;
      const rad = s.key === last ? Math.min(4, w, h / 2) : 0;
      const d = rad
        ? `M${x0},${y} H${x0 + w - rad} Q${x0 + w},${y} ${x0 + w},${y + rad} V${y + h - rad} Q${x0 + w},${y + h} ${x0 + w - rad},${y + h} H${x0} Z`
        : `M${x0},${y} H${x0 + w} V${y + h} H${x0} Z`;
      return { key: s.key, color: s.color, d };
    });
  })
);

const hovered = ref<number | null>(null);
const tooltipStyle = computed(() => {
  if (hovered.value === null) return {};
  const r = props.rows[hovered.value];
  return {
    left: `${(Math.min(xOf(totalOf(r)), width - 120) / width) * 100}%`,
    top: `${(rowY(hovered.value) / height.value) * 100}%`,
  };
});
</script>

<template>
  <div class="relative">
    <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-auto" role="img" :aria-label="ariaLabel ?? 'Grafik batang bertumpuk'">
      <g>
        <line
          v-for="t in ticks"
          :key="`grid-${t}`"
          :x1="xOf(t)"
          :x2="xOf(t)"
          :y1="padding.top"
          :y2="height - padding.bottom"
          stroke="#e5e4df"
          stroke-dasharray="2 3"
        />
        <text v-for="t in ticks" :key="`tick-${t}`" :x="xOf(t)" :y="height - 8" text-anchor="middle" font-size="11" fill="#52514e">
          {{ t }}
        </text>
      </g>

      <g
        v-for="(r, i) in rows"
        :key="r.label"
        class="cursor-pointer"
        tabindex="0"
        :aria-label="`${r.label}: total ${totalOf(r)}, ${series.map((s) => `${s.label} ${r.values[s.key] ?? 0}`).join(', ')}`"
        @mouseenter="hovered = i"
        @mouseleave="hovered = null"
        @focus="hovered = i"
        @blur="hovered = null"
      >
        <!-- area hover selebar baris, lebih besar dari mark -->
        <rect :x="0" :y="padding.top + i * rowHeight" :width="width" :height="rowHeight" fill="transparent" />
        <text :x="padding.left - 10" :y="rowY(i) + thickness / 2 + 4" text-anchor="end" font-size="12" fill="#52514e">{{ r.label }}</text>
        <path
          v-for="seg in segments[i]"
          :key="seg.key"
          :d="seg.d"
          :fill="seg.color"
          :opacity="hovered === null || hovered === i ? 1 : 0.45"
          class="transition-opacity duration-150"
        />
        <text :x="xOf(totalOf(r)) + 6" :y="rowY(i) + thickness / 2 + 4" font-size="12" font-weight="600" fill="#0b0b0b">
          {{ totalOf(r).toLocaleString('id-ID') }}
        </text>
      </g>
    </svg>

    <ul class="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-label-sm text-on-surface-variant">
      <li v-for="s in series" :key="s.key" class="inline-flex items-center gap-1.5">
        <span class="inline-block w-2.5 h-2.5 rounded-full" :style="{ background: s.color }" />
        {{ s.label }}
      </li>
    </ul>

    <div
      v-if="hovered !== null"
      class="absolute -translate-y-full -mt-1 px-3 py-2 rounded-md bg-inverse-surface text-inverse-on-surface text-label-sm shadow-lg pointer-events-none z-10 min-w-40"
      :style="tooltipStyle"
    >
      <p class="font-semibold mb-1">{{ rows[hovered].label }} · Total {{ totalOf(rows[hovered]).toLocaleString('id-ID') }}</p>
      <p v-for="s in series.filter((x) => (rows[hovered!].values[x.key] ?? 0) > 0)" :key="s.key" class="flex items-center gap-1.5 whitespace-nowrap">
        <span class="inline-block w-2 h-2 rounded-full" :style="{ background: s.color }" />
        {{ s.label }}: <span class="font-semibold tabular-nums">{{ rows[hovered].values[s.key].toLocaleString('id-ID') }}</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { teksPersen, warnaProgres } from '@/utils/lmsKonten';

/** Batang progres kecil + angka persen (penyelesaian / keaktifan). */
defineProps<{ nilai: number | null | undefined; keterangan?: string }>();
</script>

<template>
  <div class="min-w-[7rem]">
    <div class="flex items-center gap-2">
      <div class="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
        <div class="h-full rounded-full" :class="warnaProgres(nilai)" :style="{ width: `${Math.min(nilai ?? 0, 100)}%` }" />
      </div>
      <span class="text-label-sm font-semibold text-on-surface tabular-nums w-12 text-right whitespace-nowrap">{{ teksPersen(nilai) }}</span>
    </div>
    <p v-if="keterangan" class="text-[11px] text-on-surface-variant mt-0.5">{{ keterangan }}</p>
  </div>
</template>

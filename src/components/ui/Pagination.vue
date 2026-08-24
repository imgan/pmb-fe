<script setup lang="ts">
import { computed } from 'vue';
import type { PagingMeta } from '@/types/common';

const props = defineProps<{ meta: PagingMeta }>();
const page = defineModel<number>({ default: 1 });

const rangeStart = computed(() => (props.meta.total === 0 ? 0 : (props.meta.page - 1) * props.meta.limit + 1));
const rangeEnd = computed(() => Math.min(props.meta.page * props.meta.limit, props.meta.total));

const canPrev = computed(() => props.meta.page > 1);
const canNext = computed(() => props.meta.page < props.meta.totalPages);
</script>

<template>
  <div class="p-4 border-t border-outline-variant bg-surface-bright flex items-center justify-between flex-wrap gap-3">
    <span class="text-body-sm text-on-surface-variant">
      Menampilkan {{ rangeStart }} - {{ rangeEnd }} dari {{ meta.total }} data
    </span>
    <div class="flex gap-2">
      <button
        type="button"
        class="px-3 py-1 border border-outline-variant rounded-md text-on-surface-variant text-label-sm hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        :disabled="!canPrev"
        @click="page = page - 1"
      >
        Sebelumnya
      </button>
      <button
        type="button"
        class="px-3 py-1 border border-outline-variant rounded-md text-on-surface-variant text-label-sm hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        :disabled="!canNext"
        @click="page = page + 1"
      >
        Berikutnya
      </button>
    </div>
  </div>
</template>

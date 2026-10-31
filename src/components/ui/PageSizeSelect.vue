<script setup lang="ts">
import SelectInput from './SelectInput.vue';

// "Show [N] entries" — pilihan jumlah baris per halaman di atas data table.
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));

const model = defineModel<number>({ default: 10 });

const onUpdate = (value: string | number | null) => {
  if (value !== '' && value !== null) model.value = Number(value);
};
</script>

<template>
  <div class="flex items-center gap-2 text-body-sm text-on-surface-variant">
    <span>Show</span>
    <div class="w-24">
      <SelectInput :model-value="model" :options="PAGE_SIZE_OPTIONS" :clearable="false" @update:model-value="onUpdate" />
    </div>
    <span>entries</span>
  </div>
</template>

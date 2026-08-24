<script setup lang="ts">
withDefaults(defineProps<{ placeholder?: string }>(), { placeholder: 'Cari...' });
const model = defineModel<string>({ default: '' });
</script>

<template>
  <div class="relative w-full md:w-96">
    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style="font-size: 20px">
      search
    </span>
    <input
      v-model="model"
      type="text"
      :placeholder="placeholder"
      class="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary text-body-sm bg-surface-container-lowest outline-none transition-colors"
    />
  </div>
</template>

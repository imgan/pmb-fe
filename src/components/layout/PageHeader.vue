<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    backTo?: { name: string; params?: Record<string, string | number> };
    backLabel?: string;
  }>(),
  { backLabel: 'Kembali' }
);
</script>

<template>
  <header class="mb-8 flex justify-between items-end flex-wrap gap-4">
    <div>
      <RouterLink
        v-if="backTo"
        :to="backTo"
        class="text-on-surface-variant hover:text-primary flex items-center gap-1 text-label-sm mb-2 transition-colors w-fit"
      >
        <span class="material-symbols-outlined" style="font-size: 16px">arrow_back</span>
        {{ backLabel }}
      </RouterLink>
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">{{ title }}</h1>
      <p v-if="subtitle" class="text-body-md text-on-surface-variant mt-1">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-3">
      <slot name="actions" />
    </div>
  </header>
</template>

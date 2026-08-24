<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
    description?: string;
    disabled?: boolean;
  }>(),
  { disabled: false }
);

const model = defineModel<boolean>({ default: false });
</script>

<template>
  <label class="flex items-center justify-between gap-4 py-1" :class="disabled ? 'opacity-60' : 'cursor-pointer'">
    <span v-if="label || description">
      <span v-if="label" class="block font-medium text-label-md text-on-surface">{{ label }}</span>
      <span v-if="description" class="block text-label-sm text-on-surface-variant">{{ description }}</span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="model"
      :disabled="disabled"
      class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
      :class="model ? 'bg-primary' : 'bg-outline-variant'"
      @click="!disabled && (model = !model)"
    >
      <span
        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
        :class="model ? 'translate-x-6' : 'translate-x-1'"
      />
    </button>
  </label>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
    type?: string;
    placeholder?: string;
    error?: string | null;
    required?: boolean;
    disabled?: boolean;
    hint?: string;
    min?: number | string;
    max?: number | string;
    step?: number | string;
  }>(),
  { type: 'text', required: false, disabled: false }
);

const model = defineModel<string | number | null>({ default: '' });
</script>

<template>
  <label class="block">
    <span v-if="label" class="block font-medium text-label-md text-on-surface mb-2">
      {{ label }}<span v-if="required" class="text-error"> *</span>
    </span>
    <input
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :min="min"
      :max="max"
      :step="step"
      class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      :class="
        error
          ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
          : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
      "
    />
    <p v-if="error" class="mt-1 text-label-sm text-error">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-label-sm text-on-surface-variant">{{ hint }}</p>
  </label>
</template>

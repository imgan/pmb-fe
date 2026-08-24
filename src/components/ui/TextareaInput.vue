<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
    placeholder?: string;
    error?: string | null;
    required?: boolean;
    rows?: number;
  }>(),
  { required: false, rows: 4 }
);

const model = defineModel<string | null>({ default: '' });
</script>

<template>
  <label class="block">
    <span v-if="label" class="block font-medium text-label-md text-on-surface mb-2">
      {{ label }}<span v-if="required" class="text-error"> *</span>
    </span>
    <textarea
      v-model="model"
      :rows="rows"
      :placeholder="placeholder"
      class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors resize-none"
      :class="
        error
          ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
          : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
      "
    />
    <p v-if="error" class="mt-1 text-label-sm text-error">{{ error }}</p>
  </label>
</template>

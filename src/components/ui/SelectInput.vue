<script setup lang="ts">
export interface SelectOption {
  value: string | number;
  label: string;
}

withDefaults(
  defineProps<{
    label?: string;
    options: SelectOption[];
    placeholder?: string;
    error?: string | null;
    required?: boolean;
    disabled?: boolean;
  }>(),
  { required: false, disabled: false, placeholder: 'Pilih...' }
);

const model = defineModel<string | number | null>({ default: '' });
</script>

<template>
  <label class="block">
    <span v-if="label" class="block font-medium text-label-md text-on-surface mb-2">
      {{ label }}<span v-if="required" class="text-error"> *</span>
    </span>
    <select
      v-model="model"
      :disabled="disabled"
      class="w-full px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      :class="
        error
          ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
          : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
      "
    >
      <option value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <p v-if="error" class="mt-1 text-label-sm text-error">{{ error }}</p>
  </label>
</template>

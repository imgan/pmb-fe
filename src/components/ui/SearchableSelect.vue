<script setup lang="ts">
import SelectInput, { type SelectOption } from './SelectInput.vue';

// SelectInput sekarang sudah bisa diketik untuk mencari; komponen ini dipertahankan sebagai alias
// supaya halaman yang sudah memakainya tetap jalan.
withDefaults(
  defineProps<{
    label?: string;
    options: SelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    error?: string | null;
    required?: boolean;
    disabled?: boolean;
  }>(),
  { required: false, disabled: false, placeholder: 'Pilih...', searchPlaceholder: 'Cari...' }
);

const emit = defineEmits<{ change: [value: string | number | null] }>();
const model = defineModel<string | number | null>({ default: '' });
</script>

<template>
  <SelectInput
    v-model="model"
    :label="label"
    :options="options"
    :placeholder="placeholder"
    :search-placeholder="searchPlaceholder"
    :error="error"
    :required="required"
    :disabled="disabled"
    @change="emit('change', $event)"
  />
</template>

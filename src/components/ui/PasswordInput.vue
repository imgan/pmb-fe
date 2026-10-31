<script setup lang="ts">
import { ref } from 'vue';

// Input password dengan tombol mata untuk menampilkan/menyembunyikan isinya.
withDefaults(
  defineProps<{
    autocomplete?: string;
    required?: boolean;
    placeholder?: string;
  }>(),
  { autocomplete: 'current-password', required: false }
);

const model = defineModel<string>({ default: '' });
const visible = ref(false);
</script>

<template>
  <div class="relative">
    <input
      v-model="model"
      :type="visible ? 'text' : 'password'"
      :required="required"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      class="w-full pl-3 pr-10 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
    />
    <button
      type="button"
      class="absolute inset-y-0 right-0 flex items-center px-3 text-on-surface-variant hover:text-primary transition-colors"
      :title="visible ? 'Sembunyikan password' : 'Tampilkan password'"
      :aria-label="visible ? 'Sembunyikan password' : 'Tampilkan password'"
      :aria-pressed="visible"
      @click="visible = !visible"
    >
      <span class="material-symbols-outlined" style="font-size: 20px">{{ visible ? 'visibility_off' : 'visibility' }}</span>
    </button>
  </div>
</template>

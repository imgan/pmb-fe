<script setup lang="ts">
import { ref } from 'vue';

withDefaults(
  defineProps<{
    label?: string;
    error?: string | null;
    hint?: string;
    accept?: string;
    preview?: boolean;
  }>(),
  { preview: false }
);

const model = defineModel<string | null | undefined>({ default: null });
/** Opsional: nama file yang dipilih (mis. untuk dicatat di riwayat import). */
const fileName = defineModel<string | null>('fileName', { default: null });
const fileInputRef = ref<HTMLInputElement | null>(null);

const onFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  fileName.value = file.name;

  const reader = new FileReader();
  reader.onload = () => {
    model.value = reader.result as string;
  };
  reader.readAsDataURL(file);
};

const clearFile = () => {
  model.value = null;
  fileName.value = null;
  if (fileInputRef.value) fileInputRef.value.value = '';
};
</script>

<template>
  <div>
    <span v-if="label" class="block font-medium text-label-md text-on-surface mb-2">{{ label }}</span>

    <div
      v-if="model && preview"
      class="flex items-center gap-3 px-3 py-2 border border-outline-variant rounded-md bg-surface-container-low"
    >
      <img :src="model" alt="Pratinjau" class="w-12 h-12 object-contain rounded bg-surface-container-lowest border border-outline-variant shrink-0" />
      <span class="flex-1 text-body-sm text-on-surface-variant truncate">Gambar terpilih</span>
      <button
        type="button"
        class="text-outline hover:text-error transition-colors shrink-0"
        title="Hapus gambar"
        @click="clearFile"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">close</span>
      </button>
    </div>
    <div
      v-else-if="model"
      class="flex items-center justify-between gap-3 px-3 py-2 border border-outline-variant rounded-md bg-surface-container-low"
    >
      <a
        :href="model"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-2 text-body-sm text-primary hover:underline truncate"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">description</span>
        Lihat file terlampir
      </a>
      <button
        type="button"
        class="text-outline hover:text-error transition-colors"
        title="Hapus file"
        @click="clearFile"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">close</span>
      </button>
    </div>
    <input
      v-else
      ref="fileInputRef"
      type="file"
      :accept="accept"
      class="w-full text-body-sm text-on-surface-variant file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary-container file:text-on-primary-container file:font-medium file:text-label-sm hover:file:opacity-90 file:cursor-pointer cursor-pointer border border-outline-variant rounded-md bg-surface-container-lowest"
      @change="onFileChange"
    />
    <p v-if="error" class="mt-1 text-label-sm text-error">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-label-sm text-on-surface-variant">{{ hint }}</p>
  </div>
</template>

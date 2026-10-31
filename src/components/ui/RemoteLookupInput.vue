<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { SelectOption } from './SelectInput.vue';

// Pilihan dengan pencarian ke server (untuk data besar seperti mahasiswa / mata kuliah).
// `initialLabel` dipakai untuk menampilkan pilihan yang sudah tersimpan saat form edit dibuka.
const props = withDefaults(
  defineProps<{
    label?: string;
    required?: boolean;
    placeholder?: string;
    initialLabel?: string;
    search: (term: string) => Promise<SelectOption[]>;
  }>(),
  { required: false, placeholder: 'Ketik untuk mencari...', initialLabel: '' }
);

const model = defineModel<string | number | null>({ default: null });

const selectedLabel = ref(props.initialLabel);
const query = ref('');
const open = ref(false);
const loading = ref(false);
const options = ref<SelectOption[]>([]);
const rootEl = ref<HTMLElement | null>(null);

watch(
  () => props.initialLabel,
  (v) => {
    selectedLabel.value = v;
  }
);

let debounce: ReturnType<typeof setTimeout> | undefined;
const runSearch = () => {
  clearTimeout(debounce);
  debounce = setTimeout(async () => {
    loading.value = true;
    try {
      options.value = await props.search(query.value);
    } catch {
      options.value = [];
    } finally {
      loading.value = false;
    }
  }, 300);
};

const openDropdown = () => {
  open.value = true;
  runSearch();
};

watch(query, () => {
  if (open.value) runSearch();
});

const select = (option: SelectOption) => {
  model.value = option.value;
  selectedLabel.value = option.label;
  query.value = '';
  open.value = false;
};

const clear = () => {
  model.value = null;
  selectedLabel.value = '';
};

const handleClickOutside = (event: MouseEvent) => {
  if (rootEl.value && !rootEl.value.contains(event.target as Node)) open.value = false;
};
onMounted(() => document.addEventListener('mousedown', handleClickOutside));
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  clearTimeout(debounce);
});
</script>

<template>
  <div ref="rootEl" class="relative">
    <span v-if="label" class="block font-medium text-label-md text-on-surface mb-2">
      {{ label }}<span v-if="required" class="text-error"> *</span>
    </span>
    <div
      v-if="model !== null && model !== '' && !open"
      class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface flex items-center justify-between gap-2"
    >
      <span class="truncate">{{ selectedLabel || `#${model}` }}</span>
      <div class="flex items-center gap-1 shrink-0">
        <button type="button" class="text-on-surface-variant hover:text-primary" title="Ganti" @click="openDropdown">
          <span class="material-symbols-outlined" style="font-size: 18px">search</span>
        </button>
        <button type="button" class="text-on-surface-variant hover:text-error" title="Hapus pilihan" @click="clear">
          <span class="material-symbols-outlined" style="font-size: 18px">close</span>
        </button>
      </div>
    </div>
    <input
      v-else
      v-model="query"
      type="text"
      :placeholder="placeholder"
      class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      @focus="openDropdown"
    />
    <div
      v-if="open"
      class="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-md shadow-lg"
    >
      <p v-if="loading" class="px-3 py-2 text-body-sm text-on-surface-variant">Mencari...</p>
      <p v-else-if="!options.length" class="px-3 py-2 text-body-sm text-on-surface-variant">Tidak ada hasil</p>
      <button
        v-for="option in options"
        v-else
        :key="option.value"
        type="button"
        class="w-full text-left px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container"
        @click="select(option)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { SelectOption } from './SelectInput.vue';

const props = withDefaults(
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

const model = defineModel<string | number | null>({ default: '' });

const open = ref(false);
const query = ref('');
const rootEl = ref<HTMLElement | null>(null);
const searchEl = ref<HTMLInputElement | null>(null);

const selectedLabel = computed(() => props.options.find((o) => `${o.value}` === `${model.value}`)?.label ?? '');

const filteredOptions = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.options;
  return props.options.filter((o) => o.label.toLowerCase().includes(q));
});

const closeDropdown = () => {
  open.value = false;
  query.value = '';
};

const toggleDropdown = async () => {
  if (props.disabled) return;
  open.value = !open.value;
  if (open.value) {
    await nextTick();
    searchEl.value?.focus();
  }
};

const selectOption = (option: SelectOption) => {
  model.value = option.value;
  closeDropdown();
};

const clearSelection = (event: Event) => {
  event.stopPropagation();
  model.value = '';
};

const handleClickOutside = (event: MouseEvent) => {
  if (rootEl.value && !rootEl.value.contains(event.target as Node)) closeDropdown();
};

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('mousedown', handleClickOutside);
  else document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<template>
  <label class="block" ref="rootEl">
    <span v-if="label" class="block font-medium text-label-md text-on-surface mb-2">
      {{ label }}<span v-if="required" class="text-error"> *</span>
    </span>
    <div class="relative">
      <button
        type="button"
        :disabled="disabled"
        class="w-full flex items-center gap-2 px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-left outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        :class="[
          error
            ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
            : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary',
          open ? 'ring-1 ring-primary border-primary' : '',
        ]"
        @click="toggleDropdown"
      >
        <span class="flex-1 truncate" :class="selectedLabel ? 'text-on-surface' : 'text-on-surface-variant'">
          {{ selectedLabel || placeholder }}
        </span>
        <span
          v-if="selectedLabel && !disabled"
          class="material-symbols-outlined text-outline hover:text-on-surface"
          style="font-size: 18px"
          @click="clearSelection"
        >
          close
        </span>
        <span class="material-symbols-outlined text-outline transition-transform" style="font-size: 18px" :class="{ 'rotate-180': open }">
          expand_more
        </span>
      </button>

      <div
        v-if="open"
        class="absolute z-40 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-md shadow-lg overflow-hidden"
      >
        <div class="p-2 border-b border-outline-variant">
          <div class="relative">
            <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline" style="font-size: 18px">
              search
            </span>
            <input
              ref="searchEl"
              v-model="query"
              type="text"
              :placeholder="searchPlaceholder"
              class="w-full pl-8 pr-3 py-1.5 border border-outline-variant rounded-md text-body-sm bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <ul class="max-h-56 overflow-y-auto py-1">
          <li v-if="filteredOptions.length === 0" class="px-3 py-2 text-body-sm text-on-surface-variant">
            Tidak ada hasil
          </li>
          <li
            v-for="option in filteredOptions"
            :key="option.value"
            class="px-3 py-2 text-body-sm cursor-pointer hover:bg-surface-container-highest"
            :class="`${option.value}` === `${model}` ? 'bg-primary-container text-on-primary-container' : 'text-on-surface'"
            @click="selectOption(option)"
          >
            {{ option.label }}
          </li>
        </ul>
      </div>
    </div>
    <p v-if="error" class="mt-1 text-label-sm text-error">{{ error }}</p>
  </label>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

export interface SelectOption {
  value: string | number;
  label: string;
}

/**
 * Combo box yang bisa diketik untuk mencari opsi. API-nya sama dengan <select> biasa
 * (v-model, options, placeholder, @change), jadi bisa langsung dipakai di semua halaman.
 * Dropdown di-teleport ke <body> dengan posisi fixed supaya tidak terpotong oleh
 * container ber-overflow (modal, tabel, section).
 */
const props = withDefaults(
  defineProps<{
    label?: string;
    options: SelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    error?: string | null;
    required?: boolean;
    disabled?: boolean;
    /** false = opsi kosong (placeholder) tidak bisa dipilih, mis. untuk pilihan jumlah baris. */
    clearable?: boolean;
  }>(),
  { required: false, disabled: false, clearable: true, placeholder: 'Pilih...', searchPlaceholder: 'Ketik untuk mencari...' }
);

const emit = defineEmits<{ change: [value: string | number | null] }>();
const model = defineModel<string | number | null>({ default: '' });

const open = ref(false);
const query = ref('');
const activeIndex = ref(0);
const buttonEl = ref<HTMLButtonElement | null>(null);
const dropdownEl = ref<HTMLElement | null>(null);
const searchEl = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLElement | null>(null);
const position = ref({ top: 0, left: 0, width: 0, maxHeight: 240, openUp: false });

// Opsi kosong (placeholder) tetap bisa dipilih seperti di <select> biasa, kecuali saat sedang mencari.
// Kalau options sudah punya opsi bernilai '' (mis. "Semua Tahun"), placeholder tidak ditambahkan lagi.
const hasEmptyOption = computed(() => props.options.some((o) => o.value === ''));
const allOptions = computed<SelectOption[]>(() =>
  hasEmptyOption.value || !props.clearable ? props.options : [{ value: '', label: props.placeholder }, ...props.options]
);
const selectedLabel = computed(() => {
  const value = model.value ?? '';
  if (value === '' && !hasEmptyOption.value) return '';
  return props.options.find((o) => `${o.value}` === `${value}`)?.label ?? '';
});

const filteredOptions = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return allOptions.value;
  return props.options.filter((o) => o.value !== '' && o.label.toLowerCase().includes(q));
});

const isSelected = (option: SelectOption) => `${option.value}` === `${model.value ?? ''}`;

const updatePosition = () => {
  const rect = buttonEl.value?.getBoundingClientRect();
  if (!rect) return;
  const spaceBelow = window.innerHeight - rect.bottom - 8;
  const spaceAbove = rect.top - 8;
  const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
  position.value = {
    top: openUp ? rect.top - 4 : rect.bottom + 4,
    left: rect.left,
    width: rect.width,
    maxHeight: Math.max(160, Math.min(320, openUp ? spaceAbove : spaceBelow)),
    openUp,
  };
};

const scrollActiveIntoView = () => {
  nextTick(() => {
    const el = listEl.value?.querySelector<HTMLElement>(`[data-index="${activeIndex.value}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  });
};

const openDropdown = async (initialQuery = '') => {
  if (props.disabled || open.value) return;
  query.value = initialQuery;
  updatePosition();
  open.value = true;
  const selected = filteredOptions.value.findIndex(isSelected);
  activeIndex.value = initialQuery || selected < 0 ? 0 : selected;
  await nextTick();
  searchEl.value?.focus();
  scrollActiveIntoView();
};

const closeDropdown = (refocus = false) => {
  open.value = false;
  query.value = '';
  if (refocus) buttonEl.value?.focus();
};

const selectOption = (option: SelectOption) => {
  const changed = `${option.value}` !== `${model.value ?? ''}`;
  model.value = option.value;
  closeDropdown(true);
  if (changed) emit('change', option.value);
};

watch(query, () => {
  activeIndex.value = 0;
});

const handleButtonKeydown = (event: KeyboardEvent) => {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
    event.preventDefault();
    openDropdown();
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    // Mulai mengetik langsung di tombol = buka dropdown dengan huruf tsb sebagai kata kunci.
    event.preventDefault();
    openDropdown(event.key);
  }
};

const handleSearchKeydown = (event: KeyboardEvent) => {
  const count = filteredOptions.value.length;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (count) activeIndex.value = (activeIndex.value + 1) % count;
    scrollActiveIntoView();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (count) activeIndex.value = (activeIndex.value - 1 + count) % count;
    scrollActiveIntoView();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const option = filteredOptions.value[activeIndex.value];
    if (option) selectOption(option);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeDropdown(true);
  } else if (event.key === 'Tab') {
    closeDropdown();
  }
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;
  if (buttonEl.value?.contains(target) || dropdownEl.value?.contains(target)) return;
  closeDropdown();
};

// Scroll di luar dropdown (halaman/modal) -> ikuti posisi tombol; scroll di dalam list dibiarkan.
const handleScroll = (event: Event) => {
  if (dropdownEl.value?.contains(event.target as Node)) return;
  updatePosition();
};

const addListeners = () => {
  document.addEventListener('mousedown', handleClickOutside);
  window.addEventListener('scroll', handleScroll, true);
  window.addEventListener('resize', updatePosition);
};
const removeListeners = () => {
  document.removeEventListener('mousedown', handleClickOutside);
  window.removeEventListener('scroll', handleScroll, true);
  window.removeEventListener('resize', updatePosition);
};

watch(open, (isOpen) => (isOpen ? addListeners() : removeListeners()));
watch(
  () => props.disabled,
  (disabled) => disabled && closeDropdown()
);
onBeforeUnmount(removeListeners);

const dropdownStyle = computed(() => ({
  left: `${position.value.left}px`,
  width: `${position.value.width}px`,
  top: `${position.value.top}px`,
  transform: position.value.openUp ? 'translateY(-100%)' : undefined,
}));
</script>

<template>
  <div class="block">
    <span v-if="label" class="block font-medium text-label-md text-on-surface mb-2" @click="openDropdown()">
      {{ label }}<span v-if="required" class="text-error"> *</span>
    </span>
    <button
      ref="buttonEl"
      type="button"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open"
      class="w-full flex items-center gap-2 px-3 py-2 border rounded-md bg-surface-container-lowest text-body-md text-left outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      :class="[
        error
          ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
          : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary',
        open && !error ? 'ring-1 ring-primary border-primary' : '',
      ]"
      @click="open ? closeDropdown() : openDropdown()"
      @keydown="handleButtonKeydown"
    >
      <span class="flex-1 truncate" :class="selectedLabel ? 'text-on-surface' : 'text-on-surface-variant'">
        {{ selectedLabel || placeholder }}
      </span>
      <span class="material-symbols-outlined text-outline transition-transform" style="font-size: 18px" :class="{ 'rotate-180': open }">
        expand_more
      </span>
    </button>
    <p v-if="error" class="mt-1 text-label-sm text-error">{{ error }}</p>

    <Teleport to="body">
      <div
        v-if="open"
        ref="dropdownEl"
        class="fixed z-[60] bg-surface-container-lowest border border-outline-variant rounded-md shadow-lg overflow-hidden flex flex-col"
        :class="position.openUp ? 'flex-col-reverse' : ''"
        :style="dropdownStyle"
      >
        <div class="p-2" :class="position.openUp ? 'border-t border-outline-variant' : 'border-b border-outline-variant'">
          <div class="relative">
            <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline" style="font-size: 18px">
              search
            </span>
            <input
              ref="searchEl"
              v-model="query"
              type="text"
              :placeholder="searchPlaceholder"
              class="w-full pl-8 pr-3 py-1.5 border border-outline-variant rounded-md text-body-sm bg-surface text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              @keydown="handleSearchKeydown"
            />
          </div>
        </div>
        <ul ref="listEl" role="listbox" class="overflow-y-auto py-1" :style="{ maxHeight: `${position.maxHeight - 56}px` }">
          <li v-if="filteredOptions.length === 0" class="px-3 py-2 text-body-sm text-on-surface-variant">Tidak ada hasil</li>
          <li
            v-for="(option, index) in filteredOptions"
            :key="`${option.value}-${index}`"
            role="option"
            :aria-selected="isSelected(option)"
            :data-index="index"
            class="px-3 py-2 text-body-sm cursor-pointer"
            :class="[
              isSelected(option) ? 'bg-primary-container text-on-primary-container font-medium' : 'text-on-surface',
              index === activeIndex && !isSelected(option) ? 'bg-surface-container-highest' : '',
              option.value === '' ? 'text-on-surface-variant' : '',
            ]"
            @mouseenter="activeIndex = index"
            @mousedown.prevent
            @click="selectOption(option)"
          >
            {{ option.label }}
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

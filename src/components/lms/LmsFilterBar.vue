<script setup lang="ts">
import { computed } from 'vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { useLmsFilter } from '@/composables/useLmsFilter';

/** Baris filter halaman LMS: tahun akademik, prodi, (opsional) pencarian, dan slot filter tambahan. */
withDefaults(defineProps<{ cari?: boolean; placeholder?: string }>(), { cari: true, placeholder: 'Cari...' });
const search = defineModel<string>('search', { default: '' });
const { opsi, filter } = useLmsFilter();

const taOptions = computed(() => (opsi.value?.tahunAkademik ?? []).map((t) => ({ value: t.id, label: `${t.label}${t.isActive ? ' (aktif)' : ''}` })));
const prodiOptions = computed(() => (opsi.value?.prodi ?? []).map((p) => ({ value: p.kodeProdi, label: p.nama })));
</script>

<template>
  <div class="mb-5 flex flex-wrap items-end gap-3">
    <div class="w-64">
      <SelectInput v-model="filter.tahunAjaranId" label="Tahun Akademik" :options="taOptions" :clearable="false" placeholder="Pilih tahun akademik" />
    </div>
    <div class="w-64">
      <SelectInput v-model="filter.kodeProdi" label="Prodi" :options="prodiOptions" placeholder="Semua prodi" />
    </div>
    <slot />
    <div v-if="cari" class="ml-auto">
      <SearchInput v-model="search" :placeholder="placeholder" />
    </div>
  </div>
</template>

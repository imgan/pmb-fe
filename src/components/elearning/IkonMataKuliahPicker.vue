<script setup lang="ts">
import { computed } from 'vue';
import MataKuliahIlustrasi from '@/components/elearning/MataKuliahIlustrasi.vue';
import { TEMA_IKON, temaOtomatis } from '@/utils/ikonMataKuliah';

/**
 * Pemilih ikon ilustrasi mata kuliah: "Otomatis" (ditebak dari nama — pratinjau mengikuti nama yang sedang diketik)
 * atau salah satu tema. v-model = kunci tema ('' = otomatis).
 */
const props = defineProps<{ nama: string; kode?: string | null }>();
const model = defineModel<string>({ default: '' });

const otomatis = computed(() => temaOtomatis(props.nama || 'Mata Kuliah', props.kode));
const terpilih = computed(() => TEMA_IKON.find((t) => t.key === model.value) ?? null);
</script>

<template>
  <div>
    <div class="flex items-center gap-3 mb-2">
      <span class="text-label-md font-medium text-on-surface">Ikon Mata Kuliah</span>
      <span class="text-label-sm text-on-surface-variant">
        Dipakai di kartu kelas E-learning · terpilih: <strong>{{ terpilih ? terpilih.label : `Otomatis (${otomatis.label})` }}</strong>
      </span>
    </div>
    <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-64 overflow-y-auto rounded-lg border border-outline-variant p-2" role="radiogroup" aria-label="Ikon mata kuliah">
      <!-- Otomatis -->
      <button
        type="button"
        role="radio"
        :aria-checked="model === ''"
        class="group flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors"
        :class="model === '' ? 'border-primary bg-primary-container/50 ring-1 ring-primary' : 'border-transparent hover:bg-surface-container'"
        :title="`Otomatis dari nama — saat ini: ${otomatis.label}`"
        @click="model = ''"
      >
        <span class="relative">
          <MataKuliahIlustrasi :nama="nama || 'Mata Kuliah'" :kode="kode" ukuran="sm" />
          <span class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface-container-lowest border border-outline-variant flex items-center justify-center">
            <span class="material-symbols-outlined text-primary" style="font-size: 13px">auto_awesome</span>
          </span>
        </span>
        <span class="text-[11px] leading-tight text-center text-on-surface-variant">Otomatis</span>
      </button>
      <!-- Semua tema -->
      <button
        v-for="t in TEMA_IKON"
        :key="t.key"
        type="button"
        role="radio"
        :aria-checked="model === t.key"
        class="group flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors"
        :class="model === t.key ? 'border-primary bg-primary-container/50 ring-1 ring-primary' : 'border-transparent hover:bg-surface-container'"
        :title="t.label"
        @click="model = t.key"
      >
        <MataKuliahIlustrasi :nama="t.label" :ikon="t.key" ukuran="sm" />
        <span class="text-[11px] leading-tight text-center text-on-surface-variant line-clamp-2">{{ t.label }}</span>
      </button>
    </div>
  </div>
</template>

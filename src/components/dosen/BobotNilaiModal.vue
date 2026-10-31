<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';

/**
 * Popup acuan penilaian: skala nilai angka -> huruf -> bobot (sama dengan pmb-be/src/utils/gradeScale.js,
 * dipakai KHS/IPK), komponen nilai akhir, dan kalkulator cepat nilai -> huruf.
 */
const props = defineProps<{ komponen: { label: string; bobot: number }[] }>();
const open = defineModel<boolean>({ default: false });

const SKALA = [
  { huruf: 'A', min: 85, max: 100, bobot: 4.0 },
  { huruf: 'A-', min: 80, max: 84, bobot: 3.7 },
  { huruf: 'B+', min: 75, max: 79, bobot: 3.3 },
  { huruf: 'B', min: 70, max: 74, bobot: 3.0 },
  { huruf: 'B-', min: 65, max: 69, bobot: 2.7 },
  { huruf: 'C+', min: 60, max: 64, bobot: 2.3 },
  { huruf: 'C', min: 55, max: 59, bobot: 2.0 },
  { huruf: 'D', min: 45, max: 54, bobot: 1.0 },
  { huruf: 'E', min: 0, max: 44, bobot: 0.0 },
];
// Di bawah C wajib mengulang (aturan KRS & daftar MK mengulang).
const lulus = (bobot: number) => bobot >= 2.0;

const uji = ref('');
const hasil = computed(() => {
  const v = Number(uji.value.replace(',', '.'));
  if (uji.value.trim() === '' || Number.isNaN(v) || v < 0 || v > 100) return null;
  return SKALA.find((s) => v >= s.min) ?? SKALA[SKALA.length - 1];
});
const rumus = computed(() => props.komponen.map((k) => `${k.label} × ${Math.round(k.bobot * 100)}%`).join(' + '));
</script>

<template>
  <Modal v-model="open" title="Bobot Nilai" subtitle="Konversi nilai angka ke huruf & bobot (dipakai KHS dan IPK)" size="md">
    <div class="space-y-5">
      <table class="w-full text-body-sm border border-outline-variant rounded-md overflow-hidden">
        <thead class="bg-surface-container text-label-md text-on-surface-variant">
          <tr>
            <th class="px-3 py-2 text-left font-medium">Nilai Angka</th>
            <th class="px-3 py-2 text-center font-medium">Huruf</th>
            <th class="px-3 py-2 text-center font-medium">Bobot</th>
            <th class="px-3 py-2 text-left font-medium">Keterangan</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          <tr v-for="s in SKALA" :key="s.huruf" :class="hasil?.huruf === s.huruf ? 'bg-primary-container' : ''">
            <td class="px-3 py-1.5 tabular-nums">{{ s.min }} – {{ s.max }}</td>
            <td class="px-3 py-1.5 text-center font-semibold">{{ s.huruf }}</td>
            <td class="px-3 py-1.5 text-center tabular-nums">{{ s.bobot.toFixed(2) }}</td>
            <td class="px-3 py-1.5" :class="lulus(s.bobot) ? 'text-on-surface-variant' : 'text-error'">
              {{ lulus(s.bobot) ? 'Lulus' : 'Mengulang' }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="-mt-3 text-label-sm text-on-surface-variant">Nilai pecahan di antara dua rentang (mis. 84,5) masuk ke huruf di bawahnya (A-).</p>

      <div>
        <p class="text-label-md font-medium text-on-surface mb-1">Nilai Akhir</p>
        <p class="text-body-sm text-on-surface-variant">{{ rumus }}</p>
      </div>

      <div class="rounded-md border border-outline-variant p-3">
        <label class="block text-label-md font-medium text-on-surface mb-2" for="uji-nilai">Cek cepat</label>
        <div class="flex items-center gap-3">
          <input
            id="uji-nilai"
            v-model="uji"
            inputmode="decimal"
            placeholder="Ketik nilai, mis. 78"
            class="w-40 px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <p v-if="hasil" class="text-body-md">
            → <span class="font-semibold text-on-surface">{{ hasil.huruf }}</span>
            · bobot {{ hasil.bobot.toFixed(2) }} ·
            <span :class="lulus(hasil.bobot) ? 'text-on-surface-variant' : 'text-error font-medium'">{{ lulus(hasil.bobot) ? 'Lulus' : 'Mengulang' }}</span>
          </p>
          <p v-else-if="uji.trim()" class="text-body-sm text-error">Isi angka 0–100</p>
        </div>
      </div>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="open = false">Tutup</AppButton>
    </template>
  </Modal>
</template>

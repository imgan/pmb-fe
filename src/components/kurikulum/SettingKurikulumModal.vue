<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { mataKuliahApi } from '@/api/mataKuliah';
import { extractErrorMessage } from '@/api/http';
import { toastSuccess } from '@/utils/swal';
import type { Kurikulum, MataKuliah } from '@/types/entities';

/**
 * Setting Kurikulum: tandai mata kuliah OBE & isi Target Capaian CPL / CPMK (0–100) untuk semua mata
 * kuliah satu kurikulum sekaligus, dikelompokkan per semester. Target hanya bisa diisi untuk MK OBE.
 */
const props = defineProps<{ kurikulum: Kurikulum }>();
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ saved: [] }>();

const TARGET_DEFAULT = 90;

interface Baris {
  id: number;
  kode: string;
  mataKuliah: string;
  semester: number | null;
  sksTotal: number;
  isObe: boolean;
  targetCpl: string;
  targetCpmk: string;
}

const rows = ref<Baris[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

const toBaris = (m: MataKuliah): Baris => ({
  id: m.id,
  kode: m.kode,
  mataKuliah: m.mataKuliah,
  semester: m.semester,
  sksTotal: m.sksTotal,
  isObe: m.isObe,
  targetCpl: m.targetCpl !== null && m.targetCpl !== undefined ? Number(m.targetCpl).toFixed(2) : '',
  targetCpmk: m.targetCpmk !== null && m.targetCpmk !== undefined ? Number(m.targetCpmk).toFixed(2) : '',
});

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await mataKuliahApi.list({ kurikulumId: props.kurikulum.id, limit: 1000 });
    rows.value = data.map(toBaris).sort((a, b) => (a.semester ?? 99) - (b.semester ?? 99) || a.kode.localeCompare(b.kode));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat mata kuliah');
  } finally {
    loading.value = false;
  }
};
watch(open, (v) => v && load());

const grup = computed(() => {
  const map = new Map<number | null, Baris[]>();
  rows.value.forEach((r) => map.set(r.semester, [...(map.get(r.semester) ?? []), r]));
  return [...map.entries()].map(([semester, list]) => ({ semester, list }));
});
const jumlahObe = computed(() => rows.value.filter((r) => r.isObe).length);
const semuaObe = computed(() => rows.value.length > 0 && rows.value.every((r) => r.isObe));

/** Centang OBE → target terisi default (90,00) bila masih kosong. */
const setObe = (r: Baris, value: boolean) => {
  r.isObe = value;
  if (value) {
    if (!r.targetCpl) r.targetCpl = TARGET_DEFAULT.toFixed(2);
    if (!r.targetCpmk) r.targetCpmk = TARGET_DEFAULT.toFixed(2);
  }
};
const toggleSemua = () => {
  const value = !semuaObe.value;
  rows.value.forEach((r) => setObe(r, value));
};
const toggleSemester = (list: Baris[]) => {
  const value = !list.every((r) => r.isObe);
  list.forEach((r) => setObe(r, value));
};

const parseTarget = (v: string) => {
  const s = String(v ?? '').trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

const simpan = async () => {
  const salah = rows.value.find((r) => {
    if (!r.isObe) return false;
    return [parseTarget(r.targetCpl), parseTarget(r.targetCpmk)].some((n) => n !== null && (Number.isNaN(n) || n < 0 || n > 100));
  });
  if (salah) {
    error.value = `Target CPL/CPMK ${salah.kode} harus angka 0–100`;
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    await mataKuliahApi.settingKurikulum(
      props.kurikulum.id,
      rows.value.map((r) => ({
        id: r.id,
        isObe: r.isObe,
        targetCpl: r.isObe ? parseTarget(r.targetCpl) : null,
        targetCpmk: r.isObe ? parseTarget(r.targetCpmk) : null,
      }))
    );
    toastSuccess('Setting kurikulum disimpan');
    emit('saved');
    open.value = false;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal menyimpan setting kurikulum');
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Modal v-model="open" title="Setting Kurikulum" :subtitle="`${kurikulum.nama} · OBE ${jumlahObe} dari ${rows.length} mata kuliah`" size="xl">
    <div v-if="error" class="mb-3 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat mata kuliah...</div>
    <div v-else-if="!rows.length" class="p-8 text-center text-body-sm text-on-surface-variant">Kurikulum ini belum memiliki mata kuliah.</div>
    <div v-else class="overflow-auto max-h-[65vh] border border-outline-variant rounded-md">
      <table class="w-full text-body-sm border-collapse">
        <thead class="bg-primary text-on-primary sticky top-0 z-10">
          <tr>
            <th rowspan="2" class="p-3 text-left font-semibold border-r border-white/20 w-32">Kode MK</th>
            <th rowspan="2" class="p-3 text-left font-semibold border-r border-white/20">Nama Mata Kuliah</th>
            <th rowspan="2" class="p-3 text-center font-semibold border-r border-white/20 w-16">SKS</th>
            <th rowspan="2" class="p-3 text-center font-semibold border-r border-white/20 w-28">
              <label class="flex flex-col items-center gap-1 cursor-pointer">
                <input type="checkbox" class="h-4 w-4 accent-white" :checked="semuaObe" @change="toggleSemua" />
                <span>Jenis Kurikulum</span>
              </label>
            </th>
            <th colspan="2" class="px-3 pt-3 pb-2 text-center font-semibold border-b border-white/20">Target Capaian</th>
          </tr>
          <tr>
            <th class="px-3 pb-3 pt-2 text-center font-semibold border-r border-white/20 w-32">CPL</th>
            <th class="px-3 pb-3 pt-2 text-center font-semibold w-32">CPMK</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="g in grup" :key="g.semester ?? 'x'">
            <tr class="bg-surface-container">
              <td colspan="3" class="px-3 py-2 font-semibold text-label-md text-on-surface uppercase">
                {{ g.semester ? `Semester ${g.semester}` : 'Tanpa Semester' }}
              </td>
              <td class="px-3 py-2 text-center">
                <button type="button" class="text-label-sm text-primary hover:underline" @click="toggleSemester(g.list)">
                  {{ g.list.every((r) => r.isObe) ? 'Batal semua' : 'OBE semua' }}
                </button>
              </td>
              <td colspan="2"></td>
            </tr>
            <tr v-for="r in g.list" :key="r.id" class="border-t border-outline-variant">
              <td class="px-3 py-2 whitespace-nowrap">{{ r.kode }}</td>
              <td class="px-3 py-2">{{ r.mataKuliah }}</td>
              <td class="px-3 py-2 text-center">{{ r.sksTotal }}</td>
              <td class="px-3 py-2">
                <label class="flex items-center justify-center gap-2 cursor-pointer">
                  <input type="checkbox" class="h-4 w-4 accent-[var(--color-primary,#8b6f2f)]" :checked="r.isObe" @change="setObe(r, !r.isObe)" />
                  <span class="text-label-sm" :class="r.isObe ? 'text-on-surface font-medium' : 'text-on-surface-variant'">OBE</span>
                </label>
              </td>
              <td class="px-3 py-2">
                <input
                  v-if="r.isObe"
                  v-model="r.targetCpl"
                  inputmode="decimal"
                  class="w-full px-2 py-1 border border-outline-variant rounded-md text-right bg-surface-container-lowest"
                  aria-label="Target CPL"
                />
              </td>
              <td class="px-3 py-2">
                <input
                  v-if="r.isObe"
                  v-model="r.targetCpmk"
                  inputmode="decimal"
                  class="w-full px-2 py-1 border border-outline-variant rounded-md text-right bg-surface-container-lowest"
                  aria-label="Target CPMK"
                />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="open = false">Batal</AppButton>
      <AppButton :disabled="saving || loading || !rows.length" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan Setting' }}</AppButton>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { tesUjianApi, type KoreksiUjian, type PesertaUjian } from '@/api/tesUjian';
import { extractErrorMessage } from '@/api/http';
import { toastSuccess } from '@/utils/swal';
import { formatDateTime } from '@/utils/format';

/** Popup Koreksi (Daftar Peserta tes PMB): jawaban soal online peserta. PG dinilai otomatis, skor essay diisi di sini. */
const props = defineProps<{ tesId: number | null; peserta: PesertaUjian | null; canUpdate: boolean }>();
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ saved: [] }>();

const HURUF = ['A', 'B', 'C', 'D', 'E', 'F'];

const data = ref<KoreksiUjian | null>(null);
const skor = reactive<Record<number, string>>({});
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

watch(open, async (v) => {
  if (!v || !props.tesId || !props.peserta) return;
  loading.value = true;
  error.value = null;
  data.value = null;
  Object.keys(skor).forEach((k) => delete skor[Number(k)]);
  try {
    data.value = await tesUjianApi.getKoreksi(props.tesId, props.peserta.id);
    data.value.soal.filter((s) => s.tipe === 'ESSAY').forEach((s) => (skor[s.id] = s.skor === null ? '' : String(s.skor)));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat jawaban peserta');
  } finally {
    loading.value = false;
  }
});

const ringkasan = computed(() => {
  const soal = data.value?.soal ?? [];
  const pg = soal.filter((s) => s.tipe === 'PG');
  return {
    benar: pg.filter((s) => s.jawabanPilihan !== null && s.jawabanPilihan === s.jawabanBenar).length,
    pg: pg.length,
    essay: soal.length - pg.length,
  };
});

const simpan = async () => {
  if (!props.tesId || !props.peserta || !data.value) return;
  const payload: Record<number, number | null> = {};
  for (const s of data.value.soal.filter((x) => x.tipe === 'ESSAY')) {
    const v = skor[s.id];
    const n = v === '' || v === undefined ? null : Number(v);
    if (n !== null && (Number.isNaN(n) || n < 0 || n > s.bobot)) {
      error.value = `Skor essay harus 0 – ${s.bobot}`;
      return;
    }
    payload[s.id] = n;
  }
  saving.value = true;
  error.value = null;
  try {
    const r = await tesUjianApi.simpanKoreksi(props.tesId, props.peserta.id, payload);
    toastSuccess(`Koreksi disimpan · nilai ${r.nilai}`);
    emit('saved');
    open.value = false;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal menyimpan koreksi');
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Modal v-model="open" title="Koreksi Jawaban" :subtitle="peserta?.namaLengkap" size="lg">
    <p v-if="loading" class="py-10 text-center text-body-sm text-on-surface-variant">Memuat jawaban...</p>
    <div v-else-if="data" class="space-y-4">
      <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
      <div class="grid grid-cols-3 gap-3 text-center">
        <div class="rounded-lg border border-outline-variant p-3">
          <p class="text-label-sm text-on-surface-variant">PG benar</p>
          <p class="text-headline-md font-bold tabular-nums">{{ ringkasan.benar }}/{{ ringkasan.pg }}</p>
        </div>
        <div class="rounded-lg border border-outline-variant p-3">
          <p class="text-label-sm text-on-surface-variant">Essay</p>
          <p class="text-headline-md font-bold tabular-nums">{{ ringkasan.essay }}</p>
        </div>
        <div class="rounded-lg border border-outline-variant p-3">
          <p class="text-label-sm text-on-surface-variant">Nilai saat ini</p>
          <p class="text-headline-md font-bold tabular-nums text-primary">{{ data.nilai ?? '-' }}</p>
        </div>
      </div>
      <p class="text-label-sm text-on-surface-variant">
        Mulai {{ formatDateTime(data.mulaiAt) }} · dikirim {{ formatDateTime(data.selesaiAt) }}. Nilai = total skor ÷ total bobot × 100; essay yang belum
        diberi skor dihitung 0.
      </p>

      <div v-for="(s, i) in data.soal" :key="s.id" class="rounded-lg border border-outline-variant p-4">
        <div class="flex items-start justify-between gap-3">
          <p class="text-body-md text-on-surface whitespace-pre-line"><span class="font-semibold">{{ i + 1 }}.</span> {{ s.pertanyaan }}</p>
          <span class="shrink-0 text-label-sm text-on-surface-variant">bobot {{ s.bobot }}</span>
        </div>
        <ul v-if="s.tipe === 'PG'" class="mt-2 space-y-1">
          <li
            v-for="(p, pi) in s.pilihan"
            :key="pi"
            class="flex items-center gap-2 px-2 py-1 rounded text-body-sm"
            :class="pi === s.jawabanBenar ? 'bg-success-container text-on-success-container' : pi === s.jawabanPilihan ? 'bg-danger-container text-on-danger-container' : ''"
          >
            <span class="font-semibold w-5">{{ HURUF[pi] }}.</span>
            <span class="flex-1">{{ p }}</span>
            <span v-if="pi === s.jawabanPilihan" class="text-label-sm font-semibold">Jawaban peserta</span>
            <span v-if="pi === s.jawabanBenar" class="material-symbols-outlined" style="font-size: 18px">check</span>
          </li>
          <li v-if="s.jawabanPilihan === null" class="px-2 text-label-sm text-error">Tidak dijawab</li>
        </ul>
        <template v-else>
          <div class="mt-2 px-3 py-2 rounded-md bg-surface-container-low text-body-sm whitespace-pre-line min-h-12">
            <span v-if="s.jawabanTeks">{{ s.jawabanTeks }}</span>
            <span v-else class="text-error">Tidak dijawab</span>
          </div>
          <label class="mt-2 flex items-center justify-end gap-2 text-label-md">
            Skor
            <input
              v-model="skor[s.id]"
              type="number"
              min="0"
              :max="s.bobot"
              step="0.5"
              :disabled="!canUpdate"
              placeholder="-"
              class="w-20 px-2 py-1 border rounded text-body-sm bg-surface-container-lowest"
              :class="skor[s.id] === '' ? 'border-warning' : 'border-outline-variant'"
            />
            <span class="text-on-surface-variant">/ {{ s.bobot }}</span>
          </label>
        </template>
      </div>
    </div>
    <div v-else-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <template #footer>
      <AppButton variant="secondary" @click="open = false">Tutup</AppButton>
      <AppButton v-if="canUpdate && ringkasan.essay" :disabled="saving || loading" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan Skor Essay' }}</AppButton>
    </template>
  </Modal>
</template>

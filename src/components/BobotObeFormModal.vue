<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import {
  JENIS_EVALUASI,
  METODE_EVALUASI,
  type BobotObe,
  type BobotObePayload,
  type KomponenObe,
} from '@/api/bobotObe';
import { extractErrorMessage } from '@/api/http';

/**
 * Form Bobot OBE satu kelas (dipakai portal dosen & modul prodi) berupa tabel Komponen Evaluasi:
 * Metode Evaluasi, Jenis Evaluasi (komponen nilai), Bobot Evaluasi (%) dan Syarat Lulus. Total
 * wajib 100%. `save` dipanggil dengan payload; error ditampilkan di dalam modal.
 */
const props = defineProps<{
  subtitle?: string;
  bobot: BobotObe | null;
  save: (payload: BobotObePayload) => Promise<void>;
}>();
const open = defineModel<boolean>({ default: false });

interface Baris {
  uid: number;
  metode: string;
  jenis: KomponenObe | '';
  bobot: string;
  syaratLulus: 'YA' | 'TIDAK';
}

let uid = 0;
const baris = (metode = '', jenis: KomponenObe | '' = '', bobot = '', syarat = false): Baris => ({
  uid: ++uid,
  metode,
  jenis,
  bobot,
  syaratLulus: syarat ? 'YA' : 'TIDAK',
});

// Usulan awal bila belum pernah diisi = rumus pedoman lama.
const usulanAwal = () => [
  baris('Tugas Individu', 'tugas', '20,00'),
  baris('UTS', 'uts', '30,00', true),
  baris('UAS', 'uas', '40,00', true),
  baris('Aktivitas Partisipatif', 'partisipatif', '10,00'),
];

const rows = ref<Baris[]>([]);
const keterangan = ref('');
const error = ref<string | null>(null);
const saving = ref(false);

const fmt = (n: number) => n.toFixed(2).replace('.', ',');

watch(open, (v) => {
  if (!v) return;
  error.value = null;
  rows.value = props.bobot?.komponenEvaluasi?.length
    ? props.bobot.komponenEvaluasi.map((k) => baris(k.metode, k.jenis, fmt(k.bobot), k.syaratLulus))
    : usulanAwal();
  keterangan.value = props.bobot?.keterangan ?? '';
});

// Metode yang tersimpan tapi tidak ada di daftar tetap ditampilkan.
const metodeOptions = computed(() => {
  const list = METODE_EVALUASI.map((m) => m.value);
  rows.value.forEach((r) => r.metode && !list.includes(r.metode) && list.push(r.metode));
  return list.map((m) => ({ value: m, label: m }));
});
const jenisOptions = JENIS_EVALUASI;
const syaratOptions = [
  { value: 'YA', label: 'Menjadi syarat lulus' },
  { value: 'TIDAK', label: 'Tidak menjadi syarat lulus' },
];

const onMetode = (r: Baris) => {
  const m = METODE_EVALUASI.find((x) => x.value === r.metode);
  if (m && !r.jenis) r.jenis = m.jenis;
  if (m && (m.jenis === 'uts' || m.jenis === 'uas')) r.syaratLulus = 'YA';
};

const angka = (v: string) => (String(v ?? '').trim() === '' ? NaN : Number(String(v).replace(',', '.')));
const total = computed(() => Math.round(rows.value.reduce((s, r) => s + (angka(r.bobot) || 0), 0) * 100) / 100);

const tambah = (after?: number) => {
  const b = baris();
  if (after === undefined) rows.value.push(b);
  else rows.value.splice(after + 1, 0, b);
};
const hapus = (i: number) => rows.value.splice(i, 1);

const simpan = async () => {
  error.value = null;
  if (!rows.value.length) {
    error.value = 'Tambahkan minimal satu metode evaluasi';
    return;
  }
  const salah = rows.value.findIndex((r) => {
    const n = angka(r.bobot);
    return !r.metode || !r.jenis || !Number.isFinite(n) || n <= 0 || n > 100;
  });
  if (salah >= 0) {
    error.value = `Baris ${salah + 1}: lengkapi Metode, Jenis, dan Bobot Evaluasi (0–100)`;
    return;
  }
  if (total.value !== 100) {
    error.value = `Total persentase Komponen Evaluasi harus 100% (sekarang ${total.value}%)`;
    return;
  }
  saving.value = true;
  try {
    await props.save({
      komponenEvaluasi: rows.value.map((r) => ({
        metode: r.metode,
        jenis: r.jenis as KomponenObe,
        bobot: angka(r.bobot),
        syaratLulus: r.syaratLulus === 'YA',
      })),
      keterangan: keterangan.value.trim() || null,
    });
    open.value = false;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal menyimpan Bobot OBE');
  } finally {
    saving.value = false;
  }
};

const th = 'px-3 py-2.5 text-label-md font-semibold text-on-primary whitespace-nowrap';
const td = 'px-2 py-3 align-top border-b border-outline-variant';
</script>

<template>
  <Modal v-model="open" title="Bobot OBE" :subtitle="subtitle" size="2xl">
    <div class="space-y-4">
      <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

      <div>
        <h3 class="text-title-md font-semibold text-primary pb-2 border-b-2 border-primary/60">Komponen Evaluasi</h3>
        <div class="overflow-x-auto mt-3">
          <table class="w-full border-collapse text-body-sm min-w-[900px] table-fixed">
            <thead class="bg-primary">
              <tr>
                <th :class="th" class="w-12 text-left">No.</th>
                <th :class="th" class="text-left w-[22%]">Metode Evaluasi</th>
                <th :class="th" class="text-left">Jenis Evaluasi</th>
                <th :class="th" class="text-left w-28">Bobot Evaluasi</th>
                <th :class="th" class="text-left w-[22%]">Syarat Lulus</th>
                <th :class="th" class="text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rows" :key="r.uid">
                <td :class="td" class="pt-5">{{ i + 1 }}</td>
                <td :class="td">
                  <SelectInput
                    v-model="r.metode"
                    :options="metodeOptions"
                    placeholder="-- Pilih Metode Evaluasi --"
                    @change="onMetode(r)"
                  />
                </td>
                <td :class="td">
                  <SelectInput v-model="r.jenis" :options="jenisOptions" placeholder="-- Pilih Jenis Evaluasi --" />
                </td>
                <td :class="td">
                  <input
                    v-model="r.bobot"
                    inputmode="decimal"
                    placeholder="0,00"
                    class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-right tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    @blur="Number.isFinite(angka(r.bobot)) && (r.bobot = fmt(angka(r.bobot)))"
                  />
                </td>
                <td :class="td">
                  <SelectInput v-model="r.syaratLulus" :options="syaratOptions" :clearable="false" />
                </td>
                <td :class="td" class="text-center">
                  <div class="flex items-center justify-center gap-1 pt-1">
                    <button
                      type="button"
                      class="w-7 h-7 rounded bg-[#059669] text-white flex items-center justify-center hover:opacity-90"
                      title="Tambah baris di bawahnya"
                      @click="tambah(i)"
                    >
                      <span class="material-symbols-outlined" style="font-size: 18px">add</span>
                    </button>
                    <button
                      type="button"
                      class="w-7 h-7 rounded bg-error text-on-error flex items-center justify-center hover:opacity-90"
                      title="Hapus baris"
                      @click="hapus(i)"
                    >
                      <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td :class="td" colspan="6" class="text-center text-on-surface-variant">Belum ada metode evaluasi</td>
              </tr>
              <tr>
                <td :class="td" colspan="6">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-[#059669] text-[#059669] text-label-md font-medium hover:bg-[#059669]/10"
                    @click="tambah()"
                  >
                    <span class="material-symbols-outlined" style="font-size: 18px">add</span>
                    Tambah Metode Evaluasi
                  </button>
                </td>
              </tr>
              <tr class="border-b-2 border-primary">
                <td class="px-3 py-3 font-medium" colspan="3">Total Persentase Komponen Evaluasi</td>
                <td class="px-3 py-3 text-center font-semibold tabular-nums" :class="total === 100 ? 'text-[#059669]' : 'text-error'">
                  {{ total }}%
                </td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <label class="block">
        <span class="block font-medium text-label-md text-on-surface mb-1">Keterangan / CPMK (opsional)</span>
        <textarea
          v-model="keterangan"
          rows="2"
          maxlength="2000"
          class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        ></textarea>
      </label>
      <p class="text-label-sm text-on-surface-variant">
        Jenis Evaluasi menentukan kolom nilai yang diisi; beberapa metode berjenis sama (mis. Tugas Individu + Tugas Kelompok)
        dijumlahkan bobotnya.
        <template v-if="bobot">Nilai yang sudah tersimpan di kelas ini akan dihitung ulang dengan bobot baru.</template>
      </p>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="open = false">Batal</AppButton>
      <AppButton :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan Bobot' }}</AppButton>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import { bankUjianApi, type SoalUjian, type TipeSoalUjian } from '@/api/bankUjian';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastSuccess } from '@/utils/swal';

/** Tambah / ubah paket ujian (Bank Ujian LMS): info ujian + daftar soal pilihan ganda & essay berbobot. */
const props = defineProps<{ bankId: number | null }>();
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ saved: [] }>();

const HURUF = ['A', 'B', 'C', 'D', 'E', 'F'];

const form = reactive({ judul: '', deskripsi: '', durasiMenit: '' as string | number | null, acakSoal: false });
const soal = ref<SoalUjian[]>([]);
const jumlahMengerjakan = ref(0);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

const soalBaru = (tipe: TipeSoalUjian): SoalUjian =>
  tipe === 'PG' ? { tipe, pertanyaan: '', pilihan: ['', '', '', ''], jawabanBenar: null, bobot: 1 } : { tipe, pertanyaan: '', bobot: 1 };

watch(open, async (v) => {
  if (!v) return;
  error.value = null;
  jumlahMengerjakan.value = 0;
  if (!props.bankId) {
    Object.assign(form, { judul: '', deskripsi: '', durasiMenit: 60, acakSoal: false });
    soal.value = [soalBaru('PG')];
    return;
  }
  loading.value = true;
  try {
    const d = await bankUjianApi.get(props.bankId);
    Object.assign(form, { judul: d.judul, deskripsi: d.deskripsi ?? '', durasiMenit: d.durasiMenit ?? '', acakSoal: d.acakSoal });
    soal.value = d.soal.map((s) => ({ ...s, pilihan: s.tipe === 'PG' ? [...(s.pilihan ?? [])] : undefined }));
    jumlahMengerjakan.value = d.jumlahMengerjakan;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat bank ujian');
  } finally {
    loading.value = false;
  }
});

const tambahSoal = (tipe: TipeSoalUjian) => soal.value.push(soalBaru(tipe));
const hapusSoal = (i: number) => soal.value.splice(i, 1);
const geser = (i: number, arah: -1 | 1) => {
  const j = i + arah;
  if (j < 0 || j >= soal.value.length) return;
  [soal.value[i], soal.value[j]] = [soal.value[j], soal.value[i]];
};
const tambahPilihan = (s: SoalUjian) => s.pilihan!.length < HURUF.length && s.pilihan!.push('');
const hapusPilihan = (s: SoalUjian, i: number) => {
  s.pilihan!.splice(i, 1);
  if (s.jawabanBenar === i) s.jawabanBenar = null;
  else if (s.jawabanBenar != null && s.jawabanBenar > i) s.jawabanBenar -= 1;
};

const validasi = (): string | null => {
  if (!form.judul.trim()) return 'Judul ujian wajib diisi';
  if (!soal.value.length) return 'Tambahkan minimal satu soal';
  for (const [i, s] of soal.value.entries()) {
    const no = `Soal no. ${i + 1}`;
    if (!s.pertanyaan.trim()) return `${no}: pertanyaan wajib diisi`;
    if (!(Number(s.bobot) > 0)) return `${no}: bobot harus lebih dari 0`;
    if (s.tipe === 'PG') {
      if (s.pilihan!.some((p) => !p.trim())) return `${no}: semua pilihan jawaban wajib diisi`;
      if (s.jawabanBenar == null) return `${no}: pilih jawaban benar`;
    }
  }
  return null;
};

const simpan = async () => {
  error.value = validasi();
  if (error.value) return;
  if (jumlahMengerjakan.value) {
    const ok = await confirmAction({
      title: 'Simpan perubahan soal?',
      text: `${jumlahMengerjakan.value} peserta sudah mengerjakan ujian ini. Skor pilihan ganda dihitung ulang (nilai yang sudah ditetapkan Lulus/Tidak Lulus tidak berubah); jawaban pada soal yang dihapus ikut terhapus.`,
      confirmLabel: 'Simpan',
    });
    if (!ok) return;
  }
  saving.value = true;
  try {
    const payload = {
      judul: form.judul.trim(),
      deskripsi: form.deskripsi.trim() || null,
      durasiMenit: form.durasiMenit === '' || form.durasiMenit === null ? null : Number(form.durasiMenit),
      acakSoal: form.acakSoal,
      soal: soal.value.map((s) => ({
        id: s.id ?? null,
        tipe: s.tipe,
        pertanyaan: s.pertanyaan.trim(),
        bobot: Number(s.bobot),
        ...(s.tipe === 'PG' ? { pilihan: s.pilihan!.map((p) => p.trim()), jawabanBenar: s.jawabanBenar } : {}),
      })),
    };
    if (props.bankId) await bankUjianApi.update(props.bankId, payload);
    else await bankUjianApi.create(payload);
    toastSuccess('Bank ujian disimpan');
    emit('saved');
    open.value = false;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal menyimpan bank ujian');
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Modal v-model="open" :title="bankId ? 'Ubah Bank Ujian' : 'Tambah Bank Ujian'" subtitle="Paket soal pilihan ganda & essay — bisa dipakai tes seleksi PMB." size="xl">
    <p v-if="loading" class="py-10 text-center text-body-sm text-on-surface-variant">Memuat...</p>
    <div v-else class="space-y-5">
      <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

      <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_10rem] gap-4">
        <TextInput v-model="form.judul" label="Judul Ujian" required placeholder="mis. Tes Seleksi Masuk 2026 - Gelombang 1" />
        <TextInput v-model="form.durasiMenit" label="Durasi (menit)" type="number" min="1" placeholder="Tanpa batas" />
      </div>
      <TextareaInput v-model="form.deskripsi" label="Petunjuk / Deskripsi" :rows="2" placeholder="Petunjuk pengerjaan yang tampil sebelum peserta mulai (opsional)" />
      <CheckboxToggle v-model="form.acakSoal" label="Acak urutan soal" description="Setiap peserta mendapat urutan soal berbeda." />

      <div class="border-t border-outline-variant pt-4">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p class="text-body-md font-semibold text-on-surface">
            Soal ({{ soal.length }}) ·
            <span class="font-normal text-on-surface-variant">
              {{ soal.filter((s) => s.tipe === 'PG').length }} PG, {{ soal.filter((s) => s.tipe === 'ESSAY').length }} essay, total bobot
              {{ soal.reduce((t, s) => t + (Number(s.bobot) || 0), 0) }}
            </span>
          </p>
          <div class="flex gap-2">
            <AppButton variant="secondary" icon="radio_button_checked" @click="tambahSoal('PG')">Soal PG</AppButton>
            <AppButton variant="secondary" icon="edit_note" @click="tambahSoal('ESSAY')">Soal Essay</AppButton>
          </div>
        </div>
        <div v-if="jumlahMengerjakan" class="mb-3 px-3 py-2 rounded-md bg-warning-container text-on-warning-container text-body-sm">
          {{ jumlahMengerjakan }} peserta sudah mengerjakan ujian ini. Mengubah atau menghapus soal akan menghitung ulang nilai mereka.
        </div>

        <div class="space-y-3">
          <div v-for="(s, i) in soal" :key="i" class="rounded-lg border border-outline-variant p-4">
            <div class="flex items-center justify-between gap-2 mb-2">
              <p class="text-label-md font-semibold text-on-surface">
                {{ i + 1 }}.
                <span class="ml-1 rounded px-1.5 py-0.5 text-[11px]" :class="s.tipe === 'PG' ? 'bg-primary/10 text-primary' : 'bg-[#0e9aa7]/10 text-[#0e7c86]'">
                  {{ s.tipe === 'PG' ? 'Pilihan Ganda' : 'Essay' }}
                </span>
              </p>
              <div class="flex items-center gap-1">
                <label class="flex items-center gap-1 text-label-sm text-on-surface-variant mr-2">
                  Bobot
                  <input v-model.number="s.bobot" type="number" min="0.5" step="0.5" class="w-16 px-2 py-1 border border-outline-variant rounded text-body-sm bg-surface-container-lowest" />
                </label>
                <button type="button" class="p-1 text-on-surface-variant hover:text-primary disabled:opacity-30" :disabled="i === 0" title="Naikkan" @click="geser(i, -1)">
                  <span class="material-symbols-outlined" style="font-size: 18px">arrow_upward</span>
                </button>
                <button type="button" class="p-1 text-on-surface-variant hover:text-primary disabled:opacity-30" :disabled="i === soal.length - 1" title="Turunkan" @click="geser(i, 1)">
                  <span class="material-symbols-outlined" style="font-size: 18px">arrow_downward</span>
                </button>
                <button type="button" class="p-1 text-on-surface-variant hover:text-error" title="Hapus soal" @click="hapusSoal(i)">
                  <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
                </button>
              </div>
            </div>
            <textarea
              v-model="s.pertanyaan"
              rows="2"
              placeholder="Tulis pertanyaan..."
              class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary resize-y"
            />
            <div v-if="s.tipe === 'PG'" class="mt-2 space-y-1.5">
              <div v-for="(_, pi) in s.pilihan" :key="pi" class="flex items-center gap-2">
                <input v-model="s.jawabanBenar" type="radio" :name="`benar-${i}`" :value="pi" class="w-4 h-4 accent-success" title="Tandai sebagai jawaban benar" />
                <span class="w-5 text-label-md font-semibold text-on-surface-variant">{{ HURUF[pi] }}.</span>
                <input
                  v-model="s.pilihan![pi]"
                  type="text"
                  :placeholder="`Pilihan ${HURUF[pi]}`"
                  class="flex-1 px-3 py-1.5 border rounded-md bg-surface-container-lowest text-body-sm outline-none focus:border-primary"
                  :class="s.jawabanBenar === pi ? 'border-success' : 'border-outline-variant'"
                />
                <button
                  v-if="s.pilihan!.length > 2"
                  type="button"
                  class="p-1 text-on-surface-variant hover:text-error"
                  title="Hapus pilihan"
                  @click="hapusPilihan(s, pi)"
                >
                  <span class="material-symbols-outlined" style="font-size: 16px">close</span>
                </button>
              </div>
              <div class="flex items-center justify-between pl-6">
                <button v-if="s.pilihan!.length < HURUF.length" type="button" class="text-label-sm text-primary hover:underline" @click="tambahPilihan(s)">
                  + Tambah pilihan
                </button>
                <span class="text-label-sm" :class="s.jawabanBenar == null ? 'text-error' : 'text-success'">
                  {{ s.jawabanBenar == null ? 'Klik bulatan untuk menandai jawaban benar' : `Jawaban benar: ${HURUF[s.jawabanBenar]}` }}
                </span>
              </div>
            </div>
            <p v-else class="mt-2 text-label-sm text-on-surface-variant">Peserta menulis jawaban uraian; skor (0 – bobot) diisi panitia saat koreksi.</p>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="open = false">Batal</AppButton>
      <AppButton :disabled="saving || loading" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
    </template>
  </Modal>
</template>

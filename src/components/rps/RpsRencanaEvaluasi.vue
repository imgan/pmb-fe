<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import RpsSalinPeriodeModal from './RpsSalinPeriodeModal.vue';
import { METODE_EVALUASI_LABEL, useRpsApi, type MetodeEvaluasi, type RpsDetail, type RpsPeriode } from '@/api/rps';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError, toastSuccess, toastWarning } from '@/utils/swal';
import { btnAksi, inputCls } from './shared';

// Klien RPS sesuai portal (Prodi / Dosen) dari halaman RPS.
const rpsApi = useRpsApi();

/**
 * Menu "Rencana Evaluasi" → Komponen Evaluasi periode terpilih, diedit langsung di tabel lalu "Simpan Data":
 * baris metode evaluasi (metode, jenis evaluasi, bobot evaluasi % nilai akhir) dengan sub metode opsional
 * (tombol +), dan nilai tiap CPMK (kolom C01, ... mengikuti level Pemetaan CPMK) pada baris daun.
 * Aturan: total bobot evaluasi = 100% dan Σ nilai CPMK tiap metode = bobot evaluasinya.
 */
const props = defineProps<{
  mkId: number;
  detail: RpsDetail;
  tahunAjaranId: number;
  periode: RpsPeriode;
  mkOptions: SelectOption[];
  tahunAjaranOptions: SelectOption[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}>();
const emit = defineEmits<{ reload: [] }>();

const METODE_OPTIONS: SelectOption[] = Object.entries(METODE_EVALUASI_LABEL).map(([value, label]) => ({ value, label }));

/** Kolom CPMK sesuai level Pemetaan CPMK (CPMK: induk; Sub-CPMK: Sub, atau CPMK tanpa Sub). */
const cpmkKolom = computed(() => {
  const semua = props.detail.cpmk;
  const induk = semua.filter((c) => !c.parentId);
  if (props.detail.mataKuliah.levelPemetaanCpmk !== 'SUB_CPMK') return induk;
  return induk.flatMap((c) => {
    const sub = semua.filter((x) => x.parentId === c.id);
    return sub.length ? sub : [c];
  });
});

interface Baris {
  key: string;
  id: number | null;
  parentKey: string | null;
  metode: string | number | null;
  jenisEvaluasi: string;
  bobot: string;
}
const baris = ref<Baris[]>([]);
/** "key|cpmkId" → nilai (teks isian). */
const nilai = ref<Record<string, string>>({});
const dirty = ref(false);
let urutBaru = 0;

const induk = computed(() => baris.value.filter((b) => !b.parentKey));
const subOf = (key: string) => baris.value.filter((b) => b.parentKey === key);
const tampil = computed(() => induk.value.flatMap((i) => [i, ...subOf(i.key)]));
/** Baris yang nilai CPMK-nya diisi: sub metode, atau metode tanpa sub. */
const daun = (b: Baris) => !!b.parentKey || !subOf(b.key).length;
const nomor = (b: Baris) => {
  const i = induk.value.findIndex((x) => x.key === (b.parentKey ?? b.key)) + 1;
  return b.parentKey ? `${i}.${subOf(b.parentKey).findIndex((x) => x.key === b.key) + 1}` : String(i);
};

const reset = () => {
  baris.value = props.periode.evaluasi.map((e) => ({
    key: String(e.id),
    id: e.id,
    parentKey: e.parentId ? String(e.parentId) : null,
    metode: e.metode ?? '',
    jenisEvaluasi: e.jenisEvaluasi ?? '',
    bobot: e.parentId ? '' : e.bobot.toFixed(2),
  }));
  nilai.value = Object.fromEntries(props.periode.evaluasiCpmk.map((c) => [`${c.rpsEvaluasiId}|${c.cpmkId}`, c.bobot.toFixed(2)]));
  dirty.value = false;
};
watch(() => props.periode, reset, { immediate: true });
const ubah = () => (dirty.value = true);

// ---- Hitungan ----
const bulat = (n: number) => Math.round(n * 100) / 100;
const persen = (n: number) => `${n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const angka = (v: string | undefined) => Number(v) || 0;
/** Nilai satu sel; untuk metode ber-sub = jumlah sel sub-nya. */
const nilaiSel = (b: Baris, cpmkId: number): number =>
  daun(b) ? angka(nilai.value[`${b.key}|${cpmkId}`]) : bulat(subOf(b.key).reduce((s, x) => s + angka(nilai.value[`${x.key}|${cpmkId}`]), 0));
const sigma = (b: Baris) => bulat(cpmkKolom.value.reduce((s, c) => s + nilaiSel(b, c.id), 0));
const totalBobot = computed(() => bulat(induk.value.reduce((s, b) => s + angka(b.bobot), 0)));
const totalKolom = (cpmkId: number) => bulat(induk.value.reduce((s, b) => s + nilaiSel(b, cpmkId), 0));
const totalSigma = computed(() => bulat(induk.value.reduce((s, b) => s + sigma(b), 0)));
const cocok = (b: Baris) => Math.abs(sigma(b) - angka(b.bobot)) <= 0.01;

// ---- Isian (dibatasi sisa kuota; melebihi → dipotong + peringatan) ----
const batasi = (el: HTMLInputElement, maks: number, pesan: string) => {
  if (el.value === '') return '';
  const batas = Math.max(bulat(maks), 0);
  const ketik = Number(el.value) || 0;
  const n = Math.min(Math.max(ketik, 0), batas);
  if (n !== Number(el.value)) el.value = String(n);
  if (ketik > batas) toastWarning(pesan.replace('{sisa}', persen(batas)));
  return el.value;
};
/** Bobot evaluasi: total semua metode maksimal 100%. */
const isiBobot = (b: Baris, el: HTMLInputElement) => {
  b.bobot = batasi(el, 100 - totalBobot.value + angka(b.bobot), 'Total bobot evaluasi maksimal 100%. Sisa bobot yang bisa diisi: {sisa}%');
  ubah();
};
/** Nilai CPMK: Σ nilai satu metode maksimal bobot evaluasi metode tsb. */
const isiNilai = (b: Baris, cpmkId: number, el: HTMLInputElement) => {
  const key = `${b.key}|${cpmkId}`;
  const metode = baris.value.find((x) => x.key === (b.parentKey ?? b.key))!;
  const maks = angka(metode.bobot) - sigma(metode) + angka(nilai.value[key]);
  nilai.value = { ...nilai.value, [key]: batasi(el, maks, `Σ nilai CPMK tidak boleh melebihi bobot evaluasi (${persen(angka(metode.bobot))}%). Sisa: {sisa}`) };
  ubah();
};
/** Keterangan selisih Σ CPMK terhadap bobot evaluasi satu metode. */
const selisih = (b: Baris) => {
  const d = bulat(sigma(b) - angka(b.bobot));
  return d > 0 ? `Lebih ${persen(d)}` : d < 0 ? `Kurang ${persen(-d)}` : '';
};

// ---- Tambah / hapus ----
const tambahMetode = () => {
  baris.value = [...baris.value, { key: `baru-${++urutBaru}`, id: null, parentKey: null, metode: '', jenisEvaluasi: '', bobot: '' }];
  ubah();
};
const tambahSub = (i: Baris) => {
  const sub: Baris = { key: `baru-${++urutBaru}`, id: null, parentKey: i.key, metode: '', jenisEvaluasi: '', bobot: '' };
  // Sub pertama mewarisi nilai CPMK metodenya.
  if (!subOf(i.key).length) {
    nilai.value = Object.fromEntries(Object.entries(nilai.value).map(([k, v]) => [k.startsWith(`${i.key}|`) ? `${sub.key}|${k.split('|')[1]}` : k, v]));
  }
  baris.value = [...baris.value, sub];
  ubah();
};
const hapus = async (b: Baris) => {
  if (b.id) {
    const ok = await confirmAction({
      title: b.parentKey ? 'Hapus sub metode evaluasi?' : 'Hapus metode evaluasi?',
      text: `${b.parentKey ? '' : 'Sub metode & '}nilai CPMK-nya ikut terhapus setelah Simpan Data.`,
      confirmLabel: 'Ya, hapus',
    });
    if (!ok) return;
  }
  const keys = [b.key, ...subOf(b.key).map((s) => s.key)];
  baris.value = baris.value.filter((x) => !keys.includes(x.key));
  nilai.value = Object.fromEntries(Object.entries(nilai.value).filter(([k]) => !keys.includes(k.split('|')[0])));
  ubah();
};

// ---- Simpan ----
const saving = ref(false);
const simpan = async () => {
  for (const b of tampil.value) {
    if (!b.parentKey && !b.metode) return toastError(`Metode evaluasi baris ${nomor(b)} wajib dipilih`);
    if (b.parentKey && !b.jenisEvaluasi.trim()) return toastError(`Jenis evaluasi sub metode ${nomor(b)} wajib diisi`);
  }
  if (induk.value.length && Math.abs(totalBobot.value - 100) > 0.01) return toastError(`Total bobot evaluasi harus 100% (sekarang ${persen(totalBobot.value)}%)`);
  const salah = induk.value.find((b) => !cocok(b));
  if (salah) return toastError(`Nilai CPMK baris ${nomor(salah)} (${persen(sigma(salah))}) harus sama dengan bobot evaluasinya (${persen(angka(salah.bobot))})`);
  saving.value = true;
  try {
    await rpsApi.saveEvaluasi(props.mkId, props.tahunAjaranId, {
      items: tampil.value.map((b) => ({
        key: b.key,
        id: b.id,
        parentKey: b.parentKey,
        metode: b.parentKey ? null : (b.metode as MetodeEvaluasi),
        jenisEvaluasi: b.jenisEvaluasi.trim() || null,
        bobot: b.parentKey ? null : angka(b.bobot),
      })),
      cells: Object.entries(nilai.value)
        .filter(([k, v]) => angka(v) > 0 && tampil.value.some((b) => b.key === k.split('|')[0] && daun(b)) && cpmkKolom.value.some((c) => c.id === Number(k.split('|')[1])))
        .map(([k, v]) => ({ evalKey: k.split('|')[0], cpmkId: Number(k.split('|')[1]), bobot: angka(v) })),
    });
    toastSuccess('Rencana evaluasi disimpan');
    emit('reload');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan rencana evaluasi'));
  } finally {
    saving.value = false;
  }
};

const salinOpen = ref(false);
const inputAngka = 'w-full min-w-[4.5rem] px-2 py-1 border border-outline-variant rounded text-right bg-surface-container-lowest';
</script>

<template>
  <Teleport v-if="canUpdate" defer to="#rps-aksi">
    <AppButton icon="save" :disabled="saving || !dirty" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan Data' }}</AppButton>
    <AppButton variant="secondary" icon="refresh" :disabled="saving || !dirty" @click="reset">Batalkan</AppButton>
  </Teleport>

  <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
    <h2 class="mx-4 pt-4 pb-2 border-b-2 border-primary font-semibold text-headline-sm text-primary">Komponen Evaluasi</h2>
    <div class="m-4 flex items-center gap-2 px-3 py-2.5 rounded-md border border-[#eda100]/50 bg-[#eda100]/10 text-body-sm">
      <span class="material-symbols-outlined text-[#eda100]" style="font-size: 20px">lightbulb</span>
      Nilai CPMK harus diisi dan tambahkan sub metode evaluasi bila diperlukan.
    </div>
    <div v-if="!cpmkKolom.length" class="mx-4 mb-4 text-body-sm text-on-surface-variant">
      Mata kuliah ini belum memiliki CPMK. Tambahkan dulu lewat menu Pemetaan CPMK agar nilai CPMK bisa diisi.
    </div>

    <div class="overflow-auto max-h-[70vh] border-t border-outline-variant">
      <table class="w-full text-body-sm border-collapse">
        <thead class="bg-primary text-on-primary sticky top-0 z-10">
          <tr>
            <th class="p-3 text-left w-14">No.</th>
            <th class="p-3 text-left w-56">Metode Evaluasi</th>
            <th class="p-3 text-left min-w-56">Jenis Evaluasi</th>
            <th v-for="c in cpmkKolom" :key="c.id" class="p-3 text-center min-w-24 border-l border-on-primary/30" :title="c.deskripsi">{{ c.kode }}</th>
            <th v-if="!cpmkKolom.length" class="p-3 text-center min-w-24 border-l border-on-primary/30">CPMK</th>
            <th class="p-3 text-center w-32 border-l border-on-primary/30">Bobot Evaluasi</th>
            <th class="p-3 text-center w-20 border-l border-on-primary/30" title="Jumlah nilai CPMK">Σ CPMK</th>
            <th class="p-3 text-center w-16 border-l border-on-primary/30">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant align-top">
          <tr v-if="!tampil.length">
            <td :colspan="Math.max(cpmkKolom.length, 1) + 6" class="p-6 text-center text-on-surface-variant">
              Anda belum menambahkan Rencana Evaluasi. Silahkan klik tombol <strong>Tambah Metode Evaluasi</strong> di bawah untuk menambahkan.
            </td>
          </tr>
          <tr v-for="b in tampil" :key="b.key" :class="b.parentKey ? '' : 'bg-surface-container-low/40'">
            <td class="p-3" :class="b.parentKey ? 'pl-5 text-on-surface-variant' : 'font-medium'">{{ nomor(b) }}</td>
            <td class="p-2">
              <SelectInput
                v-if="!b.parentKey"
                v-model="b.metode"
                :options="METODE_OPTIONS"
                placeholder="-- Pilih Metode --"
                :disabled="!canUpdate"
                @update:model-value="ubah"
              />
              <span v-else class="inline-flex items-center gap-1 pl-3 pt-1.5 text-on-surface-variant">
                <span class="material-symbols-outlined" style="font-size: 16px">subdirectory_arrow_right</span>
                Sub metode
              </span>
            </td>
            <td class="p-2">
              <input
                v-model="b.jenisEvaluasi"
                :class="inputCls"
                :placeholder="b.parentKey ? 'mis. Tugas 1: Membuat rancangan UI (wajib)' : 'Keterangan (opsional)'"
                :disabled="!canUpdate"
                @input="ubah"
              />
            </td>
            <td v-for="c in cpmkKolom" :key="c.id" class="p-2 text-center border-l border-outline-variant">
              <input
                v-if="daun(b)"
                type="number"
                min="0"
                step="0.01"
                :class="inputAngka"
                :value="nilai[`${b.key}|${c.id}`] ?? ''"
                :disabled="!canUpdate"
                @input="isiNilai(b, c.id, $event.target as HTMLInputElement)"
              />
              <span v-else class="inline-block pt-1.5 text-on-surface-variant">{{ nilaiSel(b, c.id) ? persen(nilaiSel(b, c.id)) : '' }}</span>
            </td>
            <td v-if="!cpmkKolom.length" class="p-2 text-center text-label-sm text-on-surface-variant border-l border-outline-variant">-</td>
            <td class="p-2 border-l border-outline-variant">
              <input
                v-if="!b.parentKey"
                type="number"
                min="0"
                max="100"
                step="0.01"
                :class="inputAngka"
                :value="b.bobot"
                :disabled="!canUpdate"
                @input="isiBobot(b, $event.target as HTMLInputElement)"
              />
            </td>
            <td class="p-3 text-center border-l border-outline-variant">
              <template v-if="!b.parentKey">
                <span class="font-medium" :class="cocok(b) ? 'text-[#2e7d5b]' : 'text-error'" :title="cocok(b) ? 'Sesuai bobot evaluasi' : 'Belum sama dengan bobot evaluasi'">
                  {{ persen(sigma(b)) }}
                </span>
                <span v-if="!cocok(b)" class="block text-label-sm text-error">{{ selisih(b) }}</span>
              </template>
              <span v-else class="text-on-surface-variant">{{ persen(sigma(b)) }}</span>
            </td>
            <td class="p-2 border-l border-outline-variant">
              <div class="flex flex-col items-center gap-1">
                <button v-if="!b.parentKey && canCreate" type="button" :class="[btnAksi, 'bg-[#2e7d5b]']" title="Tambah sub metode evaluasi" @click="tambahSub(b)">
                  <span class="material-symbols-outlined" style="font-size: 16px">add</span>
                </button>
                <button v-if="canDelete || !b.id" type="button" :class="[btnAksi, 'bg-[#d83b3b]']" title="Hapus" @click="hapus(b)">
                  <span class="material-symbols-outlined" style="font-size: 16px">delete</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="tampil.length" class="border-t-2 border-outline-variant bg-surface-container-low font-medium">
          <tr>
            <td colspan="3" class="p-3 text-right">Total</td>
            <td v-for="c in cpmkKolom" :key="c.id" class="p-3 text-center border-l border-outline-variant">{{ persen(totalKolom(c.id)) }}</td>
            <td v-if="!cpmkKolom.length" class="border-l border-outline-variant" />
            <td class="p-3 text-center border-l border-outline-variant" :class="totalBobot === 100 ? 'text-[#2e7d5b]' : 'text-error'">{{ persen(totalBobot) }}%</td>
            <td class="p-3 text-center border-l border-outline-variant">{{ persen(totalSigma) }}</td>
            <td class="border-l border-outline-variant" />
          </tr>
        </tfoot>
      </table>
    </div>

    <div v-if="canCreate" class="px-4 py-3 border-t border-outline-variant flex flex-wrap gap-2">
      <AppButton icon="add" @click="tambahMetode">Tambah Metode Evaluasi</AppButton>
      <AppButton
        variant="secondary"
        icon="content_copy"
        :disabled="dirty || tampil.length > 0"
        :title="tampil.length ? 'Salin hanya ke periode yang rencana evaluasinya masih kosong' : ''"
        @click="salinOpen = true"
      >
        Salin dari Periode / Mata Kuliah Lain
      </AppButton>
    </div>
  </section>

  <RpsSalinPeriodeModal
    v-model="salinOpen"
    jenis="evaluasi"
    :mk-id="mkId"
    :tahun-ajaran-id="tahunAjaranId"
    :mk-options="mkOptions"
    :tahun-ajaran-options="tahunAjaranOptions"
    @disalin="emit('reload')"
  />
</template>

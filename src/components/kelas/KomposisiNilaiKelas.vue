<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import AppButton from '@/components/ui/AppButton.vue';
import HoverTip from '@/components/ui/HoverTip.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import { JENIS_EVALUASI, METODE_EVALUASI, type KomponenEvaluasi, type KomponenObe } from '@/api/bobotObe';
import { useKelasKuliahApi, type KelasKuliahDetail } from '@/api/kelasKuliah';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError, toastSuccess, toastWarning } from '@/utils/swal';

// Klien sesuai portal (Prodi / Dosen) dari halaman detail kelas.
const kelasKuliahApi = useKelasKuliahApi();

/**
 * Nilai Perkuliahan → Komposisi Nilai Kelas: Komponen Evaluasi kelas (bobot_obe) — metode evaluasi, jenis
 * evaluasi, sub metode (bobot % dari metode induk), nilai per CPMK (kolom mengikuti Pemetaan CPMK RPS),
 * bobot evaluasi & syarat lulus. Bila belum diisi, usulan dari Rencana Evaluasi RPS ditampilkan.
 * Tombol "Ubah Data" & "Aksi" di-teleport ke bar atas halaman kelas (#kelas-aksi).
 */
/** inputNilaiTo: portal Dosen — tujuan ikon "Input Nilai" (sama dengan ikon di daftar Input Nilai). */
const props = defineProps<{ detail: KelasKuliahDetail; canUpdate: boolean; canDelete: boolean; inputNilaiTo?: RouteLocationRaw }>();
const emit = defineEmits<{ reload: [] }>();

/** Pengaturan bobot (Ubah Data, Ambil dari RPS, Hapus) hanya untuk kelas yang mata kuliahnya OBE. */
const bisaAtur = computed(() => props.detail.kelas.isObe);

const JENIS_LABEL = Object.fromEntries(JENIS_EVALUASI.map((j) => [j.value, j.label])) as Record<KomponenObe, string>;
const JENIS_OPTIONS: SelectOption[] = JENIS_EVALUASI.map((j) => ({ value: j.value, label: j.label }));
const kolom = computed(() => props.detail.kolomCpmk);
/** Komposisi tersimpan, atau usulan RPS bila belum ada. */
const dariRps = computed(() => !props.detail.komposisi && props.detail.rps.komponenEvaluasi.length > 0);
/** Rencana Evaluasi RPS diubah setelah komposisi kelas disimpan (input nilai dosen mengikuti dokumen terbaru). */
const rpsLebihBaru = computed(
  () =>
    !!props.detail.komposisi &&
    props.detail.rps.komponenEvaluasi.length > 0 &&
    !!props.detail.rps.diperbarui &&
    new Date(props.detail.rps.diperbarui) > new Date(props.detail.komposisi.updatedAt),
);
const sumber = computed<KomponenEvaluasi[]>(() => props.detail.komposisi?.komponenEvaluasi ?? props.detail.rps.komponenEvaluasi);

// ---- Hitungan bersama ----
const bulat = (n: number) => Math.round(n * 100) / 100;
const persen = (n: number) => `${n.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;
const angka = (v: unknown) => Number(v) || 0;
const sumObj = (o?: Record<string, number | string> | null) => bulat(Object.values(o ?? {}).reduce<number>((s, v) => s + angka(v), 0));

// ---- Mode edit ----
interface Baris {
  key: string;
  parentKey: string | null;
  metode: string | number | null;
  jenis: string | number | null;
  nama: string;
  bobot: string;
  syaratLulus: boolean;
  cpmk: Record<string, string>;
}
const editing = ref(false);
const baris = ref<Baris[]>([]);
let urut = 0;
const kunci = () => `b${++urut}`;
const keBaris = (list: KomponenEvaluasi[]) =>
  list.flatMap((k) => {
    const key = kunci();
    const strCpmk = (o?: Record<string, number> | null) => Object.fromEntries(Object.entries(o ?? {}).map(([c, v]) => [c, String(v)]));
    const induk: Baris = { key, parentKey: null, metode: k.metode, jenis: k.jenis, nama: '', bobot: String(k.bobot), syaratLulus: k.syaratLulus, cpmk: k.sub?.length ? {} : strCpmk(k.cpmk) };
    return [induk, ...(k.sub ?? []).map((s) => ({ key: kunci(), parentKey: key, metode: '', jenis: '', nama: s.nama, bobot: String(s.bobot), syaratLulus: false, cpmk: strCpmk(s.cpmk) }))];
  });
const induk = computed(() => baris.value.filter((b) => !b.parentKey));
const subOf = (key: string) => baris.value.filter((b) => b.parentKey === key);
const tampil = computed(() => induk.value.flatMap((i) => [i, ...subOf(i.key)]));
const daun = (b: Baris) => !!b.parentKey || !subOf(b.key).length;
const nomor = (b: Baris) => {
  const i = induk.value.findIndex((x) => x.key === (b.parentKey ?? b.key)) + 1;
  return b.parentKey ? `${i}.${subOf(b.parentKey).findIndex((x) => x.key === b.key) + 1}` : String(i);
};
const totalBobot = computed(() => bulat(induk.value.reduce((s, b) => s + angka(b.bobot), 0)));
const totalSub = (key: string) => bulat(subOf(key).reduce((s, b) => s + angka(b.bobot), 0));
const nilaiCpmkMetode = (i: Baris) => (subOf(i.key).length ? bulat(subOf(i.key).reduce((s, x) => s + sumObj(x.cpmk), 0)) : sumObj(i.cpmk));

const metodeOptions = computed<SelectOption[]>(() => {
  const list = METODE_EVALUASI.map((m) => m.value);
  baris.value.forEach((b) => b.metode && !b.parentKey && !list.includes(String(b.metode)) && list.push(String(b.metode)));
  return list.map((m) => ({ value: m, label: m.toUpperCase() }));
});
const pilihMetode = (b: Baris, v: string | number | null) => {
  b.metode = v;
  const m = METODE_EVALUASI.find((x) => x.value === v);
  if (m) {
    b.jenis = m.jenis;
    if (m.jenis === 'uts' || m.jenis === 'uas') b.syaratLulus = true;
  }
};

const mulai = (list: KomponenEvaluasi[]) => {
  baris.value = keBaris(list);
  if (!baris.value.length) tambahMetode();
  editing.value = true;
};
const batal = () => {
  editing.value = false;
  baris.value = [];
};
watch(() => props.detail, batal);

const batasi = (el: HTMLInputElement, maks: number, pesan: string) => {
  if (el.value === '') return '';
  const batas = Math.max(bulat(maks), 0);
  const ketik = Number(el.value) || 0;
  const n = Math.min(Math.max(ketik, 0), batas);
  if (n !== Number(el.value)) el.value = String(n);
  if (ketik > batas) toastWarning(pesan.replace('{sisa}', persen(batas)));
  return el.value;
};
const isiBobot = (b: Baris, el: HTMLInputElement) => {
  if (b.parentKey) b.bobot = batasi(el, 100 - totalSub(b.parentKey) + angka(b.bobot), 'Total sub metode maksimal 100%. Sisa: {sisa}');
  else b.bobot = batasi(el, 100 - totalBobot.value + angka(b.bobot), 'Total bobot evaluasi maksimal 100%. Sisa: {sisa}');
};
const isiCpmk = (b: Baris, cpmkId: number, el: HTMLInputElement) => {
  const metode = baris.value.find((x) => x.key === (b.parentKey ?? b.key))!;
  const maks = angka(metode.bobot) - nilaiCpmkMetode(metode) + angka(b.cpmk[cpmkId]);
  b.cpmk = { ...b.cpmk, [cpmkId]: batasi(el, maks, `Σ nilai CPMK tidak boleh melebihi bobot evaluasi metode (${persen(angka(metode.bobot))}). Sisa: {sisa}`) };
};

const tambahMetode = () => {
  baris.value = [...baris.value, { key: kunci(), parentKey: null, metode: '', jenis: '', nama: '', bobot: '', syaratLulus: false, cpmk: {} }];
};
const tambahSub = (i: Baris) => {
  const sub: Baris = { key: kunci(), parentKey: i.key, metode: '', jenis: '', nama: `${String(i.metode || 'Sub').toUpperCase()} ${subOf(i.key).length + 1}`, bobot: '', syaratLulus: false, cpmk: {} };
  // Sub pertama mewarisi nilai CPMK metodenya & bobot 100%.
  if (!subOf(i.key).length) {
    sub.cpmk = { ...i.cpmk };
    sub.bobot = '100';
    i.cpmk = {};
  }
  baris.value = [...baris.value, sub];
};
const hapus = (b: Baris) => {
  const keys = [b.key, ...subOf(b.key).map((s) => s.key)];
  baris.value = baris.value.filter((x) => !keys.includes(x.key));
};

const saving = ref(false);
const simpan = async () => {
  for (const b of tampil.value) {
    if (!b.parentKey && (!b.metode || !b.jenis)) return toastError(`Metode & jenis evaluasi baris ${nomor(b)} wajib dipilih`);
    if (!b.parentKey && !(angka(b.bobot) > 0)) return toastError(`Bobot evaluasi baris ${nomor(b)} wajib diisi`);
    if (b.parentKey && !b.nama.trim()) return toastError(`Nama sub metode ${nomor(b)} wajib diisi`);
  }
  if (Math.abs(totalBobot.value - 100) > 0.01) return toastError(`Total bobot evaluasi harus 100% (sekarang ${persen(totalBobot.value)})`);
  for (const i of induk.value) {
    if (subOf(i.key).length && Math.abs(totalSub(i.key) - 100) > 0.01) return toastError(`Total sub metode baris ${nomor(i)} harus 100% (sekarang ${persen(totalSub(i.key))})`);
    const n = nilaiCpmkMetode(i);
    if (n > 0 && Math.abs(n - angka(i.bobot)) > 0.01) return toastError(`Nilai CPMK baris ${nomor(i)} (${persen(n)}) harus sama dengan bobot evaluasinya (${persen(angka(i.bobot))})`);
  }
  const numCpmk = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).filter(([, v]) => angka(v) > 0).map(([k, v]) => [k, angka(v)]));
  const payload: KomponenEvaluasi[] = induk.value.map((i) => {
    const subs = subOf(i.key);
    return {
      metode: String(i.metode),
      jenis: i.jenis as KomponenObe,
      bobot: angka(i.bobot),
      syaratLulus: i.syaratLulus,
      sub: subs.map((s) => ({ nama: s.nama.trim(), bobot: angka(s.bobot), cpmk: numCpmk(s.cpmk) })),
      cpmk: subs.length ? null : numCpmk(i.cpmk),
    };
  });
  saving.value = true;
  try {
    toastSuccess(await kelasKuliahApi.simpanKomposisi(props.detail.kelas.id, payload));
    editing.value = false;
    emit('reload');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan komposisi nilai kelas'));
  } finally {
    saving.value = false;
  }
};

// ---- Aksi ----
const aksiOpen = ref(false);
const ambilRps = () => {
  aksiOpen.value = false;
  if (!props.detail.rps.komponenEvaluasi.length) return toastError('Rencana Evaluasi RPS mata kuliah ini belum diisi');
  mulai(props.detail.rps.komponenEvaluasi);
  toastSuccess(`Komposisi diisi dari RPS periode ${props.detail.rps.periode?.nama ?? ''}. Periksa lalu klik Simpan.`);
};
const hapusKomposisi = async () => {
  aksiOpen.value = false;
  const ok = await confirmAction({ title: 'Hapus komposisi nilai kelas?', text: 'Dosen wajib mengisi ulang sebelum menyimpan nilai.', confirmLabel: 'Ya, hapus' });
  if (!ok) return;
  try {
    await kelasKuliahApi.hapusKomposisi(props.detail.kelas.id);
    toastSuccess('Komposisi nilai kelas dihapus');
    emit('reload');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus'));
  }
};

const inputAngka = 'w-full min-w-[4.5rem] px-2 py-1 border border-outline-variant rounded text-right bg-surface-container-lowest';
const inputTeks = 'w-full px-2 py-1.5 border border-outline-variant rounded text-body-sm bg-surface-container-lowest';
const th = 'p-2.5 border-l border-on-primary/30';
const td = 'p-2.5 border-l border-outline-variant';
</script>

<template>
  <Teleport v-if="bisaAtur && (canUpdate || canDelete)" defer to="#kelas-aksi">
    <template v-if="!editing">
      <AppButton v-if="canUpdate" icon="edit" @click="mulai(sumber)">Ubah Data</AppButton>
      <div class="relative">
        <AppButton variant="secondary" icon="settings" @click="aksiOpen = !aksiOpen">Aksi ▾</AppButton>
        <div v-if="aksiOpen" class="absolute right-0 mt-1 w-56 z-30 bg-surface-container-lowest border border-outline-variant rounded-md shadow-lg py-1 text-body-sm">
          <button v-if="canUpdate" type="button" class="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-container text-left" @click="ambilRps">
            <span class="material-symbols-outlined" style="font-size: 18px">download</span>
            Ambil dari RPS
          </button>
          <button
            v-if="canDelete && detail.komposisi"
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 hover:bg-error-container text-error text-left"
            @click="hapusKomposisi"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
            Hapus Komposisi
          </button>
        </div>
      </div>
    </template>
    <template v-else>
      <AppButton variant="secondary" icon="close" :disabled="saving" @click="batal">Batal</AppButton>
      <AppButton icon="save" :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
    </template>
  </Teleport>

  <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
    <h2 class="mx-4 pt-4 pb-2 border-b-2 border-primary font-semibold text-headline-sm text-primary">Komponen Evaluasi</h2>
    <div class="m-4 px-4 py-3 rounded-md border border-outline-variant bg-primary-container/30 text-body-sm">
      <p class="font-semibold mb-1">Keterangan:</p>
      <ul class="list-disc pl-5 space-y-0.5">
        <li>Syarat Lulus Mata Kuliah adalah komponen nilai wajib. Mahasiswa yang tidak memiliki komponen ini akan dinyatakan tidak lulus Mata Kuliah.</li>
        <li>Setiap pengubahan komposisi nilai kelas akan menghitung ulang nilai perkuliahan.</li>
        <li v-if="kolom.length">Kolom CPMK diisi persentase nilai akhir; jumlah nilai CPMK satu metode sama dengan bobot evaluasinya.</li>
      </ul>
    </div>
    <div v-if="!bisaAtur" class="mx-4 mb-4 flex items-center gap-2 px-3 py-2.5 rounded-md border border-outline-variant bg-surface-container text-body-sm">
      <span class="material-symbols-outlined text-on-surface-variant" style="font-size: 20px">lock</span>
      Mata kuliah kelas ini <strong>Non OBE</strong> — pengaturan bobot komposisi nilai hanya tersedia untuk kelas OBE.
    </div>
    <div v-if="!editing && rpsLebihBaru" class="mx-4 mb-4 flex items-center gap-2 px-3 py-2.5 rounded-md border border-[#2563eb]/40 bg-[#2563eb]/10 text-body-sm">
      <span class="material-symbols-outlined text-[#1e40af]" style="font-size: 20px">sync</span>
      <span>
        Rencana Evaluasi RPS periode {{ detail.rps.periode?.nama }} diubah setelah komposisi ini disimpan. Input nilai dosen mengikuti RPS terbaru (komposisi
        diselaraskan saat dosen menyimpan nilai)<template v-if="bisaAtur"> — gunakan <strong>Aksi → Ambil dari RPS</strong> untuk menyelaraskan sekarang</template>.
      </span>
    </div>
    <div v-if="bisaAtur && !editing && dariRps" class="mx-4 mb-4 flex items-center gap-2 px-3 py-2.5 rounded-md border border-[#eda100]/50 bg-[#eda100]/10 text-body-sm">
      <span class="material-symbols-outlined text-[#eda100]" style="font-size: 20px">lightbulb</span>
      Komposisi kelas belum diisi. Ditampilkan usulan dari RPS periode {{ detail.rps.periode?.nama }} — klik <strong>Ubah Data</strong> lalu Simpan untuk memakainya.
    </div>

    <!-- Portal Dosen: pintasan ke Input Nilai kelas ini -->
    <div v-if="inputNilaiTo && !editing" class="mx-4 mb-2 flex justify-end">
      <HoverTip
        text="Input Nilai"
        :sub="detail.kelas.isObe ? 'Komposisi Nilai Kelas (OBE): nilai diinput per CPMK tiap metode evaluasi.' : 'Komposisi nilai: Bobot OBE kelas (Partisipasi, Tugas, Quiz, Proyek, UTS, UAS).'"
      >
        <RouterLink
          :to="inputNilaiTo"
          class="inline-flex items-center gap-1.5 h-8 px-3 rounded bg-[#2e7d5b] text-white text-label-md font-medium hover:opacity-90"
          :aria-label="`Komposisi nilai — input nilai kelas ${detail.kelas.kelas}`"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">edit_note</span>
          Komposisi Nilai
        </RouterLink>
      </HoverTip>
    </div>

    <!-- Tampilan -->
    <div v-if="!editing" class="overflow-x-auto border-t border-outline-variant">
      <table class="w-full text-body-sm border-collapse">
        <thead class="bg-primary text-on-primary">
          <tr>
            <th class="p-2.5 text-left w-16">No.</th>
            <th :class="th" class="text-left w-48">Metode Evaluasi</th>
            <th :class="th" class="text-left">Jenis Evaluasi</th>
            <th v-for="c in kolom" :key="c.id" :class="th" class="text-center w-24" :title="c.deskripsi">{{ c.kode }}</th>
            <th :class="th" class="text-center w-28">Bobot Evaluasi</th>
            <th :class="th" class="text-center w-28">Syarat Lulus</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          <tr v-if="!sumber.length">
            <td :colspan="kolom.length + 5" class="p-6 text-center text-on-surface-variant">
              Komposisi nilai kelas belum diisi dan RPS mata kuliah ini belum memiliki Rencana Evaluasi.
            </td>
          </tr>
          <template v-for="(k, i) in sumber" :key="i">
            <tr :class="k.sub?.length ? 'bg-surface-container-low/60' : ''">
              <td class="p-2.5">{{ i + 1 }}</td>
              <td :class="td" class="uppercase">{{ k.metode }}</td>
              <td :class="td">{{ k.sub?.length ? '' : JENIS_LABEL[k.jenis] }}</td>
              <td v-for="c in kolom" :key="c.id" :class="td" class="text-center">
                <template v-if="!k.sub?.length">{{ k.cpmk?.[c.id] ? persen(k.cpmk[c.id]) : '-' }}</template>
              </td>
              <td :class="td" class="text-right">{{ persen(k.bobot) }}</td>
              <td :class="td" class="text-center">{{ k.syaratLulus ? 'Ya' : '-' }}</td>
            </tr>
            <template v-if="k.sub?.length">
              <tr v-for="(s, j) in k.sub" :key="`${i}-${j}`">
                <td class="p-2.5 whitespace-nowrap text-on-surface-variant">↳ {{ i + 1 }}.{{ j + 1 }}</td>
                <td :class="td" class="uppercase">{{ s.nama }}</td>
                <td :class="td">{{ JENIS_LABEL[k.jenis] }}</td>
                <td v-for="c in kolom" :key="c.id" :class="td" class="text-center">{{ s.cpmk?.[c.id] ? persen(s.cpmk[c.id]) : '-' }}</td>
                <td :class="td" class="text-right">{{ persen(s.bobot) }}</td>
                <td :class="td" class="text-center">-</td>
              </tr>
              <tr class="bg-surface-container-low">
                <td class="p-2.5" />
                <td :class="td" :colspan="kolom.length + 2" class="font-medium">Total Sub Metode Evaluasi</td>
                <td :class="td" class="text-right font-medium">{{ persen(sumObj(Object.fromEntries(k.sub.map((s, x) => [x, s.bobot])))) }}</td>
                <td :class="td" />
              </tr>
            </template>
          </template>
        </tbody>
        <tfoot v-if="sumber.length" class="border-t-2 border-outline-variant bg-surface-container-low font-medium">
          <tr>
            <td colspan="3" class="p-2.5 text-right">Total</td>
            <td v-for="c in kolom" :key="c.id" :class="td" class="text-center">
              {{ persen(sumber.reduce((s, k) => s + (k.sub?.length ? k.sub.reduce((x, y) => x + angka(y.cpmk?.[c.id]), 0) : angka(k.cpmk?.[c.id])), 0)) }}
            </td>
            <td :class="td" class="text-right">{{ persen(sumber.reduce((s, k) => s + k.bobot, 0)) }}</td>
            <td :class="td" />
          </tr>
        </tfoot>
      </table>
      <p v-if="detail.komposisi?.diubahOleh" class="px-4 py-2 text-label-sm text-on-surface-variant">Terakhir diubah oleh {{ detail.komposisi.diubahOleh }}</p>
    </div>

    <!-- Form ubah -->
    <div v-else class="overflow-x-auto border-t border-outline-variant">
      <table class="w-full text-body-sm border-collapse">
        <thead class="bg-primary text-on-primary">
          <tr>
            <th class="p-2.5 text-left w-14">No.</th>
            <th :class="th" class="text-left w-56">Metode Evaluasi</th>
            <th :class="th" class="text-left min-w-56">Jenis Evaluasi</th>
            <th v-for="c in kolom" :key="c.id" :class="th" class="text-center w-24" :title="c.deskripsi">{{ c.kode }}</th>
            <th :class="th" class="text-center w-28">Bobot Evaluasi</th>
            <th :class="th" class="text-center w-24">Syarat Lulus</th>
            <th :class="th" class="text-center w-16">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant align-top">
          <template v-for="b in tampil" :key="b.key">
            <tr :class="b.parentKey ? '' : 'bg-surface-container-low/40'">
              <td class="p-2.5" :class="b.parentKey ? 'pl-4 text-on-surface-variant' : 'font-medium'">{{ b.parentKey ? '↳ ' : '' }}{{ nomor(b) }}</td>
              <td :class="td">
                <SelectInput v-if="!b.parentKey" :model-value="b.metode" :options="metodeOptions" placeholder="-- Metode --" @update:model-value="(v) => pilihMetode(b, v)" />
                <input v-else v-model="b.nama" :class="inputTeks" maxlength="150" placeholder="mis. TUGAS 1" />
              </td>
              <td :class="td">
                <SelectInput v-if="!b.parentKey" v-model="b.jenis" :options="JENIS_OPTIONS" placeholder="-- Jenis Evaluasi --" />
                <span v-else class="inline-block pt-1.5 text-on-surface-variant">
                  {{ JENIS_LABEL[(baris.find((x) => x.key === b.parentKey)?.jenis as KomponenObe) ?? 'tugas'] ?? '' }}
                </span>
              </td>
              <td v-for="c in kolom" :key="c.id" :class="td" class="text-center">
                <input
                  v-if="daun(b)"
                  type="number"
                  min="0"
                  step="0.01"
                  :class="inputAngka"
                  :value="b.cpmk[c.id] ?? ''"
                  @input="isiCpmk(b, c.id, $event.target as HTMLInputElement)"
                />
              </td>
              <td :class="td">
                <div class="flex items-center gap-1">
                  <input type="number" min="0" max="100" step="0.01" :class="inputAngka" :value="b.bobot" @input="isiBobot(b, $event.target as HTMLInputElement)" />
                  <span class="text-on-surface-variant">%</span>
                </div>
              </td>
              <td :class="td" class="text-center">
                <input v-if="!b.parentKey" v-model="b.syaratLulus" type="checkbox" class="h-4 w-4 mt-2 accent-primary" />
              </td>
              <td :class="td">
                <div class="flex flex-col items-center gap-1">
                  <button
                    v-if="!b.parentKey"
                    type="button"
                    class="inline-flex items-center justify-center w-7 h-7 rounded text-white bg-[#2e7d5b] hover:opacity-90"
                    title="Tambah sub metode evaluasi"
                    @click="tambahSub(b)"
                  >
                    <span class="material-symbols-outlined" style="font-size: 16px">add</span>
                  </button>
                  <button type="button" class="inline-flex items-center justify-center w-7 h-7 rounded text-white bg-[#d83b3b] hover:opacity-90" title="Hapus" @click="hapus(b)">
                    <span class="material-symbols-outlined" style="font-size: 16px">delete</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="b.parentKey && subOf(b.parentKey).at(-1)?.key === b.key" class="bg-surface-container-low">
              <td class="p-2.5" />
              <td :class="td" :colspan="kolom.length + 2" class="font-medium">Total Sub Metode Evaluasi</td>
              <td class="text-right font-medium" :class="[td, Math.abs(totalSub(b.parentKey) - 100) <= 0.01 ? 'text-[#2e7d5b]' : 'text-error']">
                {{ persen(totalSub(b.parentKey)) }}
              </td>
              <td :class="td" colspan="2" />
            </tr>
          </template>
        </tbody>
        <tfoot class="border-t-2 border-outline-variant bg-surface-container-low font-medium">
          <tr>
            <td colspan="3" class="p-2.5 text-right">Total</td>
            <td v-for="c in kolom" :key="c.id" :class="td" class="text-center">
              {{ persen(baris.reduce((s, b) => s + (daun(b) ? angka(b.cpmk[c.id]) : 0), 0)) }}
            </td>
            <td class="text-right" :class="[td, totalBobot === 100 ? 'text-[#2e7d5b]' : 'text-error']">{{ persen(totalBobot) }}</td>
            <td :class="td" colspan="2" />
          </tr>
        </tfoot>
      </table>
      <div class="px-4 py-3 border-t border-outline-variant">
        <AppButton icon="add" @click="tambahMetode">Tambah Metode Evaluasi</AppButton>
      </div>
    </div>
  </section>
</template>

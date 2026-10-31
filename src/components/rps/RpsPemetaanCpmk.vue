<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import { useRpsApi, type LevelPemetaanCpmk, type RpsDetail } from '@/api/rps';
import type { MetodeBobot } from '@/api/capaian';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError, toastSuccess, toastWarning } from '@/utils/swal';
import { btnAksi, inputCls } from './shared';

// Klien RPS sesuai portal (Prodi / Dosen) dari halaman RPS.
const rpsApi = useRpsApi();

/**
 * Menu "Pemetaan CPMK": pilih Level Pemetaan (CPMK / Sub-CPMK) & Metode Pembobotan (Manual / Otomatis),
 * lalu tabel CPMK yang bisa diedit langsung — kode, deskripsi (IND/ENG), bobot tiap sel CPMK → CPL
 * (kolom = CPL/IK yang dipetakan ke MK ini) dan Bobot CPMK (jumlah baris). Total bobot satu MK = 100%.
 * Semua perubahan disimpan sekaligus lewat "Simpan Data" di bar atas.
 */
const props = defineProps<{
  mkId: number;
  detail: RpsDetail;
  mkOptions: SelectOption[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}>();
const emit = defineEmits<{ reload: [] }>();

const LEVEL_OPTIONS: SelectOption[] = [
  { value: 'CPMK', label: 'CPMK' },
  { value: 'SUB_CPMK', label: 'Sub-CPMK' },
];
const METODE_OPTIONS: SelectOption[] = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'OTOMATIS', label: 'Otomatis' },
];

interface Baris {
  key: string;
  id: number | null;
  parentKey: string | null;
  kode: string;
  deskripsi: string;
  deskripsiEn: string;
}
const level = ref<LevelPemetaanCpmk>('CPMK');
const metode = ref<MetodeBobot>('OTOMATIS');
const baris = ref<Baris[]>([]);
/** "key|cplId" → bobot (teks isian). Otomatis: ada = dicentang. */
const bobot = ref<Record<string, string>>({});
const dirty = ref(false);
let urutBaru = 0;

/**
 * Kolom = CPL kurikulum sesuai level pemetaan CPL → MK (CPL: CPL induk; IK: IK, atau CPL tanpa IK).
 * CPL yang diberi bobot otomatis ikut dibebankan ke MK ini saat disimpan.
 */
const cplKolom = computed(() => {
  const semua = props.detail.cpl;
  if (props.detail.mataKuliah.levelPemetaanCplMk !== 'IK') return semua.filter((c) => !c.parentId);
  return semua.filter((c) => !c.parentId).flatMap((c) => {
    const ik = semua.filter((x) => x.parentId === c.id);
    return ik.length ? ik : [c];
  });
});
const induk = computed(() => baris.value.filter((b) => !b.parentKey));
const subOf = (key: string) => baris.value.filter((b) => b.parentKey === key);
/** Urutan tampil: CPMK induk diikuti Sub-CPMK-nya. */
const tampil = computed(() => induk.value.flatMap((i) => [i, ...subOf(i.key)]));
/** Baris yang selnya bisa diisi sesuai level. */
const barisPeta = (b: Baris) => (level.value === 'SUB_CPMK' ? !!b.parentKey || !subOf(b.key).length : !b.parentKey);

const reset = () => {
  const m = props.detail.mataKuliah;
  level.value = m.levelPemetaanCpmk ?? 'CPMK';
  metode.value = m.metodeBobotCpmk ?? 'OTOMATIS';
  baris.value = props.detail.cpmk.map((c) => ({
    key: String(c.id),
    id: c.id,
    parentKey: c.parentId ? String(c.parentId) : null,
    kode: c.kode,
    deskripsi: c.deskripsi,
    deskripsiEn: c.deskripsiEn ?? '',
  }));
  bobot.value = Object.fromEntries(props.detail.cpmkCpl.map((p) => [`${p.cpmkId}|${p.cplId}`, p.bobot.toFixed(2)]));
  dirty.value = false;
};
watch(() => props.detail, reset, { immediate: true });
const ubah = () => (dirty.value = true);

// ---- Bobot ----
const bulat = (n: number) => Math.round(n * 100) / 100;
const nilai = (key: string) => Number(bobot.value[key]) || 0;
const bobotBaris = (b: Baris): number =>
  barisPeta(b) ? bulat(cplKolom.value.reduce((s, c) => s + nilai(`${b.key}|${c.id}`), 0)) : bulat(subOf(b.key).reduce((s, x) => s + bobotBaris(x), 0));
const total = computed(() => bulat(induk.value.reduce((s, b) => s + bobotBaris(b), 0)));
const labelPersen = (n: number) => `${n.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;

/** Bagi rata 100% ke semua sel tercentang (urut baris lalu kolom); sisa pembulatan ke sel terakhir. */
const rataUlang = (keys: string[]) => {
  const urut = new Map<string, number>(tampil.value.flatMap((b, i) => cplKolom.value.map((c, j) => [`${b.key}|${c.id}`, i * 1000 + j] as [string, number])));
  const sorted = keys.filter((k) => urut.has(k)).sort((a, b) => urut.get(a)! - urut.get(b)!);
  if (!sorted.length) return {};
  const rata = Math.floor(10000 / sorted.length) / 100;
  const sisa = bulat(100 - rata * (sorted.length - 1));
  return Object.fromEntries(sorted.map((k, i) => [k, (i === sorted.length - 1 ? sisa : rata).toFixed(2)]));
};
const toggleSel = (key: string) => {
  const keys = Object.keys(bobot.value);
  bobot.value = rataUlang(keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]);
  ubah();
};
/** Isi manual: dibatasi 0 s.d. sisa kuota agar total tidak lebih dari 100%. */
const isiSel = (key: string, el: HTMLInputElement) => {
  let v = el.value;
  if (v !== '') {
    const maks = Math.max(bulat(100 - total.value + nilai(key)), 0);
    const angka = Math.min(Math.max(Number(v) || 0, 0), maks);
    if ((Number(v) || 0) > maks) toastWarning(`Total bobot CPMK maksimal 100%. Sisa bobot yang bisa diisi: ${labelPersen(maks)}`);
    if (angka !== Number(v)) {
      v = String(angka);
      el.value = v;
    }
  }
  bobot.value = { ...bobot.value, [key]: v };
  ubah();
};

/** Pindahkan sel antar level: ke Sub-CPMK = bobot CPMK induk dibagi rata ke Sub-nya; ke CPMK = bobot Sub dijumlah ke induk. */
const pindahSel = (ke: LevelPemetaanCpmk) => {
  const next: Record<string, number> = {};
  const tambah = (k: string, n: number) => (next[k] = bulat((next[k] ?? 0) + n));
  for (const [k, v] of Object.entries(bobot.value)) {
    const [key, cplId] = k.split('|');
    const b = baris.value.find((x) => x.key === key);
    if (!b) continue;
    const n = metode.value === 'OTOMATIS' ? 1 : Number(v) || 0;
    if (ke === 'CPMK' && b.parentKey) tambah(`${b.parentKey}|${cplId}`, n);
    else if (ke === 'SUB_CPMK' && !b.parentKey && subOf(key).length) {
      const subs = subOf(key);
      subs.forEach((s, i) => tambah(`${s.key}|${cplId}`, metode.value === 'OTOMATIS' ? 1 : i === subs.length - 1 ? bulat(n - bulat(n / subs.length) * (subs.length - 1)) : bulat(n / subs.length)));
    } else tambah(k, n);
  }
  bobot.value = metode.value === 'OTOMATIS' ? rataUlang(Object.keys(next)) : Object.fromEntries(Object.entries(next).map(([k, n]) => [k, n.toFixed(2)]));
};
const gantiLevel = (v: string | number | null) => {
  const ke = (v || 'CPMK') as LevelPemetaanCpmk;
  if (ke === level.value) return;
  pindahSel(ke);
  level.value = ke;
  ubah();
};
/** Ganti metode: ke Manual → sel tercentang diisi rata; ke Otomatis → sel berbobot > 0 dicentang & dirata. */
const gantiMetode = (v: string | number | null) => {
  const ke = (v || 'OTOMATIS') as MetodeBobot;
  if (ke === metode.value) return;
  bobot.value = rataUlang(Object.keys(bobot.value).filter((k) => ke === 'MANUAL' || nilai(k) > 0));
  metode.value = ke;
  ubah();
};

// ---- Tambah / hapus baris ----
const tambahCpmk = () => {
  baris.value = [...baris.value, { key: `baru-${++urutBaru}`, id: null, parentKey: null, kode: '', deskripsi: '', deskripsiEn: '' }];
  ubah();
};
const tambahSub = (i: Baris) => {
  const sub: Baris = { key: `baru-${++urutBaru}`, id: null, parentKey: i.key, kode: '', deskripsi: '', deskripsiEn: '' };
  // Level Sub-CPMK: Sub pertama mewarisi sel CPMK induknya.
  if (level.value === 'SUB_CPMK' && !subOf(i.key).length) {
    bobot.value = Object.fromEntries(Object.entries(bobot.value).map(([k, v]) => [k.startsWith(`${i.key}|`) ? `${sub.key}|${k.split('|')[1]}` : k, v]));
  }
  baris.value = [...baris.value, sub];
  ubah();
};
const hapusBaris = async (b: Baris) => {
  const keys = [b.key, ...subOf(b.key).map((s) => s.key)];
  if (b.id) {
    const ok = await confirmAction({
      title: `Hapus ${b.kode || 'CPMK'}?`,
      text: `${b.parentKey ? '' : 'Sub-CPMK & '}pemetaannya ikut terhapus setelah Simpan Data.`,
      confirmLabel: 'Ya, hapus',
    });
    if (!ok) return;
  }
  baris.value = baris.value.filter((x) => !keys.includes(x.key));
  const sisa = Object.keys(bobot.value).filter((k) => !keys.includes(k.split('|')[0]));
  bobot.value = metode.value === 'OTOMATIS' ? rataUlang(sisa) : Object.fromEntries(sisa.map((k) => [k, bobot.value[k]]));
  ubah();
};

// ---- Simpan ----
const saving = ref(false);
const simpan = async () => {
  const kode = new Set<string>();
  for (const b of tampil.value) {
    if (!b.kode.trim()) return toastError('Kode CPMK wajib diisi di semua baris');
    if (!b.deskripsi.trim()) return toastError(`Deskripsi ${b.kode} wajib diisi`);
    if (kode.has(b.kode.trim().toLowerCase())) return toastError(`Kode ${b.kode} dipakai lebih dari sekali`);
    kode.add(b.kode.trim().toLowerCase());
  }
  const pairs = Object.entries(bobot.value)
    .map(([k, v]) => ({ cpmkKey: k.split('|')[0], cplId: Number(k.split('|')[1]), bobot: v === '' ? null : Number(v) }))
    .filter((p) => baris.value.some((b) => b.key === p.cpmkKey && barisPeta(b)) && cplKolom.value.some((c) => c.id === p.cplId));
  if (metode.value === 'MANUAL' && pairs.some((p) => (p.bobot ?? 0) > 0) && Math.abs(total.value - 100) > 0.01) {
    return toastError(`Total bobot CPMK harus 100% (sekarang ${labelPersen(total.value)})`);
  }
  saving.value = true;
  try {
    await rpsApi.savePemetaanCpmk(props.mkId, {
      level: level.value,
      metode: metode.value,
      cpmk: tampil.value.map((b) => ({
        key: b.key,
        id: b.id,
        parentKey: b.parentKey,
        kode: b.kode.trim(),
        deskripsi: b.deskripsi.trim(),
        deskripsiEn: b.deskripsiEn.trim() || null,
      })),
      pairs,
    });
    toastSuccess('Pemetaan CPMK disimpan');
    emit('reload');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan pemetaan CPMK'));
  } finally {
    saving.value = false;
  }
};

// ---- Salin dari mata kuliah lain (langsung tersimpan) ----
const salinOpen = ref(false);
const salinDari = ref<string | number | null>('');
const menyalin = ref(false);
const salinOptions = computed(() => props.mkOptions.filter((o) => o.value !== props.mkId));
const salin = async () => {
  if (!salinDari.value) return toastError('Pilih mata kuliah sumber');
  menyalin.value = true;
  try {
    toastSuccess(await rpsApi.salinCpmk(props.mkId, Number(salinDari.value)));
    salinOpen.value = false;
    emit('reload');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyalin CPMK'));
  } finally {
    menyalin.value = false;
  }
};
</script>

<template>
  <Teleport v-if="canUpdate" defer to="#rps-aksi">
    <AppButton icon="save" :disabled="saving || !dirty" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan Data' }}</AppButton>
    <AppButton variant="secondary" icon="refresh" :disabled="saving || !dirty" @click="reset">Batalkan</AppButton>
  </Teleport>

  <div class="space-y-4">
    <!-- Level & metode -->
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-body-sm">
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 pb-4 border-b border-dashed border-outline-variant">
        <div class="flex-1">
          <p class="font-medium">Pilih Level Pemetaan</p>
          <p class="text-on-surface-variant">Tentukan level pemetaan capaian pembelajaran yang digunakan.</p>
        </div>
        <div class="w-full sm:w-52">
          <SelectInput :model-value="level" :options="LEVEL_OPTIONS" :clearable="false" :disabled="!canUpdate" @update:model-value="gantiLevel" />
        </div>
      </div>
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 pt-4">
        <div class="flex-1">
          <p class="font-medium">Pilih Metode Pembobotan</p>
          <p class="text-on-surface-variant">Pada mode Manual bobot diatur dosen sedangkan Otomatis dibagi rata otomatis.</p>
        </div>
        <div class="w-full sm:w-52">
          <SelectInput :model-value="metode" :options="METODE_OPTIONS" :clearable="false" :disabled="!canUpdate" @update:model-value="gantiMetode" />
        </div>
      </div>
    </section>

    <!-- Tabel CPMK + pemetaan ke CPL -->
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div v-if="!cplKolom.length" class="px-4 py-3 border-b border-outline-variant text-body-sm text-on-surface-variant">
        Kurikulum mata kuliah ini belum memiliki CPL, jadi kolom pemetaan masih kosong. Isi dulu lewat menu Manajemen Capaian → Manajemen CPL.
      </div>
      <div class="overflow-auto max-h-[70vh]">
        <table class="w-full text-body-sm border-collapse">
          <thead class="bg-primary text-on-primary sticky top-0 z-10">
            <tr>
              <th rowspan="2" class="p-3 text-left w-40">Kode CPMK</th>
              <th rowspan="2" class="p-3 text-left min-w-72">Deskripsi CPMK</th>
              <th :colspan="Math.max(cplKolom.length, 1)" class="p-2 text-center border-l border-on-primary/30">Pemetaan CPMK ke CPL</th>
              <th rowspan="2" class="p-3 text-center w-20 border-l border-on-primary/30">Bobot CPMK</th>
              <th rowspan="2" class="p-3 text-center w-20 border-l border-on-primary/30">Aksi</th>
            </tr>
            <tr>
              <th v-for="c in cplKolom" :key="c.id" class="p-2 text-center min-w-20 border-l border-t border-on-primary/30" :title="c.deskripsi">
                {{ c.kode }}
              </th>
              <th v-if="!cplKolom.length" class="p-2 text-center min-w-20 border-l border-t border-on-primary/30">-</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant align-top">
            <tr v-if="!tampil.length">
              <td :colspan="Math.max(cplKolom.length, 1) + 4" class="p-6 text-center text-on-surface-variant">
                Anda belum menambahkan CPMK. Silahkan klik tombol <strong>Tambah CPMK</strong> di bawah untuk menambahkan.
              </td>
            </tr>
            <tr v-for="b in tampil" :key="b.key" :class="!b.parentKey && subOf(b.key).length ? 'bg-surface-container-low/60' : ''">
              <td class="p-2">
                <div class="flex items-start gap-1" :class="b.parentKey ? 'pl-3' : ''">
                  <span v-if="b.parentKey" class="material-symbols-outlined text-on-surface-variant mt-1.5" style="font-size: 16px">subdirectory_arrow_right</span>
                  <input
                    v-model="b.kode"
                    :class="inputCls"
                    maxlength="20"
                    :placeholder="b.parentKey ? 'Kode Sub-CPMK' : 'Kode CPMK'"
                    :disabled="!canUpdate"
                    @input="ubah"
                  />
                </div>
              </td>
              <td class="p-2 space-y-2">
                <textarea v-model="b.deskripsi" :class="inputCls" rows="3" placeholder="Bahasa Indonesia (Wajib)" :disabled="!canUpdate" @input="ubah" />
                <textarea v-model="b.deskripsiEn" :class="inputCls" rows="2" placeholder="Bahasa Inggris (Optional)" :disabled="!canUpdate" @input="ubah" />
              </td>
              <td v-for="c in cplKolom" :key="c.id" class="p-2 text-center border-l border-outline-variant">
                <template v-if="barisPeta(b)">
                  <input
                    v-if="metode === 'MANUAL'"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    class="w-20 px-2 py-1 border border-outline-variant rounded text-right bg-surface-container-lowest"
                    :value="bobot[`${b.key}|${c.id}`] ?? ''"
                    :disabled="!canUpdate"
                    @input="isiSel(`${b.key}|${c.id}`, $event.target as HTMLInputElement)"
                  />
                  <label v-else class="inline-flex flex-col items-center gap-0.5 cursor-pointer">
                    <input
                      type="checkbox"
                      class="h-4 w-4"
                      :checked="`${b.key}|${c.id}` in bobot"
                      :disabled="!canUpdate"
                      @change="toggleSel(`${b.key}|${c.id}`)"
                    />
                    <span v-if="`${b.key}|${c.id}` in bobot" class="text-label-sm text-on-surface-variant">
                      {{ labelPersen(nilai(`${b.key}|${c.id}`)) }}
                    </span>
                  </label>
                </template>
              </td>
              <td v-if="!cplKolom.length" class="p-2 text-center text-label-sm text-on-surface-variant border-l border-outline-variant">Belum ada CPL</td>
              <td class="p-3 text-center font-medium border-l border-outline-variant">{{ labelPersen(bobotBaris(b)) }}</td>
              <td class="p-2 border-l border-outline-variant">
                <div class="flex flex-col items-center gap-1">
                  <button v-if="!b.parentKey && canCreate" type="button" :class="[btnAksi, 'bg-[#2e7d5b]']" title="Tambah Sub-CPMK" @click="tambahSub(b)">
                    <span class="material-symbols-outlined" style="font-size: 16px">add</span>
                  </button>
                  <button v-if="canDelete || !b.id" type="button" :class="[btnAksi, 'bg-[#d83b3b]']" title="Hapus" @click="hapusBaris(b)">
                    <span class="material-symbols-outlined" style="font-size: 16px">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="tampil.length" class="border-t border-outline-variant bg-surface-container-low">
            <tr>
              <td :colspan="Math.max(cplKolom.length, 1) + 2" class="p-3 text-right font-medium">Total Bobot</td>
              <td class="p-3 text-center font-semibold" :class="total === 100 ? 'text-[#2e7d5b]' : total > 0 ? 'text-error' : 'text-on-surface-variant'">
                {{ labelPersen(total) }}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div v-if="canCreate" class="px-4 py-3 border-t border-outline-variant flex flex-wrap gap-2">
        <AppButton icon="add" @click="tambahCpmk">Tambah CPMK</AppButton>
        <AppButton variant="secondary" icon="content_copy" :disabled="dirty" :title="dirty ? 'Simpan atau batalkan perubahan dulu' : ''" @click="salinOpen = true">
          Salin dari Mata Kuliah Lain
        </AppButton>
      </div>
    </section>
  </div>

  <!-- Salin dari MK lain -->
  <Modal v-model="salinOpen" title="Salin CPMK" size="md">
    <div class="space-y-3 text-body-sm">
      <p class="text-on-surface-variant">
        Salin CPMK &amp; Sub-CPMK dari mata kuliah lain ke <strong>{{ detail.mataKuliah.mataKuliah }}</strong>. Kode yang sudah ada dilewati; pemetaan CPL
        tidak ikut disalin.
      </p>
      <SearchableSelect v-model="salinDari" label="Mata Kuliah Sumber" placeholder="-- Pilih Mata Kuliah --" :options="salinOptions" />
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="salinOpen = false">Batal</AppButton>
      <AppButton icon="content_copy" :disabled="menyalin" @click="salin">{{ menyalin ? 'Menyalin...' : 'Salin' }}</AppButton>
    </template>
  </Modal>
</template>

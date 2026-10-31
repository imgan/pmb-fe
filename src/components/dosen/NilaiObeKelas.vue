<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import CpmkInfo from './CpmkInfo.vue';
import { dosenNilaiObeApi, type KolomNilaiObe, type NilaiObeKelas } from '@/api/dosenNilaiObe';
import { extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';

/**
 * Input nilai kelas OBE: satu kolom per komponen Komposisi Nilai Kelas (metode tanpa sub / tiap sub metode)
 * dengan bobot efektifnya. Nilai akhir = Σ nilai komponen × bobot efektif; huruf mengikuti skala sistem.
 * Nilai di tabel hanya pratinjau — nilai resmi dihitung ulang di server saat disimpan.
 */
const props = defineProps<{ data: NilaiObeKelas }>();
const emit = defineEmits<{ updated: [data: NilaiObeKelas]; isiBobot: [] }>();

const SKALA: [number, string][] = [
  [85, 'A'], [80, 'A-'], [75, 'B+'], [70, 'B'], [65, 'B-'], [60, 'C+'], [55, 'C'], [45, 'D'], [0, 'E'],
];
const hurufDari = (n: number) => SKALA.find(([min]) => n >= min)?.[1] ?? 'E';

type Baris = NilaiObeKelas['mahasiswa'][number] & { input: Record<string, string> };
const rows = ref<Baris[]>([]);
const snapshot = ref('[]');
const isi = (d: NilaiObeKelas) => {
  rows.value = d.mahasiswa.map((m) => ({
    ...m,
    input: Object.fromEntries(d.kolom.map((k) => [k.kunci, m.nilaiKomponen[k.kunci] === null ? '' : String(m.nilaiKomponen[k.kunci])])),
  }));
  snapshot.value = JSON.stringify(rows.value.map((r) => r.input));
};
watch(() => props.data, isi, { immediate: true });
const adaPerubahan = computed(() => JSON.stringify(rows.value.map((r) => r.input)) !== snapshot.value);

/**
 * Header tiga tingkat: metode → sub metode → CPMK. Tiap metode/sub dikelompokkan dari kolom berurutan
 * (kolom = sel komponen × CPMK). Metode tanpa sub memakai baris kedua+ketiga untuk CPMK-nya.
 */
const adaCpmk = computed(() => props.data.kolom.some((k) => k.cpmkId));
const grupMetode = computed(() => {
  const grup: { induk: string; metode: string; syaratLulus: boolean; kolom: KolomNilaiObe[]; sub: { komponen: string; nama: string; kolom: KolomNilaiObe[] }[] }[] = [];
  props.data.kolom.forEach((k) => {
    const induk = k.komponen.split('.')[0];
    let g = grup.find((x) => x.induk === induk);
    if (!g) grup.push((g = { induk, metode: k.metode, syaratLulus: k.syaratLulus, kolom: [], sub: [] }));
    g.kolom.push(k);
    if (k.nama) {
      const s = g.sub.find((x) => x.komponen === k.komponen);
      if (s) s.kolom.push(k);
      else g.sub.push({ komponen: k.komponen, nama: k.nama, kolom: [k] });
    }
  });
  return grup;
});
/** Bobot total satu kelompok kolom. */
const bobotGrup = (kolom: KolomNilaiObe[]) => Math.round(kolom.reduce((s, k) => s + k.bobot, 0) * 100) / 100;

/** Kolom Capaian CPMK: semua CPMK mata kuliah (yang tidak diukur metode evaluasi mana pun tetap tampil, bertanda). */
const cpmkDiukur = computed(() => (adaCpmk.value ? props.data.cpmk : []));
const diukur = (cpmkId: number) => props.data.kolom.some((k) => k.cpmkId === cpmkId);
const deskripsiCpmk = (id: number | null) => props.data.cpmk.find((c) => c.id === id)?.deskripsi ?? null;
const tidakDiukur = computed(() => cpmkDiukur.value.filter((c) => !diukur(c.id)));
/** Capaian satu CPMK = rata-rata berbobot nilai sel CPMK tsb (0–100); null bila belum ada yang diisi. */
const capaian = (r: Baris, cpmkId: number) => {
  const sel = props.data.kolom.filter((k) => k.cpmkId === cpmkId);
  if (sel.every((k) => r.input[k.kunci].trim() === '')) return null;
  const total = sel.reduce((s, k) => s + k.bobot, 0);
  return total ? Math.round((sel.reduce((s, k) => s + (angka(r.input[k.kunci]) ?? 0) * k.bobot, 0) / total) * 100) / 100 : null;
};

const angka = (v: string) => {
  const n = Number(String(v).replace(',', '.'));
  return v.trim() === '' || !Number.isFinite(n) ? null : n;
};
const tidakValid = (v: string) => {
  const n = angka(v);
  return v.trim() !== '' && (n === null || n < 0 || n > 100);
};
/** Huruf di bawah C (D, E) = tidak lulus (sama dengan skala nilai: wajib mengulang). */
const HURUF_TIDAK_LULUS = ['D', 'E'];
/**
 * Keterangan lulus (pratinjau): tidak lulus bila nilai akhir di bawah C, atau ada komponen syarat lulus (*)
 * yang seluruh selnya kosong; null bila belum ada nilai yang diisi.
 */
const keterangan = (r: Baris) => {
  const { huruf } = pratinjau(r);
  if (!huruf) return null;
  if (HURUF_TIDAK_LULUS.includes(huruf)) return { lulus: false, alasan: `Nilai akhir ${huruf} (di bawah C)` };
  const kosong = [...new Set(props.data.kolom.filter((k) => k.syaratLulus).map((k) => k.komponen))].filter((komp) =>
    props.data.kolom.filter((k) => k.komponen === komp).every((k) => r.input[k.kunci].trim() === ''),
  );
  if (kosong.length) {
    const nama = kosong.map((komp) => {
      const k = props.data.kolom.find((x) => x.komponen === komp)!;
      return (k.nama ?? k.metode).toUpperCase();
    });
    return { lulus: false, alasan: `Komponen syarat lulus belum dinilai: ${nama.join(', ')}` };
  }
  return { lulus: true, alasan: 'Nilai akhir minimal C & semua komponen syarat lulus terisi' };
};
const pratinjau = (r: Baris) => {
  if (props.data.kolom.every((k) => r.input[k.kunci].trim() === '')) return { nilai: null as number | null, huruf: null as string | null };
  const nilai = Math.round(props.data.kolom.reduce((s, k) => s + ((angka(r.input[k.kunci]) ?? 0) * k.bobot) / 100, 0) * 100) / 100;
  return { nilai, huruf: hurufDari(nilai) };
};

const search = ref('');
const tampil = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? rows.value.filter((r) => r.nim.toLowerCase().includes(q) || r.namaLengkap.toLowerCase().includes(q)) : rows.value;
});

const saving = ref(false);
const simpan = async () => {
  if (rows.value.some((r) => props.data.kolom.some((k) => tidakValid(r.input[k.kunci])))) {
    return toastError('Ada nilai yang tidak valid (harus angka 0–100). Periksa kolom yang ditandai merah.');
  }
  const items = rows.value
    .filter((r) => props.data.kolom.some((k) => r.input[k.kunci].trim() !== ''))
    .map((r) => ({ mahasiswaId: r.mahasiswaId, nilai: Object.fromEntries(props.data.kolom.map((k) => [k.kunci, angka(r.input[k.kunci])])) }));
  if (!items.length) return toastError('Belum ada nilai yang diisi');
  saving.value = true;
  try {
    const hasil = await dosenNilaiObeApi.simpan(props.data.kelas.id, items);
    toastSuccess(`Nilai ${items.length} mahasiswa disimpan`);
    emit('updated', hasil);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan nilai'));
  } finally {
    saving.value = false;
  }
};

const mengambil = ref(false);
const pakaiRps = async () => {
  mengambil.value = true;
  try {
    const hasil = await dosenNilaiObeApi.komposisiDariRps(props.data.kelas.id);
    toastSuccess('Komposisi nilai kelas diisi dari RPS');
    emit('updated', hasil);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengambil komposisi dari RPS'));
  } finally {
    mengambil.value = false;
  }
};
const persen = (n: number) => `${n.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;
defineExpose({ adaPerubahan });
</script>

<template>
  <div>
    <!-- Komposisi belum ada -->
    <div v-if="!data.komposisi" class="p-8 text-center space-y-3">
      <p class="text-body-md text-on-surface">Komposisi Nilai Kelas (OBE) untuk kelas ini belum diisi.</p>
      <p class="text-body-sm text-on-surface-variant">
        Kolom nilai mengikuti komposisi: metode evaluasi, sub metode & bobotnya.
        <template v-if="data.adaKomposisiRps">Komposisi bisa diambil dari Rencana Evaluasi RPS periode {{ data.periodeRps?.nama }}.</template>
        <template v-else>Rencana Evaluasi RPS mata kuliah ini juga belum diisi — isi Bobot OBE kelas, atau minta prodi mengisi Komposisi Nilai Kelas.</template>
      </p>
      <div class="flex flex-wrap justify-center gap-2">
        <AppButton v-if="data.adaKomposisiRps" icon="download" :disabled="mengambil" @click="pakaiRps">
          {{ mengambil ? 'Mengambil...' : 'Gunakan Komposisi dari RPS' }}
        </AppButton>
        <AppButton :variant="data.adaKomposisiRps ? 'secondary' : 'primary'" icon="balance" @click="emit('isiBobot')">Isi Bobot OBE</AppButton>
      </div>
    </div>

    <template v-else>
      <div class="p-4 border-b border-outline-variant flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <p class="text-body-sm text-on-surface-variant">
          Nilai diinput <strong>per CPMK</strong> pada tiap metode/sub metode <strong>Komposisi Nilai Kelas (OBE)</strong>; persentase di bawah nama kolom = bobot
          terhadap nilai akhir. Isi angka 0–100; kolom kosong dihitung 0. Capaian CPMK = rata-rata berbobot nilai CPMK tsb.
          <span v-if="data.cpmkRata" class="block mt-1 text-[#9a6700]">
            Komposisi kelas belum memetakan nilai CPMK, jadi bobot tiap metode dibagi rata ke CPMK mata kuliah. Minta prodi mengatur nilai CPMK di
            Perkuliahan → Kelas Kuliah → Nilai Perkuliahan.
          </span>
          <span v-else-if="!adaCpmk" class="block mt-1 text-[#9a6700]">Mata kuliah ini belum memiliki CPMK; nilai diinput per metode evaluasi.</span>
          <span v-if="data.sumber === 'RPS'" class="block mt-1 text-[#1e40af]">
            Kolom mengikuti <strong>Rencana Evaluasi RPS periode {{ data.periodeRps?.nama }}</strong> yang lebih baru dari komposisi kelas.
            <template v-if="data.perluSinkron">Komposisi kelas akan diselaraskan ke RPS saat Anda menyimpan nilai.</template>
          </span>
          <span v-if="tidakDiukur.length" class="block mt-1 text-error">
            {{ tidakDiukur.map((c) => c.kode).join(', ') }} belum diukur oleh metode evaluasi mana pun (bobotnya 0% di Rencana Evaluasi), jadi tidak ada kolom
            isiannya. Tambahkan nilai CPMK tsb di RPS → Rencana Evaluasi bila perlu dinilai.
          </span>
        </p>
        <div class="flex flex-wrap items-center gap-2 lg:justify-end">
          <div class="w-full sm:w-64 [&>div]:!w-full">
            <SearchInput v-model="search" placeholder="Cari NIM atau nama..." />
          </div>
          <AppButton icon="save" :disabled="saving || !adaPerubahan" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan Nilai' }}</AppButton>
        </div>
      </div>

      <div v-if="!rows.length" class="p-8 text-center text-body-sm text-on-surface-variant">Belum ada mahasiswa (KRS disetujui) pada kelas ini</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary">
            <!-- Baris 1: metode evaluasi -->
            <tr>
              <th :rowspan="adaCpmk ? 3 : 2" class="p-3 font-semibold border-b border-outline-variant">No</th>
              <th :rowspan="adaCpmk ? 3 : 2" class="p-3 font-semibold border-b border-outline-variant">NIM</th>
              <th :rowspan="adaCpmk ? 3 : 2" class="p-3 font-semibold border-b border-outline-variant">Nama Mahasiswa</th>
              <th
                v-for="g in grupMetode"
                :key="g.induk"
                :colspan="g.kolom.length"
                :rowspan="!g.sub.length && !g.kolom[0].cpmkId ? (adaCpmk ? 3 : 2) : !g.sub.length ? 2 : 1"
                class="p-2 font-semibold text-center uppercase border-l border-b border-outline-variant"
              >
                {{ g.metode }}<span v-if="g.syaratLulus" class="text-error" title="Syarat lulus">*</span>
                <span class="block text-label-sm font-normal normal-case text-on-surface-variant">{{ persen(bobotGrup(g.kolom)) }}</span>
              </th>
              <th v-if="cpmkDiukur.length" :colspan="cpmkDiukur.length" :rowspan="adaCpmk ? 2 : 1" class="p-2 font-semibold text-center border-l border-b border-outline-variant bg-primary-container/40">
                Capaian CPMK
              </th>
              <th :rowspan="adaCpmk ? 3 : 2" class="p-2 font-semibold text-center border-l border-b border-outline-variant">Nilai Akhir</th>
              <th :rowspan="adaCpmk ? 3 : 2" class="p-2 font-semibold text-center border-b border-outline-variant">Huruf</th>
              <th :rowspan="adaCpmk ? 3 : 2" class="p-2 font-semibold text-center border-l border-b border-outline-variant">Keterangan</th>
            </tr>
            <!-- Baris 2: sub metode -->
            <tr>
              <template v-for="g in grupMetode" :key="`s${g.induk}`">
                <th
                  v-for="s in g.sub"
                  :key="s.komponen"
                  :colspan="s.kolom.length"
                  :rowspan="!s.kolom[0].cpmkId && adaCpmk ? 2 : 1"
                  class="p-2 font-semibold text-center uppercase border-l border-b border-outline-variant"
                >
                  {{ s.nama }}
                  <span class="block text-label-sm font-normal normal-case text-on-surface-variant">{{ persen(bobotGrup(s.kolom)) }}</span>
                </th>
              </template>
            </tr>
            <!-- Baris 3: CPMK yang diukur tiap komponen -->
            <tr v-if="adaCpmk">
              <template v-for="k in data.kolom" :key="`c${k.kunci}`">
                <th v-if="k.cpmkId" class="p-2 font-semibold text-center whitespace-nowrap border-l border-b border-outline-variant">
                  {{ k.cpmkKode }}
                  <span class="block text-label-sm font-normal text-on-surface-variant">{{ persen(k.bobot) }}</span>
                  <CpmkInfo :kode="k.cpmkKode ?? ''" :deskripsi="deskripsiCpmk(k.cpmkId)" />
                </th>
              </template>
              <th
                v-for="c in cpmkDiukur"
                :key="`cap${c.id}`"
                class="p-2 font-semibold text-center whitespace-nowrap border-l border-b border-outline-variant bg-primary-container/40"
              >
                {{ c.kode }}
                <span v-if="!diukur(c.id)" class="block text-label-sm font-normal text-error">belum diukur</span>
                <CpmkInfo :kode="c.kode" :deskripsi="c.deskripsi" />
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="r in tampil" :key="r.mahasiswaId" class="hover:bg-surface-container">
              <td class="p-3">{{ r.no }}</td>
              <td class="p-3 whitespace-nowrap">{{ r.nim }}</td>
              <td class="p-3 min-w-48">{{ r.namaLengkap }}</td>
              <td v-for="k in data.kolom" :key="k.kunci" class="p-1.5 text-center border-l border-outline-variant">
                <input
                  v-model="r.input[k.kunci]"
                  type="text"
                  inputmode="decimal"
                  :aria-label="`${k.nama ?? k.metode}${k.cpmkKode ? ` ${k.cpmkKode}` : ''} ${r.namaLengkap}`"
                  class="w-16 px-2 py-1.5 text-center border rounded-md bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                  :class="tidakValid(r.input[k.kunci]) ? 'border-error text-error' : 'border-outline-variant focus:border-primary'"
                />
              </td>
              <td v-for="c in cpmkDiukur" :key="`cap${c.id}`" class="p-2 text-center tabular-nums border-l border-outline-variant bg-primary-container/15">
                {{ capaian(r, c.id) ?? '-' }}
              </td>
              <td class="p-2 text-center tabular-nums font-medium border-l border-outline-variant">{{ pratinjau(r).nilai ?? '-' }}</td>
              <td class="p-2 text-center font-semibold">{{ pratinjau(r).huruf ?? '-' }}</td>
              <td class="p-2 text-center border-l border-outline-variant">
                <span
                  v-if="keterangan(r)"
                  class="inline-flex px-2 py-0.5 rounded-full text-label-sm font-medium whitespace-nowrap"
                  :class="keterangan(r)!.lulus ? 'bg-[#059669]/15 text-[#05603a]' : 'bg-error-container text-error'"
                  :title="keterangan(r)!.alasan"
                >
                  {{ keterangan(r)!.lulus ? 'Lulus' : 'Tidak Lulus' }}
                </span>
                <span v-else class="text-on-surface-variant">-</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="p-4 text-label-sm text-on-surface-variant">
          <span class="text-error">*</span> = komponen syarat lulus. Keterangan: <strong>Tidak Lulus</strong> bila nilai akhir di bawah C (D/E) atau ada
          komponen syarat lulus yang belum dinilai (arahkan kursor ke label untuk melihat alasannya). Nilai akhir & huruf di tabel adalah pratinjau; nilai resmi dihitung ulang oleh sistem saat
          disimpan dan langsung tampil di KHS mahasiswa. Hanya mahasiswa yang minimal satu komponennya terisi yang disimpan.
        </p>
      </div>
    </template>
  </div>
</template>

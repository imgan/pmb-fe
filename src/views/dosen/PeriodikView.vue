<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import BobotNilaiModal from '@/components/dosen/BobotNilaiModal.vue';
import BobotObeFormModal from '@/components/BobotObeFormModal.vue';
import DaftarMataKuliahDosen from '@/components/dosen/DaftarMataKuliahDosen.vue';
import NilaiObeKelas from '@/components/dosen/NilaiObeKelas.vue';
import SinkronisasiNilaiModal from '@/components/dosen/SinkronisasiNilaiModal.vue';
import { dosenNilaiObeApi, type NilaiObeKelas as NilaiObeData } from '@/api/dosenNilaiObe';
import { dosenBobotObeApi, KOMPONEN_OBE, rumusObe, type BobotObe, type BobotObePayload } from '@/api/bobotObe';
import { dosenKelasApi, type InfoKelasDosen, type KomponenNilai, type NilaiKelasRow } from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import { openBlob } from '@/utils/download';
import { toastError, toastSuccess } from '@/utils/swal';

/**
 * Periodik — Input Nilai. Tanpa ?kelas: daftar mata kuliah yang diajar (status RPS/CPL/CPMK, tombol per
 * kelas). Dengan ?kelas=<id jadwal>: mata kuliah OBE → input nilai per komponen Komposisi Nilai Kelas
 * (NilaiObeKelas); non-OBE → input nilai kelas biasa di bawah.
 *
 * Input Nilai Kelas (non-OBE). Dosen wajib mengisi Bobot OBE kelas (persentase tiap komponen,
 * total 100%) sebelum menyimpan nilai; nilai akhir = Σ komponen × bobot, huruf mengikuti skala nilai
 * sistem. Kolom yang tampil hanya komponen berbobot > 0. Nilai di tabel hanya pratinjau; nilai resmi
 * dihitung ulang di server saat disimpan.
 */
const bobotObe = ref<BobotObe | null>(null);
const bobotObeOpen = ref(false);
const KOMPONEN = computed<{ key: KomponenNilai; label: string; bobot: number }[]>(() =>
  bobotObe.value
    ? KOMPONEN_OBE.filter(({ key }) => (bobotObe.value?.[key] ?? 0) > 0).map(({ key, label }) => ({ key, label, bobot: (bobotObe.value?.[key] ?? 0) / 100 }))
    : []
);
// Skala nilai sama dengan pmb-be/src/utils/gradeScale.js.
const SKALA: [number, string][] = [
  [85, 'A'], [80, 'A-'], [75, 'B+'], [70, 'B'], [65, 'B-'], [60, 'C+'], [55, 'C'], [45, 'D'], [0, 'E'],
];
const hurufDari = (nilai: number) => SKALA.find(([min]) => nilai >= min)?.[1] ?? 'E';
const bobotOpen = ref(false);
const sinkronOpen = ref(false);

type FormRow = NilaiKelasRow & { input: Record<KomponenNilai, string> };

const route = useRoute();
const router = useRouter();
/** Kelas (id jadwal) yang sedang diinput nilainya; '' = mode daftar mata kuliah. */
const appliedJadwalId = computed<number | ''>(() => Number(route.query.kelas) || '');
const obe = ref<NilaiObeData | null>(null);
/** Rumus nilai akhir di popup skala nilai: kelas OBE = metode/sub × CPMK, selain itu komponen Bobot OBE. */
const komponenSkala = computed(() =>
  obe.value
    ? obe.value.kolom.map((k) => ({ label: [k.nama ?? k.metode, k.cpmkKode].filter(Boolean).join(' · '), bobot: k.bobot / 100 }))
    : KOMPONEN.value,
);
const pilihKelas = (id: number) => router.push({ query: { ...route.query, kelas: String(id) } });
const kembali = () => router.push({ query: {} });
const kelas = ref<InfoKelasDosen | null>(null);
const rows = ref<FormRow[]>([]);
const snapshot = ref('[]');
const search = ref('');
const loading = ref(false);
const saving = ref(false);
const printing = ref(false);
const error = ref<string | null>(null);


const toForm = (list: NilaiKelasRow[]): FormRow[] =>
  list.map((m) => ({
    ...m,
    input: Object.fromEntries(KOMPONEN_OBE.map(({ key }) => [key, m[key] === null ? '' : String(m[key])])) as Record<KomponenNilai, string>,
  }));

const muat = async () => {
  if (!appliedJadwalId.value) return;
  loading.value = true;
  error.value = null;
  obe.value = null;
  try {
    // Mata kuliah OBE memakai input nilai per komponen Komposisi Nilai Kelas.
    const dataObe = await dosenNilaiObeApi.get(Number(appliedJadwalId.value));
    if (dataObe.isObe) {
      obe.value = dataObe;
      kelas.value = dataObe.kelas;
      bobotObe.value = dataObe.komposisi;
      return;
    }
    const result = await dosenKelasApi.nilai(Number(appliedJadwalId.value));
    kelas.value = result.kelas;
    bobotObe.value = result.bobotObe;
    rows.value = toForm(result.mahasiswa);
    snapshot.value = JSON.stringify(rows.value.map((r) => r.input));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat nilai kelas');
    kelas.value = null;
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

const adaPerubahan = computed(() => JSON.stringify(rows.value.map((r) => r.input)) !== snapshot.value);

watch(
  appliedJadwalId,
  (id) => {
    search.value = '';
    kelas.value = null;
    obe.value = null;
    rows.value = [];
    if (id) muat();
  },
  { immediate: true },
);

const angka = (v: string) => {
  const n = Number(String(v).replace(',', '.'));
  return v.trim() === '' || !Number.isFinite(n) ? null : n;
};
const tidakValid = (v: string) => {
  const n = angka(v);
  return v.trim() !== '' && (n === null || n < 0 || n > 100);
};
const pratinjau = (r: FormRow) => {
  if (!bobotObe.value || KOMPONEN.value.every(({ key }) => r.input[key].trim() === '')) return { nilai: null as number | null, huruf: null as string | null };
  const nilai = Math.round(KOMPONEN.value.reduce((sum, { key, bobot }) => sum + (angka(r.input[key]) ?? 0) * bobot, 0) * 100) / 100;
  return { nilai, huruf: hurufDari(nilai) };
};

const tampil = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? rows.value.filter((r) => r.nim.toLowerCase().includes(q) || r.namaLengkap.toLowerCase().includes(q)) : rows.value;
});

const handleSimpan = async () => {
  if (!appliedJadwalId.value) return;
  if (!bobotObe.value) {
    toastError('Isi Bobot OBE kelas ini terlebih dahulu');
    bobotObeOpen.value = true;
    return;
  }
  if (rows.value.some((r) => KOMPONEN.value.some(({ key }) => tidakValid(r.input[key])))) {
    toastError('Ada nilai yang tidak valid (harus angka 0–100). Periksa kolom yang ditandai merah.');
    return;
  }
  // Hanya mahasiswa yang punya minimal satu komponen terisi yang disimpan.
  const items = rows.value
    .filter((r) => KOMPONEN.value.some(({ key }) => r.input[key].trim() !== ''))
    .map((r) => ({
      mahasiswaId: r.mahasiswaId,
      // Komponen berbobot 0 tetap dikirim (nilai lama dipertahankan) supaya tidak hilang bila bobot diubah lagi.
      ...(Object.fromEntries(KOMPONEN_OBE.map(({ key }) => [key, angka(r.input[key]) ?? 0])) as Record<KomponenNilai, number>),
    }));
  if (!items.length) {
    toastError('Belum ada nilai yang diisi');
    return;
  }
  saving.value = true;
  try {
    const result = await dosenKelasApi.simpanNilai(Number(appliedJadwalId.value), items);
    rows.value = toForm(result.mahasiswa);
    snapshot.value = JSON.stringify(rows.value.map((r) => r.input));
    toastSuccess(`Nilai ${items.length} mahasiswa disimpan`);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan nilai'));
  } finally {
    saving.value = false;
  }
};

/** Hasil sinkronisasi (kehadiran / e-learning) mengisi form; belum tersimpan sampai Simpan Nilai. */
const terapkanSinkron = (hasil: Record<number, Partial<Record<KomponenNilai, number>>>) => {
  let jumlah = 0;
  rows.value.forEach((r) => {
    const h = hasil[r.mahasiswaId];
    if (!h) return;
    Object.entries(h).forEach(([key, v]) => (r.input[key as KomponenNilai] = String(v)));
    jumlah += 1;
  });
  toastSuccess(`Nilai ${jumlah} mahasiswa terisi dari sinkronisasi — periksa lalu klik Simpan Nilai`);
};

const simpanBobotObe = async (payload: BobotObePayload) => {
  if (!appliedJadwalId.value) return;
  const res = await dosenBobotObeApi.save(Number(appliedJadwalId.value), payload);
  toastSuccess(res.message);
  await muat();
};

const handleCetak = async () => {
  if (!appliedJadwalId.value) return;
  if (adaPerubahan.value) {
    toastError('Simpan nilai terlebih dahulu sebelum mencetak');
    return;
  }
  printing.value = true;
  try {
    openBlob(await dosenKelasApi.pdf(Number(appliedJadwalId.value), 'nilai'));
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka daftar nilai'));
  } finally {
    printing.value = false;
  }
};
</script>

<template>
  <!-- Mode daftar: mata kuliah yang diajar + tombol input nilai per kelas -->
  <div v-if="!appliedJadwalId">
    <PageHeader
      title="Input Nilai"
      subtitle="Pilih kelas pada mata kuliah yang Anda ajar untuk menginput nilai. Mata kuliah OBE memakai komponen Komposisi Nilai Kelas."
    />
    <DaftarMataKuliahDosen @pilih="pilihKelas" />
  </div>

  <div v-else>
    <PageHeader title="Input Nilai Kelas" subtitle="Dosen / Perkuliahan / Input Nilai">
      <template #actions>
        <AppButton variant="secondary" icon="arrow_back" @click="kembali">Kembali ke Daftar</AppButton>
        <AppButton v-if="!obe" variant="secondary" icon="table_chart" @click="bobotOpen = true">Bobot Nilai</AppButton>
      </template>
    </PageHeader>
    <BobotNilaiModal v-model="bobotOpen" :komponen="komponenSkala" />
    <SinkronisasiNilaiModal
      v-if="appliedJadwalId && !obe"
      v-model="sinkronOpen"
      :jadwal-kuliah-id="Number(appliedJadwalId)"
      :komponen="KOMPONEN"
      :mahasiswa="rows"
      @terapkan="terapkanSinkron"
    />
    <BobotObeFormModal
      v-model="bobotObeOpen"
      :bobot="bobotObe"
      :subtitle="kelas ? `${kelas.kodeMataKuliah} · ${kelas.namaMataKuliah} · Kelas ${kelas.kelas}` : ''"
      :save="simpanBobotObe"
    />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <!-- Mata kuliah OBE: input nilai per komponen Komposisi Nilai Kelas -->
      <template v-if="obe">
        <div class="p-4 border-b border-outline-variant bg-surface-bright text-body-sm flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex-1 min-w-0">
          <p class="text-body-md font-medium text-on-surface">
            {{ obe.kelas.kodeMataKuliah }} · {{ obe.kelas.namaMataKuliah }} · Kelas {{ obe.kelas.kelas }} ({{ obe.kelas.sks ?? 0 }} SKS)
            <span class="ml-1 px-2 py-0.5 rounded border border-[#2563eb]/40 bg-[#2563eb]/10 text-[#1e40af] text-label-sm align-middle">OBE</span>
          </p>
          <p class="text-on-surface-variant">{{ obe.kelas.tahunAjaran }}</p>
          </div>
          <AppButton variant="secondary" icon="grading" title="Skala nilai huruf (A, A-, B+, ...) & rentang skornya" @click="bobotOpen = true">
            Skala Nilai Huruf
          </AppButton>
        </div>
        <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
        <NilaiObeKelas :data="obe" @updated="(d) => { obe = d; bobotObe = d.komposisi; }" @isi-bobot="bobotObeOpen = true" />
      </template>

      <template v-else>
      <div v-if="kelas" class="p-4 border-b border-outline-variant flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div class="text-body-sm text-on-surface-variant">
          <p class="text-body-md font-medium text-on-surface">
            {{ kelas.kodeMataKuliah }} · {{ kelas.namaMataKuliah }} · Kelas {{ kelas.kelas }} ({{ kelas.sks ?? 0 }} SKS)
          </p>
          <p v-if="bobotObe">
            Bobot OBE: {{ rumusObe(bobotObe) }}. Isi angka 0–100; kolom kosong dihitung 0.
            <button type="button" class="text-primary hover:underline ml-1" @click="bobotObeOpen = true">Ubah bobot</button>
          </p>
          <p v-else class="text-error font-medium">Bobot OBE kelas ini belum diisi — isi dulu sebelum menginput nilai.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2 lg:justify-end">
          <div class="w-full sm:w-64 [&>div]:!w-full">
            <SearchInput v-model="search" placeholder="Cari NIM atau nama..." />
          </div>
          <AppButton :variant="bobotObe ? 'secondary' : 'primary'" icon="balance" @click="bobotObeOpen = true">
            {{ bobotObe ? 'Bobot OBE' : 'Isi Bobot OBE' }}
          </AppButton>
          <AppButton variant="secondary" icon="sync" :disabled="!bobotObe || !rows.length" title="Ambil nilai dari kehadiran & e-learning" @click="sinkronOpen = true">
            Sinkronisasi Nilai
          </AppButton>
          <AppButton icon="save" :disabled="saving || !adaPerubahan || !bobotObe" @click="handleSimpan">
            {{ saving ? 'Menyimpan...' : 'Simpan Nilai' }}
          </AppButton>
          <AppButton variant="secondary" icon="print" :disabled="printing" @click="handleCetak">
            {{ printing ? 'Membuka...' : 'Cetak Daftar Nilai' }}
          </AppButton>
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <div v-else-if="!kelas" class="p-8 text-center text-body-sm text-on-surface-variant">Kelas tidak ditemukan atau Anda tidak mengampu kelas ini</div>
      <div v-else-if="!rows.length" class="p-8 text-center text-body-sm text-on-surface-variant">
        Belum ada mahasiswa (KRS disetujui) pada mata kuliah ini
      </div>
      <div v-else-if="!bobotObe" class="p-8 text-center">
        <p class="text-body-md text-on-surface mb-3">Tentukan Bobot OBE kelas ini terlebih dahulu (persentase Partisipasi, Tugas, Quiz, Proyek, UTS, UAS).</p>
        <AppButton icon="balance" @click="bobotObeOpen = true">Isi Bobot OBE</AppButton>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] border-b border-outline-variant text-label-md text-primary">
            <tr>
              <th class="p-3 font-semibold">No</th>
              <th class="p-3 font-semibold">NIM</th>
              <th class="p-3 font-semibold">Nama Mahasiswa</th>
              <th v-for="k in KOMPONEN" :key="k.key" class="p-2 font-semibold text-center whitespace-nowrap">
                {{ k.label }}
                <span class="block text-label-sm font-normal text-on-surface-variant">{{ Math.round(k.bobot * 10000) / 100 }}%</span>
              </th>
              <th class="p-2 font-semibold text-center">Nilai Akhir</th>
              <th class="p-2 font-semibold text-center">Huruf</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="r in tampil" :key="r.mahasiswaId" class="hover:bg-surface-container">
              <td class="p-3">{{ r.no }}</td>
              <td class="p-3 whitespace-nowrap">{{ r.nim }}</td>
              <td class="p-3 min-w-48">{{ r.namaLengkap }}</td>
              <td v-for="k in KOMPONEN" :key="k.key" class="p-1.5 text-center">
                <input
                  v-model="r.input[k.key]"
                  type="text"
                  inputmode="decimal"
                  :aria-label="`${k.label} ${r.namaLengkap}`"
                  class="w-16 px-2 py-1.5 text-center border rounded-md bg-surface-container-lowest outline-none focus:ring-1 focus:ring-primary"
                  :class="tidakValid(r.input[k.key]) ? 'border-error text-error' : 'border-outline-variant focus:border-primary'"
                />
              </td>
              <td class="p-2 text-center tabular-nums font-medium">{{ pratinjau(r).nilai ?? '-' }}</td>
              <td class="p-2 text-center font-semibold">{{ pratinjau(r).huruf ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
        <p class="p-4 text-label-sm text-on-surface-variant">
          Nilai akhir & huruf di tabel adalah pratinjau; nilai resmi dihitung ulang oleh sistem saat disimpan dan langsung
          tampil di KHS mahasiswa. Hanya mahasiswa yang minimal satu komponennya terisi yang disimpan.
        </p>
      </div>
      </template>
    </section>
  </div>
</template>

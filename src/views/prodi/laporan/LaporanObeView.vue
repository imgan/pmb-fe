<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import LaporanCplProdi from '@/components/laporan/LaporanCplProdi.vue';
import LaporanCplMahasiswa from '@/components/laporan/LaporanCplMahasiswa.vue';
import LaporanCpmkMahasiswa from '@/components/laporan/LaporanCpmkMahasiswa.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import { laporanObeApi, type JenisLaporanObe, type LaporanObeData, type LaporanObeMkOption, type LaporanObeOptions, type LaporanObeQuery, type MetodeLaporanObe } from '@/api/laporanObe';
import { extractErrorMessage } from '@/api/http';
import { useProdiContext } from '@/composables/useProdiContext';
import { openBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';

/**
 * Prodi → Laporan → Laporan OBE (Monitoring OBE): capaian CPL per Program Studi, CPL per Mahasiswa, dan CPMK per
 * Mata Kuliah dari Input Nilai OBE dosen. "Tampilkan" = tabel di halaman; "Lihat di Tab Baru" = PDF (kop opsional).
 */
const { prodi: prodiSesi, prodiLocked } = useProdiContext();

const JENIS_OPTIONS: SelectOption[] = [
  { value: 'cpl-prodi', label: 'CPL per Program Studi' },
  { value: 'cpl-mahasiswa', label: 'CPL per Mahasiswa' },
  { value: 'cpmk-mk', label: 'CPMK per Mata Kuliah' },
  { value: 'cpmk-mahasiswa', label: 'CPMK per Mahasiswa' },
];
const KETERANGAN_METODE: Record<MetodeLaporanObe, string> = {
  rerata: 'Nilai dihitung dari rerata capaian pembelajaran.',
  progresif: 'Nilai dihitung dari capaian terbaru: mata kuliah yang diulang hanya memakai capaian periode terakhir.',
};

const options = ref<LaporanObeOptions>({ prodi: [] });
const jenis = ref<string | number | null>('cpl-prodi');
const kodeProdi = ref<string | number | null>('');
const tahunKurikulum = ref<string | number | null>('');
const angkatan = ref<string | number | null>('');
const metode = ref<MetodeLaporanObe>('rerata');
const kop = ref(true);
// CPMK per Mahasiswa: satu mata kuliah; metode perhitungan tidak dipakai di form (default Rerata).
const perMk = computed(() => jenis.value === 'cpmk-mahasiswa');
const mataKuliahId = ref<string | number | null>('');
const mkList = ref<LaporanObeMkOption[]>([]);
const mkOptions = computed<SelectOption[]>(() =>
  mkList.value.map((m) => ({
    value: m.id,
    label: `${m.kode} - ${m.mataKuliah} (${m.sks} SKS - SEMESTER ${m.semester ?? '-'})${m.jumlahCpmk ? '' : ' · belum ada CPMK'}`,
  })),
);
const muatMk = async () => {
  mkList.value = [];
  if (!perMk.value || !kodeProdi.value || !tahunKurikulum.value) return;
  try {
    mkList.value = await laporanObeApi.mataKuliah(String(kodeProdi.value), Number(tahunKurikulum.value));
  } catch {
    mkList.value = [];
  }
  if (!mkList.value.some((m) => m.id === mataKuliahId.value)) mataKuliahId.value = '';
};
watch([perMk, kodeProdi, tahunKurikulum], muatMk);

const prodiAktif = computed(() => options.value.prodi.find((p) => p.kodeProdi === kodeProdi.value) ?? null);
const prodiOptions = computed<SelectOption[]>(() => options.value.prodi.map((p) => ({ value: p.kodeProdi, label: p.nama })));
const tahunOptions = computed<SelectOption[]>(() => (prodiAktif.value?.tahunKurikulum ?? []).map((t) => ({ value: t, label: String(t) })));
const angkatanOptions = computed<SelectOption[]>(() => (prodiAktif.value?.angkatan ?? []).map((t) => ({ value: t, label: String(t) })));
watch(kodeProdi, () => {
  if (!tahunOptions.value.some((o) => o.value === tahunKurikulum.value)) tahunKurikulum.value = tahunOptions.value[0]?.value ?? '';
  if (angkatan.value && !angkatanOptions.value.some((o) => o.value === angkatan.value)) angkatan.value = '';
});

onMounted(async () => {
  try {
    options.value = await laporanObeApi.filterOptions();
    kodeProdi.value = prodiSesi.value?.kodeProdi ?? options.value.prodi[0]?.kodeProdi ?? '';
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat pilihan filter'));
  }
});

const query = (): LaporanObeQuery | null => {
  if (!kodeProdi.value) return toastError('Program studi wajib dipilih'), null;
  if (!tahunKurikulum.value) return toastError('Tahun kurikulum wajib dipilih'), null;
  if (perMk.value && !mataKuliahId.value) return toastError('Mata kuliah wajib dipilih'), null;
  return {
    jenis: jenis.value as JenisLaporanObe,
    kodeProdi: String(kodeProdi.value),
    tahunKurikulum: Number(tahunKurikulum.value),
    angkatan: angkatan.value ? Number(angkatan.value) : undefined,
    metode: perMk.value ? 'rerata' : metode.value,
    mataKuliahId: perMk.value ? Number(mataKuliahId.value) : undefined,
  };
};

const data = ref<LaporanObeData | null>(null);
const loading = ref(false);
const tampilkan = async () => {
  const q = query();
  if (!q) return;
  loading.value = true;
  try {
    data.value = await laporanObeApi.generate(q);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat laporan'));
  } finally {
    loading.value = false;
  }
};
const membuka = ref(false);
const lihatTabBaru = async () => {
  const q = query();
  if (!q) return;
  membuka.value = true;
  try {
    openBlob(await laporanObeApi.pdf({ ...q, kop: kop.value }));
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuat PDF laporan'));
  } finally {
    membuka.value = false;
  }
};

const angka = (v: number | null | undefined) => (v === null || v === undefined ? '-' : v.toLocaleString('id-ID', { maximumFractionDigits: 2 }));
const statusCls = (t: boolean | null) =>
  t === null ? 'bg-surface-container text-on-surface-variant' : t ? 'bg-[#059669]/15 text-[#05603a]' : 'bg-error-container text-on-error-container';
const statusLabel = (t: boolean | null) => (t === null ? '-' : t ? 'Tercapai' : 'Belum Tercapai');

type CplProdiRows = Extract<LaporanObeData, { konteks: { jenis: 'cpl-prodi' } }>['rows'];

const label = 'text-label-md font-semibold text-primary';
const baris = 'grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 md:gap-6 px-4 py-3 border-b border-outline-variant md:items-center';
const th = 'px-3 py-2.5 border border-on-primary/25 font-semibold';
const td = 'px-3 py-2.5 border border-outline-variant';
</script>

<template>
  <div>
    <PageHeader title="Laporan OBE" subtitle="Monitoring capaian CPL & CPMK dari nilai OBE yang diinput dosen." />

    <!-- Form filter -->
    <section class="bg-surface-container-lowest border border-outline-variant border-t-2 border-t-primary rounded-lg overflow-hidden mb-4">
      <div :class="baris">
        <span :class="label">Jenis Laporan</span>
        <SelectInput v-model="jenis" :options="JENIS_OPTIONS" :clearable="false" />
      </div>
      <div :class="baris">
        <span :class="label">Program Studi <span class="text-error">*</span></span>
        <SelectInput v-model="kodeProdi" :options="prodiOptions" :disabled="prodiLocked" :clearable="false" placeholder="-- Pilih Program Studi --" />
      </div>
      <div :class="baris">
        <span :class="label">Tahun Kurikulum <span class="text-error">*</span></span>
        <SelectInput v-model="tahunKurikulum" :options="tahunOptions" :clearable="false" placeholder="-- Pilih Tahun Kurikulum --" />
      </div>
      <div v-if="perMk" :class="baris">
        <span :class="label">Mata Kuliah <span class="text-error">*</span></span>
        <SearchableSelect v-model="mataKuliahId" :options="mkOptions" placeholder="-- Pilih Mata Kuliah --" search-placeholder="Ketik kode atau nama mata kuliah..." />
      </div>
      <div :class="baris">
        <span :class="label">Angkatan</span>
        <SelectInput v-model="angkatan" :options="angkatanOptions" placeholder="-- Semua Angkatan --" />
      </div>
      <div v-if="!perMk" :class="baris" class="md:!items-start">
        <span :class="label" class="md:pt-1">Metode Perhitungan</span>
        <div class="space-y-2">
          <div class="flex flex-wrap gap-5 text-body-sm">
            <label v-for="m in ['rerata', 'progresif'] as const" :key="m" class="inline-flex items-center gap-2 cursor-pointer">
              <input v-model="metode" type="radio" :value="m" class="h-4 w-4 accent-primary" />
              {{ m === 'rerata' ? 'Rerata' : 'Progresif' }}
            </label>
          </div>
          <div class="px-3 py-2.5 rounded-md border border-[#0d9488]/40 bg-[#0d9488]/10 text-body-sm">{{ KETERANGAN_METODE[metode] }}</div>
        </div>
      </div>
      <div :class="baris">
        <span :class="label">KOP</span>
        <label class="inline-flex items-center gap-2 text-body-sm cursor-pointer">
          <input v-model="kop" type="checkbox" class="h-4 w-4 accent-primary" />
          Gunakan KOP
        </label>
      </div>
      <div class="px-4 py-3 flex flex-wrap justify-end gap-2">
        <AppButton icon="visibility" :disabled="loading" @click="tampilkan">{{ loading ? 'Memuat...' : 'Tampilkan' }}</AppButton>
        <AppButton variant="secondary" icon="open_in_new" :disabled="membuka" @click="lihatTabBaru">{{ membuka ? 'Membuat PDF...' : 'Lihat di Tab Baru' }}</AppButton>
      </div>
    </section>

    <!-- Hasil -->
    <section v-if="data" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div v-if="data.konteks.jenis === 'cpmk-mk'" class="px-4 py-3 bg-primary text-on-primary">
        <p class="font-semibold">{{ JENIS_OPTIONS.find((j) => j.value === data?.konteks.jenis)?.label }}</p>
        <p class="text-body-sm opacity-90">
          {{ data.konteks.prodi }} · Kurikulum {{ data.konteks.tahunKurikulum }} · {{ data.konteks.angkatan ? `Angkatan ${data.konteks.angkatan}` : 'Semua Angkatan' }} ·
          Metode {{ data.konteks.metode === 'rerata' ? 'Rerata' : 'Progresif' }} · {{ data.konteks.jumlahDinilai ?? data.konteks.jumlahMahasiswa }} dari {{ data.konteks.jumlahMahasiswa }} mahasiswa sudah dinilai
        </p>
      </div>

      <div v-if="!(data.konteks.jumlahDinilai ?? data.konteks.jumlahMahasiswa)" class="mx-4 mt-4 flex items-center gap-2 px-3 py-2.5 rounded-md border border-[#eda100]/50 bg-[#eda100]/10 text-body-sm">
        <span class="material-symbols-outlined text-[#eda100]" style="font-size: 20px">info</span>
        Belum ada nilai OBE (Input Nilai per CPMK) untuk filter ini, sehingga capaian belum bisa dihitung.
      </div>

      <div class="p-4 overflow-x-auto">
        <!-- CPL per Program Studi: kepala laporan, spiderchart, performa & detail -->
        <LaporanCplProdi v-if="data.konteks.jenis === 'cpl-prodi' && 'rows' in data" :konteks="data.konteks" :rows="(data.rows as CplProdiRows)" />

        <!-- CPL per Mahasiswa: kepala laporan, daftar CPL, nilai per mahasiswa & keterangan -->
        <LaporanCplMahasiswa v-else-if="data.konteks.jenis === 'cpl-mahasiswa' && 'kolom' in data && !('mataKuliah' in data)" :konteks="data.konteks" :kolom="data.kolom" :rows="data.rows" :rerata="data.rerata" />

        <!-- CPMK per Mahasiswa: satu mata kuliah -->
        <LaporanCpmkMahasiswa
          v-else-if="data.konteks.jenis === 'cpmk-mahasiswa' && 'mataKuliah' in data"
          :konteks="data.konteks"
          :mata-kuliah="data.mataKuliah"
          :kolom="data.kolom"
          :rows="data.rows"
          :rerata="data.rerata"
        />

        <!-- CPMK per Mata Kuliah -->
        <table v-else-if="data.konteks.jenis === 'cpmk-mk'" class="w-full border-collapse text-body-sm">
          <thead class="bg-primary text-on-primary">
            <tr>
              <th :class="th" class="w-12 text-center">No</th>
              <th :class="th" class="text-left min-w-[14rem]">Mata Kuliah</th>
              <th :class="th" class="text-left">CPMK</th>
              <th :class="th" class="text-left min-w-[14rem]">Deskripsi CPMK</th>
              <th :class="th" class="text-center">CPL</th>
              <th :class="th" class="text-center">Jml Mhs</th>
              <th :class="th" class="text-center">Rerata</th>
              <th :class="th" class="text-center">Target</th>
              <th :class="th" class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!data.rows.length">
              <td colspan="9" :class="td" class="p-6 text-center text-on-surface-variant">Belum ada mata kuliah dengan CPMK di kurikulum ini.</td>
            </tr>
            <template v-for="(m, i) in (data.rows as Extract<LaporanObeData, { konteks: { jenis: 'cpmk-mk' } }>['rows'])" :key="m.id">
              <tr v-for="(c, j) in m.cpmk" :key="c.id" class="align-top">
                <template v-if="j === 0">
                  <td :rowspan="m.cpmk.length" :class="td" class="text-center">{{ i + 1 }}</td>
                  <td :rowspan="m.cpmk.length" :class="td">
                    <span class="font-medium">{{ m.kode }}</span> — {{ m.mataKuliah }}
                    <span class="block text-label-sm text-on-surface-variant">Semester {{ m.semester ?? '-' }}{{ m.isObe ? ' · OBE' : ' · Non OBE' }}</span>
                  </td>
                </template>
                <td :class="td" class="whitespace-nowrap">{{ c.kode }}</td>
                <td :class="td">{{ c.deskripsi }}</td>
                <td :class="td" class="text-center">{{ c.cpl.join(', ') || '-' }}</td>
                <td :class="td" class="text-center">{{ c.jumlahMahasiswa }}</td>
                <td :class="td" class="text-center font-semibold tabular-nums">{{ angka(c.rerata) }}</td>
                <td :class="td" class="text-center tabular-nums">{{ angka(c.target) }}</td>
                <td :class="td" class="text-center">
                  <span class="inline-flex px-2 py-0.5 rounded-full text-label-sm whitespace-nowrap" :class="statusCls(c.tercapai)">{{ statusLabel(c.tercapai) }}</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { capaianApi, type CapaianQuery, type CapaianRow } from '@/api/capaian';
import { jurusanApi } from '@/api/jurusan';
import { extractErrorMessage } from '@/api/http';
import { useProdiContext } from '@/composables/useProdiContext';
import { downloadBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';

/**
 * Prodi → Kurikulum → Manajemen Capaian: status pengisian capaian OBE tiap kurikulum — jumlah Profil
 * Lulusan (PL) & CPL, % PL yang sudah dipetakan ke CPL, % CPL yang sudah dipetakan ke mata kuliah.
 */
const router = useRouter();
const { prodiLocked, prodiPlaceholder, defaultJurusanId } = useProdiContext();

const tahunOptions = ref<SelectOption[]>([]);
const jenjangOptions = ref<SelectOption[]>([]);
const prodiOptions = ref<SelectOption[]>([]);
const JENIS_OPTIONS: SelectOption[] = [
  { value: 'OBE', label: 'OBE' },
  { value: 'NON_OBE', label: 'Non OBE' },
];

const tahunKurikulum = ref<number | ''>('');
const jenjang = ref<string | ''>('');
const jurusanId = ref<number | ''>(defaultJurusanId ?? '');
const jenis = ref<'' | 'OBE' | 'NON_OBE'>('');

const rows = ref<CapaianRow[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const query = (): CapaianQuery => ({
  tahunKurikulum: tahunKurikulum.value || undefined,
  jenjang: jenjang.value || undefined,
  jurusanId: jurusanId.value || undefined,
  jenis: jenis.value || undefined,
});

const fetchRows = async () => {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await capaianApi.list(query());
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat manajemen capaian');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  fetchRows();
  try {
    const [opsi, prodi] = await Promise.all([capaianApi.filterOptions(), jurusanApi.listProdi()]);
    tahunOptions.value = opsi.tahunKurikulum.map((t) => ({ value: t, label: `Kurikulum ${t}` }));
    jenjangOptions.value = opsi.jenjang.map((j) => ({ value: j, label: j }));
    prodiOptions.value = prodi.data.map((j) => ({ value: j.id, label: j.namaJurusan }));
  } catch {
    // filter tetap kosong
  }
});

// ---- Pilih baris & cetak laporan ----
const selected = ref<number[]>([]);
const semuaTerpilih = computed(() => rows.value.length > 0 && rows.value.every((r) => selected.value.includes(r.id)));
const toggleSemua = () => (selected.value = semuaTerpilih.value ? [] : rows.value.map((r) => r.id));
const toggle = (id: number) =>
  (selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id]);

const printing = ref(false);
const cetakLaporan = async () => {
  printing.value = true;
  try {
    downloadBlob(await capaianApi.laporan(query()), 'laporan-manajemen-capaian.xlsx');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mencetak laporan'));
  } finally {
    printing.value = false;
  }
};

/** Warna status: hijau = lengkap/ada isi, kuning = sebagian, merah = belum. */
const warnaPersen = (n: number) =>
  n >= 100 ? 'bg-success-container text-on-success-container' : n > 0 ? 'bg-warning-container text-on-warning-container' : 'bg-danger-container text-on-danger-container';
const warnaJumlah = (n: number) => (n > 0 ? 'bg-success-container text-on-success-container' : 'bg-danger-container text-on-danger-container');

const buka = (r: CapaianRow) => router.push({ name: 'prodi-manajemen-capaian-detail', params: { id: r.id } });
</script>

<template>
  <div>
    <PageHeader title="Manajemen Capaian" subtitle="Status pengisian Profil Lulusan, CPL, dan pemetaannya per kurikulum (OBE)." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
        <SelectInput v-model="tahunKurikulum" label="Tahun Kurikulum" placeholder="-- Semua Tahun Kurikulum --" :options="tahunOptions" @change="fetchRows" />
        <SelectInput v-model="jenjang" label="Jenjang Pendidikan" placeholder="-- Semua Jenjang Pendidikan --" :options="jenjangOptions" @change="fetchRows" />
        <SelectInput
          v-model="jurusanId"
          label="Program Studi"
          :placeholder="prodiPlaceholder('-- Semua Program Studi --')"
          :disabled="prodiLocked"
          :options="prodiOptions"
          @change="fetchRows"
        />
        <SelectInput v-model="jenis" label="Jenis Kurikulum" placeholder="-- Semua Jenis Kurikulum --" :options="JENIS_OPTIONS" @change="fetchRows" />
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex justify-end">
        <AppButton icon="print" :disabled="printing" @click="cetakLaporan">{{ printing ? 'Menyiapkan...' : 'Cetak Laporan' }}</AppButton>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="overflow-x-auto">
        <table class="w-full text-body-sm border-collapse">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th rowspan="2" class="p-3 w-10 border-b border-outline-variant">
                <input type="checkbox" aria-label="Pilih semua" :checked="semuaTerpilih" @change="toggleSemua" />
              </th>
              <th rowspan="2" class="p-3 text-left border-b border-outline-variant">Kurikulum</th>
              <th rowspan="2" class="p-3 text-left border-b border-outline-variant">Program Studi</th>
              <th rowspan="2" class="p-3 text-center border-b border-outline-variant">Jenis Kurikulum</th>
              <th rowspan="2" class="p-3 text-left border-b border-outline-variant">Ketua Program Studi</th>
              <th colspan="4" class="px-3 pt-3 pb-2 text-center border-b border-outline-variant">Status Pengisian</th>
              <th rowspan="2" class="p-3 text-center border-b border-outline-variant">Aksi</th>
            </tr>
            <tr>
              <th class="px-3 pb-3 pt-2 text-center border-b border-outline-variant">PL</th>
              <th class="px-3 pb-3 pt-2 text-center border-b border-outline-variant">CPL</th>
              <th class="px-3 pb-3 pt-2 text-center border-b border-outline-variant">PL → CPL</th>
              <th class="px-3 pb-3 pt-2 text-center border-b border-outline-variant">CPL → MK</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-if="loading">
              <td colspan="10" class="p-8 text-center text-on-surface-variant">Memuat data...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="10" class="p-8 text-center text-on-surface-variant">Belum ada kurikulum</td>
            </tr>
            <tr v-for="r in rows" v-else :key="r.id" class="hover:bg-surface-container-low">
              <td class="p-3 text-center"><input type="checkbox" :checked="selected.includes(r.id)" @change="toggle(r.id)" /></td>
              <td class="p-3">
                <div class="font-medium">{{ r.tahunKurikulum ?? '-' }}</div>
                <div class="text-label-sm text-on-surface-variant">{{ r.nama }}</div>
              </td>
              <td class="p-3">
                <div>{{ r.prodi ?? '-' }}</div>
                <div class="text-label-sm text-on-surface-variant">{{ r.jenjang ?? '' }}</div>
              </td>
              <td class="p-3 text-center">
                <span
                  class="inline-flex px-2.5 py-0.5 rounded text-label-sm font-medium"
                  :class="r.isObe ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'"
                  :title="`${r.jumlahMkObe} dari ${r.jumlahMataKuliah} mata kuliah OBE`"
                >
                  {{ r.isObe ? 'OBE' : 'Non OBE' }}
                </span>
              </td>
              <td class="p-3">{{ r.ketuaProdi ?? '-' }}</td>
              <td class="p-3 text-center"><span class="inline-flex min-w-8 justify-center px-2 py-0.5 rounded text-label-sm" :class="warnaJumlah(r.jumlahPl)">{{ r.jumlahPl }}</span></td>
              <td class="p-3 text-center"><span class="inline-flex min-w-8 justify-center px-2 py-0.5 rounded text-label-sm" :class="warnaJumlah(r.jumlahCpl)">{{ r.jumlahCpl }}</span></td>
              <td class="p-3 text-center"><span class="inline-flex min-w-12 justify-center px-2 py-0.5 rounded text-label-sm" :class="warnaPersen(r.plCplPersen)">{{ r.plCplPersen }}%</span></td>
              <td class="p-3 text-center"><span class="inline-flex min-w-12 justify-center px-2 py-0.5 rounded text-label-sm" :class="warnaPersen(r.cplMkPersen)">{{ r.cplMkPersen }}%</span></td>
              <td class="p-3 text-center">
                <button
                  type="button"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary text-on-primary hover:opacity-90"
                  title="Kelola capaian"
                  @click="buka(r)"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">visibility</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

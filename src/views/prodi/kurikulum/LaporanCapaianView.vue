<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import LaporanCplMataKuliah from '@/components/laporan/LaporanCplMataKuliah.vue';
import TranskripObe from '@/components/laporan/TranskripObe.vue';
import {
  laporanCapaianApi,
  type LaporanCplMataKuliah as DataLaporan,
  type MahasiswaLaporan,
  type OpsiKurikulumLaporan,
  type TranskripObe as DataTranskrip,
} from '@/api/laporanCapaian';
import { publicApi } from '@/api/public';
import { extractErrorMessage } from '@/api/http';

/**
 * Prodi → Kurikulum → Laporan Capaian OBE. Jenis laporan: CPL per Mata Kuliah — pilih tahun kurikulum,
 * semua mahasiswa (rata-rata angkatan) atau salah satu mahasiswa, lalu Tampilkan (di halaman) atau
 * Lihat di Tab Baru (versi cetak).
 */
const router = useRouter();

const JENIS_OPTIONS: SelectOption[] = [
  { value: 'CPL_MK', label: 'CPL per Mata Kuliah' },
  { value: 'TRANSKRIP_OBE', label: 'Transkrip OBE' },
];
const jenis = ref<string | number | null>('CPL_MK');

const kurikulumList = ref<OpsiKurikulumLaporan[]>([]);
const kurikulumId = ref<string | number | null>('');
const kurikulum = computed(() => kurikulumList.value.find((k) => k.id === Number(kurikulumId.value)) ?? null);
const kurikulumOptions = computed<SelectOption[]>(() =>
  kurikulumList.value.map((k) => ({ value: k.id, label: `${k.tahunKurikulum ?? '-'} · ${k.prodi ?? k.nama}` })),
);
const angkatan = ref<string | number | null>('');
const angkatanOptions = computed<SelectOption[]>(() => (kurikulum.value?.angkatan ?? []).map((a) => ({ value: a, label: String(a) })));

const modeMahasiswa = ref<'semua' | 'satu'>('semua');
const mahasiswaList = ref<MahasiswaLaporan[]>([]);
const mahasiswaId = ref<string | number | null>('');
const mahasiswaOptions = computed<SelectOption[]>(() => mahasiswaList.value.map((m) => ({ value: m.id, label: `${m.nim} - ${m.nama}` })));
const kop = ref(true);

const error = ref<string | null>(null);
const loading = ref(false);
const data = ref<DataLaporan | null>(null);
const transkrip = ref<DataTranskrip | null>(null);
const kampus = ref<{ namaKampus?: string | null; alamat?: string | null; logoUrl?: string | null } | null>(null);

onMounted(async () => {
  try {
    kurikulumList.value = await laporanCapaianApi.opsi();
    kurikulumId.value = kurikulumList.value[0]?.id ?? '';
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pilihan kurikulum');
  }
  try {
    kampus.value = await publicApi.kampus();
  } catch {
    kampus.value = null;
  }
});

// Ganti kurikulum → angkatan & mahasiswa dipilih ulang.
watch(kurikulumId, () => {
  angkatan.value = kurikulum.value?.angkatan[0] ?? '';
  mahasiswaId.value = '';
  data.value = null;
  transkrip.value = null;
});
// Transkrip OBE umumnya per mahasiswa → pilih "Salah Satu Mahasiswa" otomatis.
watch(jenis, (j) => {
  data.value = null;
  transkrip.value = null;
  if (j === 'TRANSKRIP_OBE') modeMahasiswa.value = 'satu';
});
const muatMahasiswa = async () => {
  mahasiswaList.value = [];
  mahasiswaId.value = '';
  if (modeMahasiswa.value !== 'satu' || !kurikulumId.value) return;
  try {
    mahasiswaList.value = await laporanCapaianApi.mahasiswa({ kurikulumId: Number(kurikulumId.value), angkatan: angkatan.value ? Number(angkatan.value) : null });
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat mahasiswa');
  }
};
watch([modeMahasiswa, angkatan], muatMahasiswa);

const query = () => {
  if (!kurikulumId.value) {
    error.value = 'Pilih tahun kurikulum terlebih dahulu';
    return null;
  }
  if (modeMahasiswa.value === 'satu' && !mahasiswaId.value) {
    error.value = 'Pilih mahasiswa terlebih dahulu';
    return null;
  }
  error.value = null;
  return {
    kurikulumId: Number(kurikulumId.value),
    angkatan: angkatan.value ? Number(angkatan.value) : null,
    mahasiswaId: modeMahasiswa.value === 'satu' ? Number(mahasiswaId.value) : null,
  };
};
const tampilkan = async () => {
  const q = query();
  if (!q) return;
  loading.value = true;
  try {
    if (jenis.value === 'TRANSKRIP_OBE') {
      data.value = null;
      transkrip.value = await laporanCapaianApi.transkripObe(q);
    } else {
      transkrip.value = null;
      data.value = await laporanCapaianApi.cplPerMataKuliah(q);
    }
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat laporan');
  } finally {
    loading.value = false;
  }
};
const tabBaru = () => {
  const q = query();
  if (!q) return;
  const url = router.resolve({
    name: 'prodi-laporan-capaian-cetak',
    query: { jenis: String(jenis.value), kurikulumId: q.kurikulumId, angkatan: q.angkatan ?? undefined, mahasiswaId: q.mahasiswaId ?? undefined, kop: kop.value ? '1' : '0' },
  });
  window.open(url.href, '_blank');
};

const label = 'font-semibold text-primary';
const baris = 'grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 md:items-center px-4 py-3 border-b border-outline-variant';
</script>

<template>
  <div>
    <PageHeader title="Laporan Capaian OBE" subtitle="Prodi / Kurikulum / Laporan Capaian OBE" />

    <section class="bg-surface-container-lowest border border-outline-variant border-t-2 border-t-primary rounded-lg overflow-hidden mb-6 text-body-sm">
      <div :class="baris">
        <span :class="label">Jenis Laporan</span>
        <SelectInput v-model="jenis" :options="JENIS_OPTIONS" :clearable="false" />
      </div>
      <div :class="baris">
        <span :class="label">Tahun Kurikulum<span class="text-error">*</span></span>
        <SearchableSelect v-model="kurikulumId" :options="kurikulumOptions" placeholder="-- Pilih Tahun Kurikulum --" search-placeholder="Ketik tahun / prodi..." />
      </div>
      <div :class="baris">
        <span :class="label">Mahasiswa</span>
        <div class="flex flex-wrap items-center gap-5">
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input v-model="modeMahasiswa" type="radio" value="semua" class="accent-primary" />
            Semua Mahasiswa
          </label>
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input v-model="modeMahasiswa" type="radio" value="satu" class="accent-primary" />
            Salah Satu Mahasiswa
          </label>
        </div>
      </div>
      <div :class="baris">
        <span :class="label">Program Studi</span>
        <div class="px-3 py-2 rounded-md border border-outline-variant bg-surface-container-low">{{ kurikulum?.prodi ?? '-' }}</div>
      </div>
      <div :class="baris">
        <span :class="label">Angkatan</span>
        <SelectInput v-model="angkatan" :options="angkatanOptions" placeholder="-- Semua Angkatan --" />
      </div>
      <div v-if="modeMahasiswa === 'satu'" :class="baris">
        <span :class="label">Nama Mahasiswa<span class="text-error">*</span></span>
        <SearchableSelect
          v-model="mahasiswaId"
          :options="mahasiswaOptions"
          :placeholder="mahasiswaList.length ? '-- Pilih Mahasiswa --' : 'Tidak ada mahasiswa pada angkatan ini'"
          search-placeholder="Ketik NIM / nama..."
        />
      </div>
      <div :class="baris">
        <span :class="label">KOP</span>
        <label class="inline-flex items-center gap-2 cursor-pointer">
          <input v-model="kop" type="checkbox" class="h-4 w-4 accent-primary" />
          Gunakan KOP
        </label>
      </div>
      <div v-if="error" class="mx-4 mt-3 px-3 py-2 rounded-md bg-error-container text-on-error-container">{{ error }}</div>
      <div class="px-4 py-3 flex flex-wrap justify-end gap-2">
        <AppButton icon="visibility" :disabled="loading" @click="tampilkan">{{ loading ? 'Memuat...' : 'Tampilkan' }}</AppButton>
        <AppButton variant="secondary" icon="open_in_new" @click="tabBaru">Lihat di Tab Baru</AppButton>
      </div>
    </section>

    <section v-if="data || transkrip" class="bg-white border border-outline-variant rounded-lg p-4 md:p-6">
      <TranskripObe v-if="transkrip" :data="transkrip" :kop="kop" :kampus="kampus" />
      <LaporanCplMataKuliah v-else-if="data" :data="data" :kop="kop" :kampus="kampus" />
    </section>
  </div>
</template>

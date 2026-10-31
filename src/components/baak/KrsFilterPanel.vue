<script setup lang="ts">
import { onMounted, ref } from 'vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { authApi } from '@/api/auth';
import { publicApi } from '@/api/public';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';
import type { KrsFilter } from './krsFilter';

/**
 * Panel filter KRS Mahasiswa (BAAK & Prodi), format mengikuti "Pembimbing Akademik — Daftar
 * Mahasiswa Bimbingan": Periode Akademik, Unit Kerja (prodi), Status PA, Status KRS, Periode Masuk
 * (angkatan), Sistem Kuliah (golongan kelas), Status Semester, Status Data.
 * `unitKerjaTetap` diisi di modul Prodi: prodi terkunci ke prodi sesi (dibatasi backend /prodi/krs).
 */
const props = defineProps<{ unitKerjaTetap?: string | null }>();
const filter = defineModel<KrsFilter>({ required: true });
const emit = defineEmits<{ change: [] }>();

const STATUS_PA_OPTIONS = [
  { value: 'ADA', label: 'Sudah Ada PA' },
  { value: 'BELUM', label: 'Belum Ada PA' },
];
const STATUS_KRS_OPTIONS = [
  { value: 'BELUM_ISI', label: 'Belum Isi KRS' },
  { value: 'BELUM_DISETUJUI', label: 'KRS Belum Disetujui' },
  { value: 'DISETUJUI', label: 'KRS Disetujui' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'DIAJUKAN', label: 'Diajukan' },
  { value: 'DITOLAK', label: 'Ditolak' },
];
const STATUS_DATA_OPTIONS = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'CUTI', label: 'Cuti' },
  { value: 'TIDAK_AKTIF', label: 'Tidak Aktif / Keluar' },
];
const tahunSekarang = new Date().getFullYear();
const PERIODE_MASUK_OPTIONS = Array.from({ length: 10 }, (_, i) => tahunSekarang - i).map((t) => ({ value: t, label: String(t) }));
const SEMESTER_OPTIONS = Array.from({ length: 14 }, (_, i) => ({ value: i + 1, label: `Semester ${i + 1}` }));

const tahunAjaranOptions = ref<{ value: number; label: string }[]>([]);
const prodiOptions = ref<{ value: string; label: string }[]>([]);
const golonganKelasOptions = ref<{ value: number; label: string }[]>([]);

onMounted(async () => {
  const [tahunAjaran, loginOptions, golonganKelas] = await Promise.allSettled([
    tahunAjaranApi.list({ limit: 100, isActive: true }),
    props.unitKerjaTetap === undefined ? authApi.loginOptions() : Promise.resolve(null),
    publicApi.golonganKelas(),
  ]);
  if (tahunAjaran.status === 'fulfilled') {
    tahunAjaranOptions.value = tahunAjaran.value.data.map((t) => ({ value: t.id, label: formatTahunAjaran(t) }));
  }
  if (loginOptions.status === 'fulfilled' && loginOptions.value) {
    prodiOptions.value = loginOptions.value.prodi.map((p) => ({ value: p.kodeProdi, label: p.nama }));
  }
  if (golonganKelas.status === 'fulfilled') {
    golonganKelasOptions.value = golonganKelas.value.map((g) => ({ value: g.id, label: g.namaKelas }));
  }
});

const onChange = () => emit('change');
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3">
    <div class="grid grid-cols-[150px_1fr] items-center gap-3">
      <span class="text-label-md font-semibold text-primary">Periode Akademik</span>
      <SelectInput v-model="filter.tahunAjaranId" placeholder="-- Semua Periode --" :options="tahunAjaranOptions" @change="onChange" />
    </div>
    <div class="grid grid-cols-[150px_1fr] items-center gap-3">
      <span class="text-label-md font-semibold text-primary">Unit Kerja</span>
      <div
        v-if="unitKerjaTetap !== undefined"
        class="px-3 py-2 border border-outline-variant rounded-md bg-surface-container-low text-body-md text-on-surface"
      >
        {{ unitKerjaTetap || 'Semua Prodi' }}
      </div>
      <SelectInput v-else v-model="filter.kodeProdi" placeholder="-- Semua Unit Kerja --" :options="prodiOptions" @change="onChange" />
    </div>
    <div class="grid grid-cols-[150px_1fr] items-center gap-3">
      <span class="text-label-md font-semibold text-primary">Status Pembimbing</span>
      <SelectInput v-model="filter.statusPa" placeholder="-- Semua Status PA --" :options="STATUS_PA_OPTIONS" @change="onChange" />
    </div>
    <div class="grid grid-cols-[150px_1fr] items-center gap-3">
      <span class="text-label-md font-semibold text-primary">Status KRS</span>
      <SelectInput v-model="filter.status" placeholder="-- Semua Status KRS --" :options="STATUS_KRS_OPTIONS" @change="onChange" />
    </div>
    <div class="grid grid-cols-[150px_1fr] items-center gap-3">
      <span class="text-label-md font-semibold text-primary">Periode Masuk</span>
      <SelectInput v-model="filter.tahunMasuk" placeholder="-- Semua Periode Masuk --" :options="PERIODE_MASUK_OPTIONS" @change="onChange" />
    </div>
    <div class="grid grid-cols-[150px_1fr] items-center gap-3">
      <span class="text-label-md font-semibold text-primary">Sistem Kuliah</span>
      <SelectInput v-model="filter.golonganKelasId" placeholder="-- Semua Sistem Kuliah --" :options="golonganKelasOptions" @change="onChange" />
    </div>
    <div class="grid grid-cols-[150px_1fr] items-center gap-3">
      <span class="text-label-md font-semibold text-primary">Status Semester</span>
      <SelectInput v-model="filter.semester" placeholder="-- Semua Status Semester --" :options="SEMESTER_OPTIONS" @change="onChange" />
    </div>
    <div class="grid grid-cols-[150px_1fr] items-center gap-3">
      <span class="text-label-md font-semibold text-primary">Status Data</span>
      <SelectInput v-model="filter.statusData" placeholder="-- Semua Status Data --" :options="STATUS_DATA_OPTIONS" @change="onChange" />
    </div>
  </div>
</template>

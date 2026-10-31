<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { kelasKuliahApi, type KelasKuliahRow } from '@/api/kelasKuliah';
import { jurusanApi } from '@/api/jurusan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { useProdiContext } from '@/composables/useProdiContext';
import type { TahunAjaran } from '@/types/entities';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';

// Prodi → Perkuliahan → Kelas Kuliah: daftar kelas (jadwal kuliah) per tahun akademik; Detail membuka
// halaman kelas (Detail Kelas, Dosen, Peserta, Nilai Perkuliahan → Komposisi Nilai Kelas, RPS, ...).
const router = useRouter();
const { prodiLocked, prodiPlaceholder, tahunAjaranId: sessionTahunAjaranId } = useProdiContext();

const tahunAjaranList = ref<TahunAjaran[]>([]);
const jurusanOptions = ref<SelectOption[]>([]);
const jurusanId = ref<number | ''>('');
const tahunAjaranId = ref<number | ''>('');
const komposisi = ref<string | number | null>('');
const KOMPOSISI_OPTIONS: SelectOption[] = [
  { value: 'TERISI', label: 'Sudah diisi' },
  { value: 'BELUM', label: 'Belum diisi' },
];

const rows = ref<KelasKuliahRow[]>([]);
const loaded = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const search = ref('');
const page = ref(1);
const pageSize = ref(10);

const tahunAjaranOptions = computed<SelectOption[]>(() => tahunAjaranList.value.map((t) => ({ value: t.id, label: formatTahunAjaran(t) })));

const muat = async () => {
  if (!tahunAjaranId.value) {
    error.value = 'Pilih Tahun Akademik terlebih dahulu';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    rows.value = await kelasKuliahApi.list({ tahunAjaranId: Number(tahunAjaranId.value), jurusanId: jurusanId.value || undefined });
    loaded.value = true;
    page.value = 1;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kelas kuliah');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const [ta, jurusan] = await Promise.all([tahunAjaranApi.list({ limit: 100 }), jurusanApi.listProdi({ limit: 200 })]);
    tahunAjaranList.value = ta.data;
    jurusanOptions.value = jurusan.data.map((j) => ({ value: j.id, label: j.kodeProdi ? `${j.kodeProdi} - ${j.namaJurusan}` : j.namaJurusan }));
    tahunAjaranId.value = ta.data.find((t) => t.id === sessionTahunAjaranId)?.id ?? ta.data.find((t) => t.isActive)?.id ?? ta.data[0]?.id ?? '';
    if (tahunAjaranId.value) muat();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pilihan filter');
  }
});

watch([search, pageSize, komposisi], () => (page.value = 1));
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return rows.value.filter(
    (r) =>
      (!q || [r.kelas, r.kodeMataKuliah, r.namaMataKuliah, r.dosen ?? ''].some((v) => v.toLowerCase().includes(q))) &&
      (!komposisi.value || (komposisi.value === 'TERISI') === r.komposisiTerisi),
  );
});
const meta = computed(() => ({
  total: filtered.value.length,
  page: page.value,
  limit: pageSize.value,
  totalPages: Math.max(1, Math.ceil(filtered.value.length / pageSize.value)),
}));
const pageItems = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const rowNo = (i: number) => (page.value - 1) * pageSize.value + i + 1;
</script>

<template>
  <div>
    <PageHeader title="Kelas Kuliah" subtitle="Daftar kelas kuliah per tahun akademik beserta komposisi nilai kelas." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 md:items-end">
          <SelectInput
            v-model="jurusanId"
            label="Prodi"
            :options="jurusanOptions"
            :placeholder="prodiPlaceholder('-- Semua Prodi --')"
            :disabled="prodiLocked"
          />
          <SelectInput v-model="tahunAjaranId" label="Tahun Akademik" required :options="tahunAjaranOptions" placeholder="-- Pilih Tahun Akademik --" />
          <SelectInput v-model="komposisi" label="Komposisi Nilai" :options="KOMPOSISI_OPTIONS" placeholder="-- Semua --" />
          <div>
            <AppButton icon="search" :disabled="loading" @click="muat">Tampilkan</AppButton>
          </div>
        </div>
      </div>

      <div class="p-4 border-b border-outline-variant flex flex-col lg:flex-row lg:items-center gap-3">
        <PageSizeSelect v-model="pageSize" />
        <div class="lg:ml-auto">
          <SearchInput v-model="search" placeholder="Cari kelas, kode / nama MK, dosen..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] border-b border-outline-variant text-label-md text-primary font-semibold">
            <tr>
              <th class="p-4 text-center">No</th>
              <th class="p-4">Kode MK</th>
              <th class="p-4">Mata Kuliah</th>
              <th class="p-4">Kelas</th>
              <th class="p-4 text-center">SKS</th>
              <th class="p-4 text-center">Smt</th>
              <th class="p-4">Dosen Koordinator</th>
              <th class="p-4 text-center">Peserta</th>
              <th class="p-4 text-center">Komposisi Nilai</th>
              <th class="p-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-if="loading">
              <td colspan="10" class="p-8 text-center text-on-surface-variant">Memuat data...</td>
            </tr>
            <tr v-else-if="!loaded">
              <td colspan="10" class="p-8 text-center text-on-surface-variant">Pilih Tahun Akademik, lalu klik Tampilkan</td>
            </tr>
            <tr v-else-if="!pageItems.length">
              <td colspan="10" class="p-8 text-center text-on-surface-variant">Tidak ada kelas kuliah</td>
            </tr>
            <tr v-for="(r, i) in pageItems" v-else :key="r.id" class="hover:bg-surface-container transition-colors">
              <td class="p-4 text-center tabular-nums">{{ rowNo(i) }}</td>
              <td class="p-4 whitespace-nowrap">{{ r.kodeMataKuliah }}</td>
              <td class="p-4">
                {{ r.namaMataKuliah }}
                <span v-if="r.isObe" class="ml-1 px-1.5 py-0.5 rounded bg-primary text-on-primary text-label-sm">OBE</span>
                <span v-if="r.tahunKurikulum" class="block text-label-sm text-on-surface-variant">Kurikulum {{ r.tahunKurikulum }}</span>
              </td>
              <td class="p-4 whitespace-nowrap font-medium">{{ r.kelas }}</td>
              <td class="p-4 text-center tabular-nums">{{ r.sks ?? '-' }}</td>
              <td class="p-4 text-center tabular-nums">{{ r.semester ?? '-' }}</td>
              <td class="p-4">{{ r.dosen ?? '-' }}</td>
              <td class="p-4 text-center tabular-nums">{{ r.peserta }}</td>
              <td class="p-4 text-center">
                <span
                  class="inline-flex px-2 py-0.5 rounded-full text-label-sm"
                  :class="r.komposisiTerisi ? 'bg-[#059669]/15 text-[#05603a]' : 'bg-surface-container text-on-surface-variant'"
                >
                  {{ r.komposisiTerisi ? 'Sudah diisi' : 'Belum diisi' }}
                </span>
              </td>
              <td class="p-4 text-center">
                <AppButton variant="secondary" icon="visibility" @click="router.push({ name: 'prodi-kelas-kuliah-detail', params: { id: r.id } })">
                  Detail
                </AppButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination v-if="loaded && !loading && filtered.length" v-model="page" :meta="meta" />
    </section>
  </div>
</template>

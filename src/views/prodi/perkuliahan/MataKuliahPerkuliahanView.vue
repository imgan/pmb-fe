<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { matakuliahAktifApi, type MatakuliahAktifResult } from '@/api/kurikulum';
import { jurusanApi } from '@/api/jurusan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { useProdiContext } from '@/composables/useProdiContext';
import type { TahunAjaran } from '@/types/entities';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';

// Prodi → Perkuliahan → Mata Kuliah: salinan Master Matakuliah Aktif tanpa filter Tahun/Semester Kurikulum &
// Aktif Semester dan tanpa aktivasi — menampilkan semua mata kuliah prodi (yang aktif di tahun akademik
// terpilih didahulukan) dengan kolom Status aktif/tidak, beserta tombol RPS. Aktivasi tetap lewat
// Kurikulum → Matakuliah Aktif.
const { prodiLocked, prodiPlaceholder, tahunAjaranId: sessionTahunAjaranId } = useProdiContext();

const tahunAjaranList = ref<TahunAjaran[]>([]);
const jurusanOptions = ref<SelectOption[]>([]);
const jurusanId = ref<number | ''>('');
const tahunAjaranId = ref<number | ''>('');

const search = ref('');
const result = ref<MatakuliahAktifResult>({ rows: [], ringkasan: [] });
const applied = ref<{ tahunAjaranId: number } | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const page = ref(1);
const pageSize = ref(10);

const tahunAjaranOptions = computed<SelectOption[]>(() => tahunAjaranList.value.map((t) => ({ value: t.id, label: formatTahunAjaran(t) })));
const appliedLabel = computed(() => {
  const ta = tahunAjaranList.value.find((t) => t.id === applied.value?.tahunAjaranId);
  return ta ? formatTahunAjaran(ta) : '';
});

const handlePeriksa = async () => {
  if (!tahunAjaranId.value) {
    error.value = 'Pilih Aktif Tahun Akademik terlebih dahulu';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    result.value = await matakuliahAktifApi.list({
      tahunAjaranId: Number(tahunAjaranId.value),
      jurusanId: jurusanId.value || undefined,
    });
    applied.value = { tahunAjaranId: Number(tahunAjaranId.value) };
    page.value = 1;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data mata kuliah');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const [tahunAjaranResult, jurusanResult] = await Promise.all([tahunAjaranApi.list({ limit: 100 }), jurusanApi.listProdi({ limit: 200 })]);
    tahunAjaranList.value = tahunAjaranResult.data;
    jurusanOptions.value = jurusanResult.data.map((j) => ({ value: j.id, label: j.kodeProdi ? `${j.kodeProdi} - ${j.namaJurusan}` : j.namaJurusan }));
    tahunAjaranId.value =
      tahunAjaranResult.data.find((t) => t.id === sessionTahunAjaranId)?.id ??
      tahunAjaranResult.data.find((t) => t.isActive)?.id ??
      tahunAjaranResult.data[0]?.id ??
      '';
    if (tahunAjaranId.value) handlePeriksa();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pilihan filter');
  }
});

watch([search, pageSize], () => (page.value = 1));

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  // Yang aktif di tahun akademik terpilih didahulukan (urutan asal dipertahankan).
  const rows = [...result.value.rows].sort((a, b) => Number(b.aktif) - Number(a.aktif));
  if (!q) return rows;
  return rows.filter((r) => [r.kode, r.mataKuliah].some((v) => v.toLowerCase().includes(q)));
});
const meta = computed(() => ({
  total: filtered.value.length,
  page: page.value,
  limit: pageSize.value,
  totalPages: Math.max(1, Math.ceil(filtered.value.length / pageSize.value)),
}));
const pageItems = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const rowNo = (index: number) => (page.value - 1) * pageSize.value + index + 1;
</script>

<template>
  <div>
    <PageHeader title="Mata Kuliah" subtitle="Daftar mata kuliah yang aktif pada tahun akademik terpilih beserta RPS-nya." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:items-end">
          <SelectInput
            v-model="jurusanId"
            label="Prodi"
            :options="jurusanOptions"
            :placeholder="prodiPlaceholder('-- Semua Prodi --')"
            :disabled="prodiLocked"
          />
          <SelectInput v-model="tahunAjaranId" label="Aktif Tahun Akademik" required :options="tahunAjaranOptions" placeholder="-- Pilih Tahun Akademik --" />
          <div>
            <AppButton icon="search" :disabled="loading" @click="handlePeriksa">Periksa</AppButton>
          </div>
        </div>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        Semua Data Mata Kuliah{{ applied ? ` — ${appliedLabel}` : '' }}
      </div>

      <div v-if="applied" class="px-4 py-3 border-b border-outline-variant">
        <p class="text-label-md text-on-surface-variant mb-2">Tahun kurikulum yang berjalan di tahun akademik ini</p>
        <div v-if="result.ringkasan.length" class="flex flex-wrap gap-2">
          <span
            v-for="r in result.ringkasan"
            :key="r.tahunKurikulum ?? 'none'"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-container text-on-primary-container text-label-md"
          >
            {{ r.tahunKurikulum ? `Kurikulum ${r.tahunKurikulum}` : 'Tanpa tahun kurikulum' }}
            <span class="font-semibold tabular-nums">{{ r.jumlah }} MK</span>
            <span class="text-label-sm opacity-80">smt {{ r.semesters.join(', ') }}</span>
          </span>
        </div>
        <p v-else class="text-body-sm text-on-surface-variant">Belum ada mata kuliah yang diaktifkan.</p>
      </div>

      <div class="p-4 border-b border-outline-variant flex flex-col lg:flex-row lg:items-center gap-3">
        <PageSizeSelect v-model="pageSize" />
        <div class="lg:ml-auto">
          <SearchInput v-model="search" placeholder="Search..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] border-b border-outline-variant text-label-md text-primary font-semibold">
            <tr>
              <th class="p-4 text-center">No</th>
              <th class="p-4">Kode Matakuliah</th>
              <th class="p-4">Nama Matakuliah</th>
              <th class="p-4 text-center">SKS Teori</th>
              <th class="p-4 text-center">SKS Praktek</th>
              <th class="p-4 text-center">SKS Lab</th>
              <th class="p-4 text-center">SKS Total</th>
              <th class="p-4 text-center">Semester</th>
              <th class="p-4 text-center">Kurikulum</th>
              <th class="p-4 text-center">Status</th>
              <th class="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant text-on-surface">
            <tr v-if="loading">
              <td colspan="11" class="p-8 text-center text-on-surface-variant">Memuat data...</td>
            </tr>
            <tr v-else-if="!applied">
              <td colspan="11" class="p-8 text-center text-on-surface-variant">Pilih Aktif Tahun Akademik, lalu klik Periksa</td>
            </tr>
            <tr v-else-if="!pageItems.length">
              <td colspan="11" class="p-8 text-center text-on-surface-variant">Tidak ada mata kuliah</td>
            </tr>
            <tr v-for="(item, index) in pageItems" v-else :key="item.id" class="hover:bg-surface-container transition-colors">
              <td class="p-4 text-center tabular-nums">{{ rowNo(index) }}</td>
              <td class="p-4 whitespace-nowrap">{{ item.kode }}</td>
              <td class="p-4">
                {{ item.mataKuliah }}
                <span v-if="item.aktif" class="block text-label-sm text-on-surface-variant">Aktif di semester {{ item.aktifSemesters.join(', ') }}</span>
              </td>
              <td class="p-4 text-center tabular-nums">{{ item.sksTeori }}</td>
              <td class="p-4 text-center tabular-nums">{{ item.sksPraktek }}</td>
              <td class="p-4 text-center tabular-nums">{{ item.sksLab }}</td>
              <td class="p-4 text-center tabular-nums">{{ item.sksTotal }}</td>
              <td class="p-4 text-center tabular-nums">{{ item.semester ?? '-' }}</td>
              <td class="p-4 text-center tabular-nums">{{ item.tahunKurikulum ?? '-' }}</td>
              <td class="p-4 text-center">
                <span
                  class="inline-flex px-2.5 py-0.5 rounded-full text-label-sm font-medium whitespace-nowrap"
                  :class="item.aktif ? 'bg-[#059669]/15 text-[#05603a]' : 'bg-surface-container text-on-surface-variant'"
                  :title="item.aktif ? 'Aktif di tahun akademik ini' : 'Belum diaktifkan di Kurikulum → Matakuliah Aktif'"
                >
                  {{ item.aktif ? 'Aktif' : 'Tidak Aktif' }}
                </span>
                <span v-if="item.jumlahJadwal" class="block mt-1 text-label-sm text-on-surface-variant">{{ item.jumlahJadwal }} kelas</span>
              </td>
              <td class="p-4 text-center">
                <RouterLink
                  :to="{ name: 'prodi-perkuliahan-mata-kuliah-rps', params: { id: item.id }, query: { periode: applied?.tahunAjaranId } }"
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-primary text-primary text-label-md font-medium hover:bg-primary-container"
                  title="Pemetaan CPL & CPMK, Detail RPS, Rencana Pembelajaran & Evaluasi"
                >
                  <span class="material-symbols-outlined" style="font-size: 16px">menu_book</span>
                  RPS
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination v-if="applied && !loading && filtered.length" v-model="page" :meta="meta" />
    </section>
  </div>
</template>

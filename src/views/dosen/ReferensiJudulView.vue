<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import { dosenReferensiJudulApi, type ReferensiJudul } from '@/api/referensiJudul';
import { extractErrorMessage } from '@/api/http';

/**
 * Lain-Lain → Referensi Judul: judul TA/Skripsi input mahasiswa — Pengajuan TA yang disetujui prodi
 * (judul Yudisium bila sudah yudisium); lihat saja, per prodi & periode.
 */
const prodiOptions = ref<{ value: number; label: string }[]>([]);
const periodeOptions = ref<{ value: number; label: string }[]>([]);
const prodi = ref<number | string | null>('');
const periode = ref<number | string | null>('');
const items = ref<ReferensiJudul[]>([]);
const sudahTampil = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const search = ref('');

onMounted(async () => {
  try {
    const f = await dosenReferensiJudulApi.filter();
    prodiOptions.value = f.prodi;
    periodeOptions.value = f.periode;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pilihan prodi & periode');
  }
});

const tampilkan = async () => {
  loading.value = true;
  error.value = null;
  try {
    items.value = await dosenReferensiJudulApi.list({
      jurusanId: prodi.value ? Number(prodi.value) : null,
      tahunAjaranId: periode.value ? Number(periode.value) : null,
    });
    sudahTampil.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat referensi judul');
  } finally {
    loading.value = false;
  }
};

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return items.value;
  return items.value.filter((r) => [r.nim, r.nama, r.judul].some((v) => v.toLowerCase().includes(q)));
});

// Paginasi di sisi klien (data satu prodi/periode sudah dimuat sekaligus).
const page = ref(1);
const limit = ref(10);
const meta = computed(() => ({
  total: filtered.value.length,
  page: page.value,
  limit: limit.value,
  totalPages: Math.max(1, Math.ceil(filtered.value.length / limit.value)),
}));
const paged = computed(() => filtered.value.slice((page.value - 1) * limit.value, page.value * limit.value));
watch([search, limit, items], () => {
  page.value = 1;
});
</script>

<template>
  <div>
    <PageHeader title="Form Referensi Judul" subtitle="Dosen / Bimbingan / Referensi Judul TA" />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 md:items-end bg-surface-bright">
        <div class="w-full md:w-64">
          <SelectInput v-model="prodi" label="Prodi" placeholder="Semua Prodi" :options="prodiOptions" />
        </div>
        <div class="w-full md:w-64">
          <SelectInput v-model="periode" label="Periode" placeholder="Semua Periode" :options="periodeOptions" />
        </div>
        <AppButton icon="search" :disabled="loading" @click="tampilkan">{{ loading ? 'Memuat...' : 'Tampilkan' }}</AppButton>
        <div v-if="sudahTampil" class="w-full md:w-72 md:ml-auto">
          <SearchInput v-model="search" placeholder="Cari NIM, nama, atau judul..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div v-if="!sudahTampil" class="p-6 text-center text-body-sm text-on-surface-variant">
        Pilih prodi dan periode, lalu klik Tampilkan untuk melihat referensi judul.
      </div>
      <div v-else-if="!filtered.length" class="p-6 text-center text-body-sm text-on-surface-variant">Belum ada referensi judul.</div>
      <div v-else class="overflow-x-auto">
        <div class="px-4 py-3 border-b border-outline-variant">
          <PageSizeSelect v-model="limit" />
        </div>
        <table class="w-full text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-3 text-center w-12">No</th>
              <th class="p-3 text-left">NIM</th>
              <th class="p-3 text-left">Nama</th>
              <th class="p-3 text-left">Judul</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant align-top">
            <tr v-for="(r, i) in paged" :key="r.id">
              <td class="p-3 text-center">{{ (page - 1) * limit + i + 1 }}</td>
              <td class="p-3 whitespace-nowrap">{{ r.nim }}</td>
              <td class="p-3 min-w-40">{{ r.nama }}</td>
              <td class="p-3 min-w-80 text-on-surface">{{ r.judul }}</td>
            </tr>
          </tbody>
        </table>
        <Pagination v-model="page" :meta="meta" />
      </div>
    </section>
  </div>
</template>

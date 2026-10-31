<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { useRouter } from 'vue-router';
import { dosenJadwalApi } from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import type { DosenPortalJadwal } from '@/types/entities';

/**
 * Perkuliahan → Kelas Kuliah: kelas yang diampu dosen pada tahun akademik terpilih. Detail membuka halaman
 * kelas (sama dengan Prodi → Kelas Kuliah): Detail Kelas, Dosen Pengajar, Peserta, Jadwal Perkuliahan
 * (detail per sesi), Nilai Perkuliahan, RPS, ... — hanya lihat.
 */
const items = ref<DosenPortalJadwal[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const search = ref('');

onMounted(async () => {
  try {
    items.value = await dosenJadwalApi.listMine();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kelas');
  } finally {
    loading.value = false;
  }
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? items.value.filter((k) => [k.kelas, k.kodeMataKuliah, k.namaMataKuliah].some((v) => v?.toLowerCase().includes(q))) : items.value;
});

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const formatJadwal = (hari?: string[] | null, jam?: number | null) => {
  const h = (hari ?? []).map(titleCase).join(', ');
  return [h, jam ? `Jam ke-${jam}` : ''].filter(Boolean).join(', ') || '-';
};

// ---- Detail: halaman kelas ----
const router = useRouter();
const openDetail = (k: DosenPortalJadwal) => router.push({ name: 'dosen-kelas-kuliah-detail', params: { id: k.id }, query: { menu: 'detail' } });
</script>

<template>
  <div>
    <PageHeader title="Kelas Kuliah" subtitle="Dosen / Perkuliahan / Kelas Kuliah" />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p class="text-body-sm text-on-surface-variant">
          Kelas yang Anda ampu pada tahun akademik terpilih. Klik <strong class="text-on-surface">Detail</strong> untuk melihat detail kelas, jadwal perkuliahan per sesi, peserta & nilai.
        </p>
        <div class="w-full md:w-72 [&>div]:!w-full">
          <SearchInput v-model="search" placeholder="Cari kelas / mata kuliah..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div v-else-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat kelas...</div>
      <div v-else-if="!filtered.length" class="p-8 text-center text-body-sm text-on-surface-variant">Belum ada kelas yang diampu.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-surface-container text-on-surface-variant text-label-md">
            <tr>
              <th class="px-4 py-3 w-12 text-center">No</th>
              <th class="px-4 py-3">Mata Kuliah</th>
              <th class="px-4 py-3">Kelas</th>
              <th class="px-4 py-3 text-center">SKS</th>
              <th class="px-4 py-3">Jadwal</th>
              <th class="px-4 py-3">Ruang</th>
              <th class="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="(k, i) in filtered" :key="k.id" class="hover:bg-surface-container-low">
              <td class="px-4 py-3 text-center">{{ i + 1 }}</td>
              <td class="px-4 py-3">
                <span class="font-medium text-on-surface">{{ k.namaMataKuliah }}</span>
                <span class="block text-label-sm text-on-surface-variant">{{ k.kodeMataKuliah }}</span>
              </td>
              <td class="px-4 py-3">{{ k.kelas }}</td>
              <td class="px-4 py-3 text-center tabular-nums">{{ k.sks ?? '-' }}</td>
              <td class="px-4 py-3 whitespace-nowrap">{{ formatJadwal(k.hari, k.jam) }}</td>
              <td class="px-4 py-3">{{ k.ruangan ?? '-' }}</td>
              <td class="px-4 py-3 text-center">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-primary text-primary text-label-md hover:bg-surface-container"
                  @click="openDetail(k)"
                >
                  <span class="material-symbols-outlined" style="font-size: 18px">visibility</span>
                  Detail
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

  </div>
</template>

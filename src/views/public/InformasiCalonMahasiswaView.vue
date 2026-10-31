<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PublicHeader from '@/components/public/PublicHeader.vue';
import PublicFooter from '@/components/public/PublicFooter.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import { publicApi } from '@/api/public';
import { useCrudPage } from '@/composables/useCrudPage';
import type { CalonMahasiswa, CalonMahasiswaStats } from '@/types/entities';

const { items, meta, page, limit, search, loading, error, fetchItems } = useCrudPage<CalonMahasiswa>({
  fetchList: publicApi.calonMahasiswa,
  remove: () => Promise.resolve(),
});

fetchItems();

const stats = ref<CalonMahasiswaStats>({
  totalPendaftar: 0,
  diterimaKuliah: 0,
  ditolak: 0,
  jalurBeasiswa: 0,
  beasiswaDiterima: 0,
});
onMounted(async () => {
  try {
    stats.value = await publicApi.calonMahasiswaStats();
  } catch {
    // stat cards stay at zero if this fails; the table below still loads independently
  }
});

const columns: DataTableColumn[] = [
  { key: 'nama', label: 'Nama' },
  { key: 'asalSekolah', label: 'Asal Sekolah' },
  { key: 'prodi', label: 'Prodi' },
  { key: 'skemaPembiayaan', label: 'Skema Pembiayaan', align: 'center' },
  { key: 'formulirPendaftaran', label: 'Formulir Pendaftaran', align: 'center' },
  { key: 'lulusTesMasuk', label: 'Lulus Tes Masuk', align: 'center' },
  { key: 'akunBeasiswa', label: 'Akun Beasiswa', align: 'center' },
  { key: 'kelengkapanPersyaratan', label: 'Kelengkapan Persyaratan', align: 'center' },
  { key: 'statusBeasiswa', label: 'Status Beasiswa', align: 'center' },
  { key: 'statusKuliah', label: 'Status Kuliah', align: 'center' },
];

const statusKuliahLabel = (item: CalonMahasiswa) =>
  ({ menunggu: 'Menunggu', diterima: 'Diterima', ditolak: 'Ditolak' })[item.statusKuliah];
const statusKuliahVariant = (item: CalonMahasiswa) =>
  ({ menunggu: 'warning', diterima: 'success', ditolak: 'danger' })[item.statusKuliah] as
    | 'warning'
    | 'success'
    | 'danger';

const statusBeasiswaLabel = (item: CalonMahasiswa) =>
  item.statusBeasiswa
    ? ({ diusulkan: 'Diusulkan', disetujui: 'Disetujui', ditolak: 'Ditolak' })[item.statusBeasiswa]
    : '-';
const statusBeasiswaVariant = (item: CalonMahasiswa) =>
  (item.statusBeasiswa
    ? ({ diusulkan: 'warning', disetujui: 'success', ditolak: 'danger' })[item.statusBeasiswa]
    : 'neutral') as 'warning' | 'success' | 'danger' | 'neutral';

const shareCandidate = (item: CalonMahasiswa) => {
  const statusText =
    item.statusKuliah === 'diterima'
      ? 'Selamat! Anda dinyatakan DITERIMA sebagai mahasiswa baru.'
      : item.statusKuliah === 'ditolak'
        ? 'Mohon maaf, pendaftaran Anda belum dapat kami terima kali ini.'
        : 'Pendaftaran Anda masih dalam proses peninjauan.';
  const message = `Halo ${item.nama}, berikut update status pendaftaran PMB Anda di program studi ${item.prodi}:\n\n${statusText}`;
  const phone = item.noTelepon?.replace(/[^0-9]/g, '');
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <PublicHeader />

    <main class="flex-1 py-12 md:py-16 px-4 md:px-12 max-w-7xl mx-auto w-full">
      <div class="text-center mb-10">
        <h2 class="text-label-md font-semibold text-primary tracking-[0.2em] uppercase mb-2">Informasi</h2>
        <h1 class="text-headline-lg-mobile md:text-headline-lg font-semibold text-on-background">
          Data Calon Mahasiswa
        </h1>
        <p class="text-body-md text-on-surface-variant mt-2 max-w-2xl mx-auto">
          Daftar calon mahasiswa beserta status kelengkapan persyaratan dan hasil penerimaan &mdash; PMB Politeknik
          Bhakti Kartini.
        </p>
      </div>

      <section class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div class="bg-surface-container-lowest border-t-4 border border-outline-variant rounded-lg p-4 text-center" style="border-top-color: var(--color-primary)">
          <p class="font-bold text-headline-lg text-on-surface">{{ stats.totalPendaftar }}</p>
          <p class="text-label-sm text-on-surface-variant mt-1">Total Pendaftar</p>
        </div>
        <div class="bg-surface-container-lowest border-t-4 border border-outline-variant rounded-lg p-4 text-center" style="border-top-color: var(--color-success)">
          <p class="font-bold text-headline-lg text-on-surface">{{ stats.diterimaKuliah }}</p>
          <p class="text-label-sm text-on-surface-variant mt-1">Diterima Kuliah</p>
        </div>
        <div class="bg-surface-container-lowest border-t-4 border border-outline-variant rounded-lg p-4 text-center" style="border-top-color: var(--color-error)">
          <p class="font-bold text-headline-lg text-on-surface">{{ stats.ditolak }}</p>
          <p class="text-label-sm text-on-surface-variant mt-1">Ditolak</p>
        </div>
        <div class="bg-surface-container-lowest border-t-4 border border-outline-variant rounded-lg p-4 text-center" style="border-top-color: var(--color-primary)">
          <p class="font-bold text-headline-lg text-on-surface">{{ stats.jalurBeasiswa }}</p>
          <p class="text-label-sm text-on-surface-variant mt-1">Jalur Beasiswa</p>
        </div>
        <div class="bg-surface-container-lowest border-t-4 border border-outline-variant rounded-lg p-4 text-center" style="border-top-color: var(--color-warning)">
          <p class="font-bold text-headline-lg text-on-surface">{{ stats.beasiswaDiterima }}</p>
          <p class="text-label-sm text-on-surface-variant mt-1">Beasiswa Diterima</p>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="p-4 border-b border-outline-variant bg-surface-bright flex flex-col gap-2">
          <SearchInput v-model="search" placeholder="Cari nama siswa atau asal sekolah..." />
          <p class="text-label-sm text-on-surface-variant">Menampilkan {{ items.length }} dari {{ meta.total }} data</p>
        </div>

        <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

        <div class="px-4 py-3 border-b border-outline-variant">
          <PageSizeSelect v-model="limit" />
        </div>

        <DataTable :columns="columns" :items="items" :loading="loading" empty-message="Belum ada data calon mahasiswa">
          <template #cell-skemaPembiayaan="{ item }">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-label-sm"
              :class="item.skemaPembiayaan === 'beasiswa' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant'"
            >
              {{ item.skemaPembiayaan === 'beasiswa' ? 'Beasiswa' : 'Mandiri' }}
            </span>
          </template>
          <template #cell-formulirPendaftaran="{ item }">
            <span class="material-symbols-outlined" :class="item.formulirPendaftaran ? 'text-success' : 'text-error'">
              {{ item.formulirPendaftaran ? 'check_circle' : 'cancel' }}
            </span>
          </template>
          <template #cell-lulusTesMasuk="{ item }">
            <span class="material-symbols-outlined" :class="item.lulusTesMasuk ? 'text-success' : 'text-error'">
              {{ item.lulusTesMasuk ? 'check_circle' : 'cancel' }}
            </span>
          </template>
          <template #cell-akunBeasiswa="{ item }">
            <span v-if="item.akunBeasiswa === null" class="text-on-surface-variant text-label-sm">N/A</span>
            <span v-else class="material-symbols-outlined" :class="item.akunBeasiswa ? 'text-success' : 'text-error'">
              {{ item.akunBeasiswa ? 'check_circle' : 'cancel' }}
            </span>
          </template>
          <template #cell-kelengkapanPersyaratan="{ item }">
            <span class="material-symbols-outlined" :class="item.kelengkapanPersyaratan ? 'text-success' : 'text-error'">
              {{ item.kelengkapanPersyaratan ? 'check_circle' : 'cancel' }}
            </span>
          </template>
          <template #cell-statusBeasiswa="{ item }">
            <span v-if="!item.statusBeasiswa" class="text-on-surface-variant">-</span>
            <span
              v-else
              class="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-label-sm"
              :class="{
                'bg-warning-container text-on-warning-container': statusBeasiswaVariant(item) === 'warning',
                'bg-success-container text-on-success-container': statusBeasiswaVariant(item) === 'success',
                'bg-danger-container text-on-danger-container': statusBeasiswaVariant(item) === 'danger',
              }"
            >
              {{ statusBeasiswaLabel(item) }}
            </span>
          </template>
          <template #cell-statusKuliah="{ item }">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-label-sm"
              :class="{
                'bg-warning-container text-on-warning-container': statusKuliahVariant(item) === 'warning',
                'bg-success-container text-on-success-container': statusKuliahVariant(item) === 'success',
                'bg-danger-container text-on-danger-container': statusKuliahVariant(item) === 'danger',
              }"
            >
              {{ statusKuliahLabel(item) }}
            </span>
          </template>
          <template #actions="{ item }">
            <button
              type="button"
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-on-primary text-label-sm font-medium hover:opacity-90 transition-opacity"
              title="Bagikan status via WhatsApp"
              @click="shareCandidate(item)"
            >
              <span class="material-symbols-outlined" style="font-size: 16px">share</span>
              Share
            </button>
          </template>
        </DataTable>

        <Pagination v-model="page" :meta="meta" />
      </section>
    </main>

    <PublicFooter />
  </div>
</template>

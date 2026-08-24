<script setup lang="ts">
import { computed, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import TextInput from '@/components/ui/TextInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { krsApi } from '@/api/krs';
import { extractErrorMessage } from '@/api/http';
import type { HariKuliah, Krs, StatusKrs } from '@/types/entities';

const STATUS_LABELS: Record<StatusKrs, string> = {
  DRAFT: 'Draft',
  DIAJUKAN: 'Diajukan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
};
const STATUS_VARIANT: Record<StatusKrs, 'success' | 'warning' | 'danger' | 'neutral'> = {
  DRAFT: 'neutral',
  DIAJUKAN: 'warning',
  DISETUJUI: 'success',
  DITOLAK: 'danger',
};

const HARI_LABELS: Record<HariKuliah, string> = {
  SENIN: 'Senin',
  SELASA: 'Selasa',
  RABU: 'Rabu',
  KAMIS: 'Kamis',
  JUMAT: 'Jumat',
  SABTU: 'Sabtu',
};

const nim = ref('');
const namaMahasiswa = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const searched = ref(false);
const krsResults = ref<Krs[]>([]);

interface FrsRow {
  id: number;
  nim: string;
  namaLengkap: string;
  kelas: string;
  mataKuliah: string;
  status: StatusKrs;
  waktuKuliah: string;
}

const rows = computed<FrsRow[]>(() =>
  krsResults.value.flatMap((krs) =>
    (krs.detailList ?? []).map((detail) => {
      const kelasKuliah = detail.kelasKuliah;
      const hari = (kelasKuliah?.hari ?? []).map((h) => HARI_LABELS[h]).join(', ');
      const waktuKuliah = kelasKuliah ? [hari, kelasKuliah.jam ? `Jam ke-${kelasKuliah.jam}` : ''].filter(Boolean).join(' - ') : '-';
      return {
        id: detail.id,
        nim: krs.mahasiswa?.nim ?? '-',
        namaLengkap: krs.mahasiswa?.namaLengkap ?? '-',
        kelas: kelasKuliah?.kelas ?? '-',
        mataKuliah: kelasKuliah?.namaMataKuliah ?? '-',
        status: krs.status,
        waktuKuliah: waktuKuliah || '-',
      };
    })
  )
);

const columns: DataTableColumn[] = [
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'statusKuliah', label: 'Status Kuliah', align: 'center' },
  { key: 'waktuKuliah', label: 'Waktu Kuliah' },
];

const handlePeriksa = async () => {
  if (!nim.value.trim() && !namaMahasiswa.value.trim()) {
    error.value = 'Isi NIM atau Nama Mahasiswa terlebih dahulu';
    return;
  }
  loading.value = true;
  error.value = null;
  searched.value = true;
  try {
    const result = await krsApi.list({
      nim: nim.value.trim() || undefined,
      namaMahasiswa: namaMahasiswa.value.trim() || undefined,
      limit: 200,
    });
    krsResults.value = result.data;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memeriksa data FRS');
    krsResults.value = [];
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Master Frs" subtitle="Periksa Formulir Rencana Studi (FRS) mahasiswa berdasarkan NIM atau nama." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <form class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3" @submit.prevent="handlePeriksa">
        <div class="w-full md:w-64">
          <TextInput v-model="nim" placeholder="NIM Mahasiswa" />
        </div>
        <div class="w-full md:w-64">
          <TextInput v-model="namaMahasiswa" placeholder="Nama Mahasiswa" />
        </div>
        <AppButton type="submit" icon="search" :disabled="loading">{{ loading ? 'Memeriksa...' : 'Periksa' }}</AppButton>
      </form>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Master Frs</div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        :show-actions="false"
        :empty-message="searched ? 'Tidak ada data FRS untuk pencarian ini' : 'Masukkan NIM atau nama mahasiswa lalu klik Periksa'"
      >
        <template #cell-nama="{ item }">
          <p class="font-medium text-on-surface">{{ item.namaLengkap }}</p>
          <p class="text-on-surface-variant">{{ item.mataKuliah }}</p>
        </template>
        <template #cell-statusKuliah="{ item }">
          <StatusBadge :label="STATUS_LABELS[item.status]" :variant="STATUS_VARIANT[item.status]" />
        </template>
      </DataTable>
    </section>
  </div>
</template>

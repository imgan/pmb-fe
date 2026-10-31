<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { mahasiswaApi } from '@/api/mahasiswa';
import { krsApi } from '@/api/krs';
import { extractErrorMessage } from '@/api/http';
import { useCrudPage } from '@/composables/useCrudPage';
import { toastError, toastSuccess } from '@/utils/swal';
import type { Krs, Mahasiswa, StatusKeluarMahasiswa, StatusMasukMahasiswa } from '@/types/entities';

const STATUS_MASUK_LABELS: Record<StatusMasukMahasiswa, string> = {
  BARU: 'Baru',
  TRANSFER_LUAR: 'Transfer Luar',
  TRANSFER_DALAM: 'Transfer Dalam',
  TRANSFER_LUAR_KARYAWAN: 'Transfer Luar Karyawan',
  TRANSFER_DALAM_KARYAWAN: 'Transfer Dalam Karyawan',
};

const { items, meta, page, limit, search, loading, error, sortBy, sortDir, handleSort, fetchItems } = useCrudPage<Mahasiswa>({
  fetchList: mahasiswaApi.list,
  remove: async () => {},
  extraQuery: () => ({ isActive: true }),
});

fetchItems();

const columns: DataTableColumn[] = [
  { key: 'nim', label: 'Nim' },
  { key: 'namaLengkap', label: 'Nama' },
  { key: 'statusMasuk', label: 'Status' },
  { key: 'kontak', label: 'No. Telp/ Email' },
  { key: 'aktifitas', label: 'aktifitas', align: 'center' },
];

// ---- Popup "Informasi Aktifitas Mahasiswa" ----
// Opsi keterangan keluar khusus untuk peninjauan Masa Studi (beda dari opsi di Mahasiswa
// Keluar/Cuti) — enum status_keluar diperluas untuk menampung nilai-nilai ini juga.
const STATUS_KELUAR_VALUES: StatusKeluarMahasiswa[] = [
  'MENGUNDURKAN_DIRI',
  'DROP_OUT',
  'MUTASI',
  'PUTUS_SEKOLAH',
  'WAFAT',
  'HILANG',
  'MENUNGGU_UKOM',
  'LAINNYA',
];
const STATUS_KELUAR_LABELS: Record<StatusKeluarMahasiswa, string> = {
  CUTI: 'Cuti',
  MENGUNDURKAN_DIRI: 'Mengundurkan diri',
  DROP_OUT: 'Drop Out',
  HABIS_MASA_STUDI: 'Habis Masa Studi',
  MUTASI: 'Mutasi',
  PUTUS_SEKOLAH: 'Putus Sekolah',
  WAFAT: 'Wafat',
  HILANG: 'Hilang',
  LAINNYA: 'Lainnya',
  MENUNGGU_UKOM: 'Menunggu Ukom',
};
const statusKeluarOptions = STATUS_KELUAR_VALUES.map((v) => ({ value: v, label: STATUS_KELUAR_LABELS[v] }));

const aktifitasLabel = (item: Mahasiswa) => (item.statusKeluar ? STATUS_KELUAR_LABELS[item.statusKeluar] : 'Aktif');
const aktifitasVariant = (item: Mahasiswa) => (item.statusKeluar ? 'warning' : 'success');

const activeItem = ref<Mahasiswa | null>(null);
const krsHistory = ref<Krs[]>([]);
const loadingKrs = ref(false);

const totalSks = computed(() => krsHistory.value.reduce((sum, k) => sum + (k.totalSks ?? 0), 0));

const form = reactive<{ statusKeluar: StatusKeluarMahasiswa | ''; tanggalKeluar: string }>({
  statusKeluar: '',
  tanggalKeluar: '',
});
const submitting = ref(false);

const openInfo = async (item: Mahasiswa) => {
  activeItem.value = item;
  form.statusKeluar = item.statusKeluar ?? '';
  form.tanggalKeluar = item.tanggalKeluar ?? '';
  krsHistory.value = [];
  loadingKrs.value = true;
  try {
    const result = await krsApi.list({ mahasiswaId: item.id, limit: 100 });
    krsHistory.value = result.data.sort((a, b) => a.semester - b.semester);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat riwayat KRS'));
  } finally {
    loadingKrs.value = false;
  }
};

const closeInfo = () => {
  activeItem.value = null;
};

const handleSimpan = async () => {
  if (!activeItem.value) return;
  if (!form.statusKeluar) {
    toastError('Pilih status terlebih dahulu');
    return;
  }
  if (!form.tanggalKeluar) {
    toastError('Tanggal wajib diisi');
    return;
  }
  submitting.value = true;
  try {
    await mahasiswaApi.update(activeItem.value.id, {
      statusKeluar: form.statusKeluar as StatusKeluarMahasiswa,
      tanggalKeluar: form.tanggalKeluar,
    });
    toastSuccess('Data berhasil disimpan');
    closeInfo();
    fetchItems();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan data'));
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Masa Studi" subtitle="Monitoring masa studi mahasiswa aktif." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Masa Studi</div>

      <div class="p-4 border-b border-outline-variant flex justify-end">
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari NIM atau nama..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable
        :columns="columns"
        :items="items"
        :loading="loading"
        empty-message="Belum ada data mahasiswa"
        :sort-key="sortBy"
        :sort-dir="sortDir"
        @sort="handleSort"
      >
        <template #cell-statusMasuk="{ item }">{{ item.statusMasuk ? STATUS_MASUK_LABELS[item.statusMasuk] : '-' }}</template>
        <template #cell-kontak="{ item }">
          <p>{{ item.noTelepon || '-' }}</p>
          <p class="text-on-surface-variant">{{ item.email }}</p>
        </template>
        <template #cell-aktifitas="{ item }">
          <StatusBadge :label="aktifitasLabel(item)" :variant="aktifitasVariant(item)" />
        </template>
        <template #actions="{ item }">
          <AppButton icon="edit" @click="openInfo(item)">Update</AppButton>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal
      :model-value="!!activeItem"
      :title="`Informasi Aktifitas Mahasiswa : ${activeItem?.namaLengkap ?? ''} - ${activeItem?.nim ?? ''}`"
      size="lg"
      @update:model-value="closeInfo"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="border border-outline-variant rounded-md overflow-hidden">
          <table class="w-full text-left text-body-sm">
            <thead class="bg-surface-container-low">
              <tr>
                <th class="p-2 font-semibold text-on-surface-variant">No</th>
                <th class="p-2 font-semibold text-on-surface-variant">Semester</th>
                <th class="p-2 font-semibold text-on-surface-variant">SKS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant">
              <tr v-if="loadingKrs">
                <td colspan="3" class="p-4 text-center text-on-surface-variant">Memuat...</td>
              </tr>
              <tr v-else-if="krsHistory.length === 0">
                <td colspan="3" class="p-4 text-center text-on-surface-variant">Belum ada riwayat KRS</td>
              </tr>
              <tr v-for="(k, i) in krsHistory" v-else :key="k.id">
                <td class="p-2">{{ i + 1 }}</td>
                <td class="p-2">{{ k.semester }}</td>
                <td class="p-2">{{ k.totalSks ?? 0 }}</td>
              </tr>
            </tbody>
            <tfoot v-if="krsHistory.length > 0">
              <tr class="font-semibold border-t border-outline-variant">
                <td class="p-2" colspan="2">Total</td>
                <td class="p-2">{{ totalSks }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="space-y-4">
          <SelectInput v-model="form.statusKeluar" placeholder="-- Pilih Status --" :options="statusKeluarOptions" />
          <TextInput v-model="form.tanggalKeluar" type="date" />
          <AppButton :disabled="submitting" @click="handleSimpan">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
        </div>
      </div>
    </Modal>
  </div>
</template>

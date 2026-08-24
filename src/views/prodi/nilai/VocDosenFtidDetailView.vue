<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { vocDosenFtidApi } from '@/api/vocDosenFtid';
import { dosenApi } from '@/api/dosen';
import { extractErrorMessage } from '@/api/http';
import { openBlob } from '@/utils/download';
import { toastSuccess, toastError } from '@/utils/swal';
import type { Dosen, VocDosenFtidRow } from '@/types/entities';

const route = useRoute();
const dosenId = Number(route.params.dosenId);

const dosenNama = ref('');
const rows = ref<VocDosenFtidRow[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const dosenOptions = ref<{ value: number; label: string }[]>([]);

const fetchDetail = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await vocDosenFtidApi.detail(dosenId);
    dosenNama.value = result.dosen.namaLengkap;
    rows.value = result.rows;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  fetchDetail();
  try {
    const result = await dosenApi.list({ page: 1, limit: 500 });
    dosenOptions.value = result.data.map((d: Dosen) => ({ value: d.id, label: `${d.nidn} - ${d.namaLengkap}` }));
  } catch {
    dosenOptions.value = [];
  }
});

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'namaMataKuliah', label: 'Nama Matakuliah' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'rencanaPengawas', label: 'Rencana Pengawas' },
  { key: 'ruangan', label: 'Ruangan' },
  { key: 'jumlah', label: 'Jumlah' },
  { key: 'tanggalBerkas', label: 'Tanggal Berkas' },
  { key: 'pengawasRealId', label: 'Pengawas real' },
];

const rowsWithNo = computed(() =>
  rows.value.map((item, index) => ({ ...item, no: index + 1, id: item.jadwalKuliahId }))
);

const draft = reactive<Record<number, { jumlah: number; tanggalBerkas: string; pengawasRealId: number | '' }>>({});
const ensureDraft = (row: VocDosenFtidRow) => {
  if (!draft[row.jadwalKuliahId]) {
    draft[row.jadwalKuliahId] = {
      jumlah: row.jumlah,
      tanggalBerkas: row.tanggalBerkas?.slice(0, 10) ?? '',
      pengawasRealId: row.pengawasRealId ?? '',
    };
  }
  return draft[row.jadwalKuliahId];
};

const savingId = ref<number | null>(null);
const handleSave = async (row: VocDosenFtidRow) => {
  const d = ensureDraft(row);
  savingId.value = row.jadwalKuliahId;
  try {
    await vocDosenFtidApi.updateJadwal(row.jadwalKuliahId, {
      jumlah: Number(d.jumlah) || 0,
      tanggalBerkas: d.tanggalBerkas || null,
      pengawasRealId: d.pengawasRealId ? Number(d.pengawasRealId) : null,
    });
    toastSuccess('Data berhasil disimpan');
    fetchDetail();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan data'));
  } finally {
    savingId.value = null;
  }
};

const printing = ref(false);
const handlePrint = async () => {
  printing.value = true;
  try {
    const blob = await vocDosenFtidApi.cetakPdf(dosenId);
    openBlob(blob);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka voucher'));
  } finally {
    printing.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader
      title="Voc Dosen Kuliah"
      :subtitle="dosenNama ? `Detail jadwal ujian untuk ${dosenNama}` : 'Detail jadwal ujian'"
      :back-to="{ name: 'prodi-voc-dosen-ftid' }"
    >
      <template #actions>
        <AppButton icon="print" :disabled="printing" @click="handlePrint">
          {{ printing ? 'Menyiapkan...' : 'Cetak Voucher' }}
        </AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Semua Data Voc Dosen Kuliah</div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="rowsWithNo" :loading="loading" empty-message="Belum ada jadwal kuliah untuk dosen ini">
        <template #cell-jumlah="{ item }">
          <input
            type="number"
            min="0"
            class="w-24 px-2 py-1 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm"
            :value="ensureDraft(item).jumlah"
            @input="ensureDraft(item).jumlah = Number(($event.target as HTMLInputElement).value)"
          />
        </template>
        <template #cell-tanggalBerkas="{ item }">
          <input
            type="date"
            class="w-full px-2 py-1 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm"
            :value="ensureDraft(item).tanggalBerkas"
            @input="ensureDraft(item).tanggalBerkas = ($event.target as HTMLInputElement).value"
          />
        </template>
        <template #cell-pengawasRealId="{ item }">
          <div class="w-56">
            <SelectInput v-model="ensureDraft(item).pengawasRealId" placeholder="-- Pilih Pengawas --" :options="dosenOptions" />
          </div>
        </template>
        <template #actions="{ item }">
          <button
            type="button"
            class="text-primary hover:opacity-80 disabled:opacity-50"
            title="Simpan"
            :disabled="savingId === item.jadwalKuliahId"
            @click="handleSave(item)"
          >
            <span class="material-symbols-outlined" style="font-size: 20px">save</span>
          </button>
        </template>
      </DataTable>
    </section>
  </div>
</template>

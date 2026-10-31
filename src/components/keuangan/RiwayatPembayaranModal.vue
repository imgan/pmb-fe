<script setup lang="ts">
import { ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import type { RiwayatPembayaranMahasiswa } from '@/api/tagihanKuliah';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatDate } from '@/utils/format';

// Popup riwayat pembayaran satu mahasiswa (semua semester + transaksi kasir). Dipakai di menu
// Tagihan Mahasiswa dan Tunggakan Mahasiswa; `fetchFn` memilih endpoint sesuai hak akses menu.
const props = defineProps<{
  modelValue: boolean;
  mahasiswaId: number | null;
  fetchFn: (mahasiswaId: number) => Promise<RiwayatPembayaranMahasiswa>;
  /** Tampilkan tombol ubah/hapus tagihan per periode (menu Tagihan Mahasiswa). */
  canEdit?: boolean;
  canDelete?: boolean;
}>();
export type SemesterRow = RiwayatPembayaranMahasiswa['semester'][number] & { mahasiswa: RiwayatPembayaranMahasiswa['mahasiswa'] };
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; edit: [row: SemesterRow]; delete: [row: SemesterRow] }>();

type StatusTagihan = RiwayatPembayaranMahasiswa['semester'][number]['status'];
const STATUS_LABEL: Record<StatusTagihan, string> = { LUNAS: 'Lunas', SEBAGIAN: 'Sebagian', BELUM_BAYAR: 'Belum Bayar' };
const STATUS_VARIANT: Record<StatusTagihan, 'success' | 'warning' | 'danger'> = {
  LUNAS: 'success',
  SEBAGIAN: 'warning',
  BELUM_BAYAR: 'danger',
};

const data = ref<RiwayatPembayaranMahasiswa | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const load = async (keepData = false) => {
  if (!props.mahasiswaId) return;
  if (!keepData) data.value = null;
  error.value = null;
  loading.value = !keepData;
  try {
    data.value = await props.fetchFn(props.mahasiswaId);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat riwayat pembayaran');
  } finally {
    loading.value = false;
  }
};
watch(
  () => [props.modelValue, props.mahasiswaId] as const,
  ([open, id]) => {
    if (open && id) load();
  },
  { immediate: true }
);
// Dipanggil parent setelah tagihan diubah/dihapus.
defineExpose({ reload: () => load(true) });
</script>

<template>
  <Modal
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="Riwayat Pembayaran"
    :subtitle="data ? `${data.mahasiswa.nim} — ${data.mahasiswa.namaLengkap}` : ''"
    size="xl"
  >
    <div v-if="loading" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat riwayat pembayaran...</div>
    <div v-else-if="error" class="p-3 rounded-md text-body-sm text-error bg-error-container">{{ error }}</div>
    <div v-else-if="data" class="space-y-4">
      <p class="text-body-sm text-on-surface-variant">
        {{ data.mahasiswa.jurusan?.namaJurusan ?? '-' }} · {{ data.mahasiswa.golonganKelas?.namaKelas ?? '-' }} · Angkatan
        {{ data.mahasiswa.tahunMasuk ?? '-' }}
      </p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="border border-outline-variant rounded-md p-3">
          <p class="text-label-sm text-on-surface-variant">Total Tagihan</p>
          <p class="text-body-md font-semibold tabular-nums">{{ formatCurrencyIdr(data.ringkasan.totalTagihan) }}</p>
        </div>
        <div class="border border-outline-variant rounded-md p-3">
          <p class="text-label-sm text-on-surface-variant">Total Potongan</p>
          <p class="text-body-md font-semibold tabular-nums">{{ formatCurrencyIdr(data.ringkasan.totalPotongan) }}</p>
        </div>
        <div class="border border-outline-variant rounded-md p-3">
          <p class="text-label-sm text-on-surface-variant">Total Dibayar</p>
          <p class="text-body-md font-semibold tabular-nums">{{ formatCurrencyIdr(data.ringkasan.totalDibayar) }}</p>
        </div>
        <div class="border border-outline-variant rounded-md p-3">
          <p class="text-label-sm text-on-surface-variant">Total Sisa</p>
          <p class="text-body-md font-semibold tabular-nums" :class="data.ringkasan.totalSisa > 0 ? 'text-error' : ''">
            {{ formatCurrencyIdr(data.ringkasan.totalSisa) }}
          </p>
        </div>
      </div>

      <div class="overflow-x-auto border border-outline-variant rounded-md">
        <table class="w-full text-left text-body-sm">
          <thead class="bg-[#F1F5F9] text-label-md text-primary font-semibold">
            <tr>
              <th class="p-2">Periode</th>
              <th class="p-2 text-center">Smt</th>
              <th class="p-2 text-right">Tagihan</th>
              <th class="p-2 text-right">Potongan</th>
              <th class="p-2 text-right">Total</th>
              <th class="p-2 text-right">Dibayar</th>
              <th class="p-2 text-right">Sisa</th>
              <th class="p-2 text-center">Status</th>
              <th v-if="canEdit || canDelete" class="p-2 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <template v-for="s in data.semester" :key="s.id">
              <tr>
                <td class="p-2 whitespace-nowrap">{{ s.periode }}</td>
                <td class="p-2 text-center tabular-nums">{{ s.semester }}</td>
                <td class="p-2 text-right tabular-nums">{{ formatCurrencyIdr(s.tagihanAwal) }}</td>
                <td class="p-2 text-right tabular-nums">{{ s.potongan > 0 ? formatCurrencyIdr(s.potongan) : '-' }}</td>
                <td class="p-2 text-right tabular-nums">{{ formatCurrencyIdr(s.totalTagihan) }}</td>
                <td class="p-2 text-right tabular-nums">
                  {{ formatCurrencyIdr(s.totalDibayar) }}
                  <p v-if="s.dibayarTransaksi > 0" class="text-label-sm text-on-surface-variant">
                    import {{ formatCurrencyIdr(s.dibayarImport) }} + kasir {{ formatCurrencyIdr(s.dibayarTransaksi) }}
                  </p>
                </td>
                <td class="p-2 text-right tabular-nums" :class="s.sisa > 0 ? 'text-error font-medium' : ''">{{ formatCurrencyIdr(s.sisa) }}</td>
                <td class="p-2 text-center"><StatusBadge :label="STATUS_LABEL[s.status]" :variant="STATUS_VARIANT[s.status]" /></td>
                <td v-if="canEdit || canDelete" class="p-2">
                  <div class="flex items-center justify-center gap-2">
                    <button v-if="canEdit" type="button" class="text-on-surface-variant hover:text-primary" title="Ubah tagihan" @click="emit('edit', { ...s, mahasiswa: data.mahasiswa })">
                      <span class="material-symbols-outlined" style="font-size: 18px">edit</span>
                    </button>
                    <button v-if="canDelete" type="button" class="text-on-surface-variant hover:text-error" title="Hapus tagihan" @click="emit('delete', { ...s, mahasiswa: data.mahasiswa })">
                      <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-for="p in s.transaksi" :key="`p-${p.id}`" class="bg-surface-container-low">
                <td :colspan="canEdit || canDelete ? 9 : 8" class="px-6 py-1.5 text-label-sm text-on-surface-variant">
                  <span class="material-symbols-outlined align-middle mr-1" style="font-size: 14px">payments</span>
                  {{ formatDate(p.tanggalBayar) }} · {{ p.noBukti }} · {{ formatCurrencyIdr(p.nominal) }}
                  <template v-if="p.kodeBank"> · {{ p.kodeBank }}</template>
                  <template v-if="p.keterangan"> · {{ p.keterangan }}</template>
                  <span v-if="!p.terhitung" class="ml-1 italic">(sudah termasuk di data import)</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <p class="text-label-sm text-on-surface-variant">
        "Dibayar" = total bayar dari file keuangan saat import + transaksi kasir yang dicatat setelah import.
      </p>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="emit('update:modelValue', false)">Tutup</AppButton>
    </template>
  </Modal>
</template>

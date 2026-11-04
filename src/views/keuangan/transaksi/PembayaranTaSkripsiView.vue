<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import TextInput from '@/components/ui/TextInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Modal from '@/components/ui/Modal.vue';
import { pembayaranTaSkripsiApi, type HasilGenerateTa, type MahasiswaTa, type OpsiGenerateTa, type StatusTagihanTa } from '@/api/pembayaranTaSkripsi';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { toastSuccess } from '@/utils/swal';
import { formatCurrencyIdr } from '@/utils/format';
import { extractErrorMessage } from '@/api/http';
import type { PagingMeta } from '@/types/common';

const router = useRouter();

const nimInput = ref('');
const namaInput = ref('');
const appliedKeyword = ref('');
const searched = ref(false);

const { canCreate } = usePermission(MENU.KEUANGAN_PEMBAYARAN_TA_SKRIPSI_MANAGEMENT);
const { canRead: bisaLihatLaporan } = usePermission(MENU.KEUANGAN_LAPORAN_TUNGGAKAN_MAHASISWA_MANAGEMENT);
const statusBayarFilter = ref<'' | StatusTagihanTa>('');
const STATUS_BAYAR_OPTIONS = [
  { value: 'LUNAS', label: 'Lunas' },
  { value: 'LEBIH_BAYAR', label: 'Lebih Bayar' },
  { value: 'SEBAGIAN', label: 'Dicicil' },
  { value: 'BELUM', label: 'Belum Bayar' },
  { value: 'BELUM_DITAGIH', label: 'Belum Ditagih' },
];
const STATUS_TAMPIL: Record<StatusTagihanTa, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  LUNAS: { label: 'Lunas', variant: 'success' },
  LEBIH_BAYAR: { label: 'Lebih Bayar', variant: 'success' },
  SEBAGIAN: { label: 'Dicicil', variant: 'warning' },
  BELUM: { label: 'Belum Bayar', variant: 'danger' },
  BELUM_DITAGIH: { label: 'Belum Ditagih', variant: 'neutral' },
};

const items = ref<MahasiswaTa[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const error = ref<string | null>(null);

const rows = computed(() =>
  items.value.map((item, index) => ({ ...item, no: (page.value - 1) * meta.value.limit + index + 1 }))
);

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'namaLengkap', label: 'Nama' },
  { key: 'jurusan', label: 'Kelas' },
  { key: 'tahunMasuk', label: 'Tahun Masuk', align: 'center' },
  { key: 'periode', label: 'Tagihan TA/Skripsi' },
  { key: 'tagihan', label: 'Tagihan', align: 'right' },
  { key: 'dibayar', label: 'Dibayar', align: 'right' },
  { key: 'sisa', label: 'Sisa', align: 'right' },
  { key: 'status', label: 'Status', align: 'center' },
];

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await pembayaranTaSkripsiApi.listMahasiswa({
      page: page.value,
      limit: pageSize.value,
      search: appliedKeyword.value || undefined,
      statusBayar: statusBayarFilter.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data mahasiswa');
  } finally {
    loading.value = false;
  }
};

const handlePeriksa = () => {
  appliedKeyword.value = nimInput.value.trim() || namaInput.value.trim();
  page.value = 1;
  searched.value = true;
  fetchItems();
};

const onFilterChange = () => {
  searched.value = true;
  if (page.value !== 1) page.value = 1;
  else fetchItems();
};

// ---- Generate tagihan ----
const generateOpen = ref(false);
const pratinjau = ref<HasilGenerateTa | null>(null);
const generateError = ref<string | null>(null);
// Opsional: jadwal cicilan bulanan untuk tagihan yang belum punya jadwal & belum dibayar.
const pakaiCicilan = ref(false);
const jumlahBulan = ref(6);
const bulanMulai = ref(new Date().toISOString().slice(0, 7));
const hariJatuhTempo = ref<number | null>(10);
const generating = ref(false);
const opsiGenerate = ref<OpsiGenerateTa | null>(null);
const tahunDipilih = ref<number | string | null>('');
const tahunOptions = computed(() => (opsiGenerate.value?.tahun ?? []).map((t) => ({ value: t.id, label: `${t.nama}${t.isActive ? ' (aktif)' : ''}` })));
const tarifTahun = computed(() => opsiGenerate.value?.tahun.find((t) => t.id === Number(tahunDipilih.value))?.tarif ?? []);
const muatPratinjau = async () => {
  pratinjau.value = null;
  generateError.value = null;
  if (!tahunDipilih.value) return;
  try {
    pratinjau.value = await pembayaranTaSkripsiApi.generate({ tahunTaSkripsiId: Number(tahunDipilih.value), pratinjau: true });
  } catch (err) {
    generateError.value = extractErrorMessage(err, 'Gagal menghitung tagihan');
  }
};
watch(tahunDipilih, muatPratinjau);
const openGenerate = async () => {
  generateOpen.value = true;
  opsiGenerate.value = null;
  tahunDipilih.value = '';
  pratinjau.value = null;
  generateError.value = null;
  try {
    opsiGenerate.value = await pembayaranTaSkripsiApi.opsiGenerate();
    const bawaan = opsiGenerate.value.tahun.find((t) => t.isActive) ?? (opsiGenerate.value.tahun.length === 1 ? opsiGenerate.value.tahun[0] : null);
    if (bawaan) tahunDipilih.value = bawaan.id;
  } catch (err) {
    generateError.value = extractErrorMessage(err, 'Gagal memuat pilihan tagihan');
  }
};
const jalankanGenerate = async () => {
  generating.value = true;
  generateError.value = null;
  try {
    const hasil = await pembayaranTaSkripsiApi.generate({
      tahunTaSkripsiId: Number(tahunDipilih.value),
      cicilan: pakaiCicilan.value ? { jumlahBulan: jumlahBulan.value, bulanMulai: bulanMulai.value, hariJatuhTempo: hariJatuhTempo.value } : null,
    });
    toastSuccess(`${hasil.baru} tagihan dibuat, ${hasil.diubah} disesuaikan, ${hasil.sudahAda} sudah ada, ${hasil.cicilanDibuat} jadwal cicilan dibuat`);
    generateOpen.value = false;
    fetchItems();
  } catch (err) {
    generateError.value = extractErrorMessage(err, 'Gagal generate tagihan');
  } finally {
    generating.value = false;
  }
};

const openDetail = (id: number) => {
  router.push({ name: 'keuangan-pembayaran-ta-skripsi-detail', params: { mahasiswaId: id } });
};

watch(page, fetchItems);
watch(pageSize, () => {
  if (page.value !== 1) page.value = 1;
  else fetchItems();
});

fetchItems();
</script>

<template>
  <div>
    <PageHeader title="Pembayaran TA/Skripsi" subtitle="Tagihan, cicilan, dan tunggakan biaya tugas akhir/skripsi mahasiswa.">
      <template #actions>
        <RouterLink v-if="bisaLihatLaporan" :to="{ name: 'keuangan-laporan-tunggakan-mahasiswa' }">
          <AppButton variant="secondary" icon="pending_actions">Lihat Tunggakan</AppButton>
        </RouterLink>
        <AppButton v-if="canCreate" icon="auto_awesome" @click="openGenerate">Generate Tagihan</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-3 bg-surface-bright">
        <div class="w-full md:w-72">
          <TextInput v-model="nimInput" placeholder="Nomor Induk Mahasiswa" @keyup.enter="handlePeriksa" />
        </div>
        <div class="w-full md:w-72">
          <TextInput v-model="namaInput" placeholder="Nama Mahasiswa" @keyup.enter="handlePeriksa" />
        </div>
        <AppButton icon="search" @click="handlePeriksa">Periksa</AppButton>
        <div class="w-full md:w-48">
          <SelectInput v-model="statusBayarFilter" placeholder="Semua Status Bayar" :options="STATUS_BAYAR_OPTIONS" @change="onFilterChange" />
        </div>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        {{ appliedKeyword ? `Hasil Pencarian "${appliedKeyword}"` : 'Semua Data Master Pembayaran TA/Skripsi' }}
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="pageSize" />
      </div>

      <DataTable
        :columns="columns"
        :items="rows"
        :loading="loading"
        :empty-message="searched ? 'Mahasiswa tidak ditemukan' : 'Belum ada data mahasiswa'"
      >
        <template #cell-jurusan="{ item }">{{ item.jurusan?.namaJurusan ?? '-' }}</template>
        <template #cell-periode="{ item }">{{ item.periode ?? '-' }}</template>
        <template #cell-tagihan="{ item }">{{ item.tagihan ? formatCurrencyIdr(item.tagihan) : '-' }}</template>
        <template #cell-dibayar="{ item }">{{ item.dibayar ? formatCurrencyIdr(item.dibayar) : '-' }}</template>
        <template #cell-sisa="{ item }">
          <span v-if="item.lebihBayar" class="font-semibold text-success whitespace-nowrap">Lebih bayar {{ formatCurrencyIdr(item.lebihBayar) }}</span>
          <span v-else :class="item.sisa ? 'font-semibold text-error' : ''">{{ item.sisa ? formatCurrencyIdr(item.sisa) : '-' }}</span>
        </template>
        <template #cell-status="{ item }">
          <StatusBadge :variant="STATUS_TAMPIL[item.status as StatusTagihanTa].variant" :label="STATUS_TAMPIL[item.status as StatusTagihanTa].label" />
        </template>
        <template #actions="{ item }">
          <AppButton icon="payments" @click="openDetail(item.id)">Pembayaran</AppButton>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal v-model="generateOpen" title="Generate Tagihan TA/Skripsi" subtitle="Dari biaya pendaftaran di Master → Tarif TA/Skripsi, sesuai prodi mahasiswa." size="md">
      <div v-if="generateError" class="mb-3 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ generateError }}</div>
      <p v-if="!opsiGenerate && !generateError" class="p-4 text-center text-body-sm text-on-surface-variant">Memuat...</p>
      <div v-if="opsiGenerate" class="space-y-3 mb-3">
        <SelectInput v-model="tahunDipilih" label="Tahun TA/Skripsi" required :options="tahunOptions" placeholder="Pilih tahun" :clearable="false" />
        <p v-if="!opsiGenerate.tahun.length" class="text-body-sm text-error">Belum ada tarif TA/Skripsi aktif. Isi di Master → Tarif TA/Skripsi.</p>
        <ul v-if="tarifTahun.length" class="text-body-sm border border-outline-variant rounded-lg divide-y divide-outline-variant">
          <li v-for="t in tarifTahun" :key="t.prodi" class="px-3 py-1.5 flex justify-between gap-3">
            <span>{{ t.prodi }}</span><span class="font-medium tabular-nums">{{ formatCurrencyIdr(t.biaya) }}</span>
          </li>
        </ul>
      </div>
      <div v-if="pratinjau" class="space-y-3 text-body-sm">
        <p>Tagihan dibuat untuk mahasiswa aktif semester 5 ke atas, sebesar biaya pendaftaran prodinya. Generate ulang menimpa tagihan lama yang belum lunas.</p>
        <div class="border border-outline-variant rounded-lg p-3">
          <p class="font-semibold">{{ pratinjau.jumlahTarget }} mahasiswa</p>
          <p class="text-on-surface-variant">{{ pratinjau.baru }} tagihan baru · {{ pratinjau.diubah }} ditimpa · {{ pratinjau.sudahAda }} tidak berubah ({{ pratinjau.lunas }} lunas)</p>
        </div>
        <p v-if="pratinjau.tanpaTarif" class="text-error">
          {{ pratinjau.tanpaTarif }} mahasiswa semester 5 ke atas dilewati karena prodinya belum punya tarif di tahun ini.
        </p>
        <p v-if="pratinjau.diubahSudahBayar" class="text-error">
          {{ pratinjau.diubahSudahBayar }} tagihan yang ditimpa sudah ada pembayarannya. Pembayaran tetap tercatat, sisa dihitung ulang, dan jadwal cicilannya dihapus.
        </p>
        <label class="inline-flex items-center gap-2 cursor-pointer">
          <input v-model="pakaiCicilan" type="checkbox" class="accent-primary" />
          Buat jadwal cicilan bulanan
        </label>
        <div v-if="pakaiCicilan" class="grid grid-cols-3 gap-3">
          <label class="block"><span class="block text-on-surface-variant mb-1">Jumlah bulan</span><input v-model.number="jumlahBulan" type="number" min="1" max="24" class="w-full px-2 py-1.5 border border-outline-variant rounded-md bg-surface-container-lowest" /></label>
          <label class="block"><span class="block text-on-surface-variant mb-1">Mulai bulan</span><input v-model="bulanMulai" type="month" class="w-full px-2 py-1.5 border border-outline-variant rounded-md bg-surface-container-lowest" /></label>
          <label class="block"><span class="block text-on-surface-variant mb-1">Jatuh tempo tiap tgl</span><input v-model.number="hariJatuhTempo" type="number" min="1" max="31" class="w-full px-2 py-1.5 border border-outline-variant rounded-md bg-surface-container-lowest" /></label>
          <p class="col-span-3 text-label-sm text-on-surface-variant">Hanya untuk tagihan yang belum punya jadwal dan belum dibayar. Jadwal per mahasiswa bisa diubah di halaman Pembayaran.</p>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="generateOpen = false">Batal</AppButton>
        <AppButton icon="auto_awesome" :disabled="!pratinjau || generating || !(pratinjau.baru + pratinjau.diubah + (pakaiCicilan ? pratinjau.sudahAda : 0))" @click="jalankanGenerate">
          {{ generating ? 'Memproses...' : 'Generate' }}
        </AppButton>
      </template>
    </Modal>
  </div>
</template>

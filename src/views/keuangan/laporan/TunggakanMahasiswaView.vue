<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import Modal from '@/components/ui/Modal.vue';
import { laporanKeuanganApi } from '@/api/laporanKeuangan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { tagihanKuliahApi } from '@/api/tagihanKuliah';
import { tunggakanMahasiswaApi } from '@/api/tunggakanMahasiswa';
import { extractErrorMessage } from '@/api/http';
import { formatCurrencyIdr, formatDate } from '@/utils/format';
import { downloadBlob } from '@/utils/download';
import { toastError } from '@/utils/swal';
import type {
  LaporanTunggakanRow,
  RingkasanBiayaLainRow,
  RingkasanTaSkripsiPeriode,
  TagihanKuliah,
  TunggakanMahasiswa,
} from '@/types/entities';

interface Option {
  value: string | number;
  label: string;
}

const tahunAjaranOptions = ref<Option[]>([]);
const selectedTahunAjaran = ref<number | ''>('');

const rows = ref<LaporanTunggakanRow[]>([]);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');

onMounted(async () => {
  try {
    const { data } = await tahunAjaranApi.list({ limit: 200 });
    tahunAjaranOptions.value = data
      .slice()
      .sort((a, b) => b.tahunMulai - a.tahunMulai)
      .map((ta) => ({ value: ta.id, label: `${ta.nama} - ${ta.jenisSemester}` }));
    const active = data.find((ta) => ta.isActive);
    if (active) selectedTahunAjaran.value = active.id;
  } catch {
    tahunAjaranOptions.value = [];
  }
  handleTampilkan();
});

const handleTampilkan = async () => {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await laporanKeuanganApi.tunggakanMahasiswa({ tahunAjaranId: selectedTahunAjaran.value || undefined });
    loaded.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data tunggakan mahasiswa');
  } finally {
    loading.value = false;
  }
};

// ---- Export Excel ----
const exportingMahasiswa = ref(false);
const exportingJurusan = ref(false);

const handleExportPerMahasiswa = async () => {
  exportingMahasiswa.value = true;
  try {
    const blob = await laporanKeuanganApi.exportTunggakanPerMahasiswa({ tahunAjaranId: selectedTahunAjaran.value || undefined });
    downloadBlob(blob, 'tunggakan-per-mahasiswa.xlsx');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengekspor tunggakan per mahasiswa'));
  } finally {
    exportingMahasiswa.value = false;
  }
};

const handleExportPerJurusan = async () => {
  exportingJurusan.value = true;
  try {
    const blob = await laporanKeuanganApi.exportTunggakanPerJurusan({ tahunAjaranId: selectedTahunAjaran.value || undefined });
    downloadBlob(blob, 'tunggakan-per-jurusan.xlsx');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengekspor tunggakan per jurusan'));
  } finally {
    exportingJurusan.value = false;
  }
};

const columns: DataTableColumn[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'nama', label: 'Nama' },
  { key: 'prodi', label: 'Prodi' },
  { key: 'tagihanSisa', label: 'Sisa Tagihan Kuliah', align: 'right' },
  { key: 'tagihanTaSkripsisSisa', label: 'Sisa TA/Skripsi', align: 'right' },
  { key: 'tagihanBiayaLainSisa', label: 'Sisa Biaya Lain', align: 'right' },
  { key: 'tunggakanManual', label: 'Tunggakan Lain', align: 'right' },
  { key: 'totalTunggakan', label: 'Total Tunggakan', align: 'right' },
];

const filteredRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter(
    (r) => r.nim.toLowerCase().includes(q) || r.namaLengkap.toLowerCase().includes(q)
  );
});

const displayRows = computed(() => filteredRows.value.map((r, i) => ({ ...r, id: r.mahasiswaId, no: i + 1 })));

const grandTotal = computed(() => filteredRows.value.reduce((sum, r) => sum + r.totalTunggakan, 0));

// ---- Detail popup ----
const isDetailOpen = ref(false);
const detailLoading = ref(false);
const detailError = ref<string | null>(null);
const detailRow = ref<LaporanTunggakanRow | null>(null);
const detailTagihan = ref<TagihanKuliah[]>([]);
const detailManual = ref<TunggakanMahasiswa[]>([]);
const detailTaSkripsi = ref<RingkasanTaSkripsiPeriode[]>([]);
const detailBiayaLain = ref<RingkasanBiayaLainRow[]>([]);

const openDetail = async (row: LaporanTunggakanRow) => {
  detailRow.value = row;
  isDetailOpen.value = true;
  detailLoading.value = true;
  detailError.value = null;
  detailTagihan.value = [];
  detailManual.value = [];
  detailTaSkripsi.value = [];
  detailBiayaLain.value = [];
  try {
    const [tagihan, manual, taSkripsi, biayaLain] = await Promise.all([
      tagihanKuliahApi.cariByNim(row.nim, selectedTahunAjaran.value || undefined),
      tunggakanMahasiswaApi.list({ search: row.nim, limit: 100 }),
      laporanKeuanganApi.tunggakanTaSkripsi(row.nim),
      laporanKeuanganApi.tunggakanBiayaLain(row.nim),
    ]);
    detailTagihan.value = tagihan;
    detailManual.value = manual.data;
    detailTaSkripsi.value = taSkripsi;
    detailBiayaLain.value = biayaLain;
  } catch (err) {
    detailError.value = extractErrorMessage(err, 'Gagal memuat detail tunggakan');
  } finally {
    detailLoading.value = false;
  }
};
const closeDetail = () => {
  isDetailOpen.value = false;
};

interface JenisTagihanRow {
  label: string;
  nominal: number;
  dibayar: number;
  sisa: number;
}

// Backend hanya menyimpan totalDibayar per tagihan (bukan per jenis), jadi
// dibayar dialokasikan berurutan SPP -> BPP -> SKS. Potongan dipotong dari
// arah sebaliknya (SKS -> BPP -> SPP) agar total nominal tetap = totalTagihan.
const jenisTagihanRows = (t: TagihanKuliah): JenisTagihanRow[] => {
  const items = [
    { label: 'SPP', nominal: t.biayaSpp },
    { label: 'BPP', nominal: t.biayaBpp },
    { label: 'SKS', nominal: t.biayaSks },
  ];
  let potonganSisa = t.potongan || 0;
  for (let i = items.length - 1; i >= 0 && potonganSisa > 0; i--) {
    const cut = Math.min(items[i].nominal, potonganSisa);
    items[i].nominal -= cut;
    potonganSisa -= cut;
  }
  let bayarSisa = t.totalDibayar;
  return items.map((item) => {
    const dibayar = Math.min(item.nominal, Math.max(bayarSisa, 0));
    bayarSisa -= dibayar;
    return { ...item, dibayar, sisa: item.nominal - dibayar };
  });
};
</script>

<template>
  <div>
    <PageHeader title="Laporan Tunggakan Mahasiswa" subtitle="Rekap total tunggakan mahasiswa (tagihan kuliah belum lunas + tunggakan lain)." />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-3 md:items-end">
        <div class="w-full md:w-72">
          <SelectInput v-model="selectedTahunAjaran" label="Tahun Ajaran" placeholder="-- Semua Tahun Ajaran --" :options="tahunAjaranOptions" />
        </div>
        <AppButton icon="search" :disabled="loading" @click="handleTampilkan">{{ loading ? 'Memuat...' : 'Tampilkan' }}</AppButton>
        <div class="flex-1"></div>
        <AppButton variant="secondary" icon="download" :disabled="exportingMahasiswa" @click="handleExportPerMahasiswa">
          {{ exportingMahasiswa ? 'Mengekspor...' : 'Export per Mahasiswa' }}
        </AppButton>
        <AppButton variant="secondary" icon="download" :disabled="exportingJurusan" @click="handleExportPerJurusan">
          {{ exportingJurusan ? 'Mengekspor...' : 'Export per Jurusan' }}
        </AppButton>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium flex items-center justify-between">
        <span>Daftar Tunggakan Mahasiswa</span>
        <span v-if="loaded" class="text-label-sm opacity-90">Total: {{ formatCurrencyIdr(grandTotal) }}</span>
      </div>

      <div class="p-4 border-b border-outline-variant">
        <SearchInput v-model="searchQuery" placeholder="Cari nama atau NIM..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="displayRows" :loading="loading" empty-message="Tidak ada mahasiswa yang menunggak">
        <template #cell-nama="{ item }">{{ item.namaLengkap }}</template>
        <template #cell-prodi="{ item }">{{ item.prodi }}</template>
        <template #cell-tagihanSisa="{ item }">{{ formatCurrencyIdr(item.tagihanSisa) }}</template>
        <template #cell-tagihanTaSkripsisSisa="{ item }">{{ formatCurrencyIdr(item.tagihanTaSkripsisSisa) }}</template>
        <template #cell-tagihanBiayaLainSisa="{ item }">{{ formatCurrencyIdr(item.tagihanBiayaLainSisa) }}</template>
        <template #cell-tunggakanManual="{ item }">{{ formatCurrencyIdr(item.tunggakanManual) }}</template>
        <template #cell-totalTunggakan="{ item }">
          <span class="text-error font-medium">{{ formatCurrencyIdr(item.totalTunggakan) }}</span>
        </template>
        <template #actions="{ item }">
          <AppButton variant="secondary" @click="openDetail(item)">Detail</AppButton>
        </template>
      </DataTable>
    </section>

    <Modal :model-value="isDetailOpen" title="Detail Tunggakan Mahasiswa" size="lg" @update:model-value="closeDetail">
      <div v-if="detailRow" class="space-y-5">
        <div class="px-3 py-2 rounded-md bg-surface-container-low text-body-sm">
          <p class="font-medium text-on-surface">{{ detailRow.nim }} &middot; {{ detailRow.namaLengkap }}</p>
          <p class="text-on-surface-variant">{{ detailRow.prodi }}</p>
        </div>

        <div v-if="detailError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
          {{ detailError }}
        </div>
        <div v-else-if="detailLoading" class="text-body-sm text-on-surface-variant py-4 text-center">Memuat detail...</div>

        <template v-else>
          <div>
            <h4 class="text-label-md font-semibold text-on-surface mb-2">Tagihan Kuliah</h4>
            <p v-if="!detailTagihan.length" class="text-body-sm text-on-surface-variant">Tidak ada tagihan kuliah.</p>
            <div v-else class="space-y-3">
              <div v-for="tagihan in detailTagihan" :key="tagihan.id" class="border border-outline-variant rounded-md overflow-hidden">
                <div class="px-3 py-2 bg-surface-container-low flex flex-wrap items-center justify-between gap-2 text-body-sm">
                  <span class="font-medium text-on-surface">
                    {{ tagihan.tahunAjaran?.nama ?? '-' }} &middot; Semester {{ tagihan.semester }}
                  </span>
                  <span class="text-on-surface-variant">
                    Tagihan: {{ formatCurrencyIdr(tagihan.totalTagihan) }} &middot; Dibayar:
                    {{ formatCurrencyIdr(tagihan.totalDibayar) }} &middot; Sisa:
                    <span :class="tagihan.sisaTagihan > 0 ? 'text-error font-medium' : ''">
                      {{ formatCurrencyIdr(tagihan.sisaTagihan) }}
                    </span>
                  </span>
                </div>
                <div class="px-3 py-2 border-t border-outline-variant">
                  <p class="text-label-sm font-medium text-on-surface-variant mb-1">Rincian per Jenis Tagihan</p>
                  <table class="w-full text-body-sm">
                    <thead>
                      <tr class="text-label-sm text-on-surface-variant">
                        <th class="text-left font-medium pb-1">Jenis</th>
                        <th class="text-right font-medium pb-1">Nominal</th>
                        <th class="text-right font-medium pb-1">Dibayar</th>
                        <th class="text-right font-medium pb-1">Sisa</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="jenis in jenisTagihanRows(tagihan)" :key="jenis.label">
                        <td class="py-0.5">{{ jenis.label }}</td>
                        <td class="py-0.5 text-right">{{ formatCurrencyIdr(jenis.nominal) }}</td>
                        <td class="py-0.5 text-right">{{ formatCurrencyIdr(jenis.dibayar) }}</td>
                        <td class="py-0.5 text-right" :class="jenis.sisa > 0 ? 'text-error font-medium' : ''">
                          {{ formatCurrencyIdr(jenis.sisa) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p v-if="tagihan.potongan > 0" class="text-label-sm text-on-surface-variant mt-1">
                    * Sudah termasuk potongan {{ formatCurrencyIdr(tagihan.potongan) }}
                  </p>
                </div>
                <div v-if="tagihan.pembayaranList?.length" class="px-3 py-2 border-t border-outline-variant">
                  <p class="text-label-sm font-medium text-on-surface-variant mb-1">Riwayat Pembayaran</p>
                  <table class="w-full text-body-sm">
                    <thead>
                      <tr class="text-label-sm text-on-surface-variant">
                        <th class="text-left font-medium pb-1">Tanggal</th>
                        <th class="text-left font-medium pb-1">No Bukti</th>
                        <th class="text-right font-medium pb-1">Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="p in tagihan.pembayaranList" :key="p.id">
                        <td class="py-0.5">{{ formatDate(p.tanggalBayar) }}</td>
                        <td class="py-0.5">{{ p.noBukti }}</td>
                        <td class="py-0.5 text-right">{{ formatCurrencyIdr(p.nominal) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="px-3 py-2 border-t border-outline-variant text-body-sm text-on-surface-variant">Belum ada pembayaran.</p>
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-label-md font-semibold text-on-surface mb-2">Tagihan TA/Skripsi</h4>
            <p v-if="!detailTaSkripsi.length" class="text-body-sm text-on-surface-variant">Tidak ada tagihan TA/Skripsi.</p>
            <div v-else class="space-y-3">
              <div
                v-for="periode in detailTaSkripsi"
                :key="periode.periode"
                class="border border-outline-variant rounded-md overflow-hidden"
              >
                <div class="px-3 py-2 bg-surface-container-low text-body-sm font-medium text-on-surface">
                  Periode {{ periode.periode }}
                </div>
                <div class="px-3 py-2 border-t border-outline-variant">
                  <table class="w-full text-body-sm">
                    <thead>
                      <tr class="text-label-sm text-on-surface-variant">
                        <th class="text-left font-medium pb-1">Jenis</th>
                        <th class="text-right font-medium pb-1">Tarif</th>
                        <th class="text-right font-medium pb-1">Dibayar</th>
                        <th class="text-right font-medium pb-1">Sisa</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="py-0.5">Pendaftaran</td>
                        <td class="py-0.5 text-right">{{ formatCurrencyIdr(periode.pendaftaran.tarif) }}</td>
                        <td class="py-0.5 text-right">{{ formatCurrencyIdr(periode.pendaftaran.dibayar) }}</td>
                        <td class="py-0.5 text-right" :class="periode.pendaftaran.sisa > 0 ? 'text-error font-medium' : ''">
                          {{ formatCurrencyIdr(periode.pendaftaran.sisa) }}
                        </td>
                      </tr>
                      <tr v-if="periode.perpanjangan">
                        <td class="py-0.5">Perpanjangan</td>
                        <td class="py-0.5 text-right">{{ formatCurrencyIdr(periode.perpanjangan.tarif) }}</td>
                        <td class="py-0.5 text-right">{{ formatCurrencyIdr(periode.perpanjangan.dibayar) }}</td>
                        <td class="py-0.5 text-right" :class="periode.perpanjangan.sisa > 0 ? 'text-error font-medium' : ''">
                          {{ formatCurrencyIdr(periode.perpanjangan.sisa) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="periode.pembayaranList.length || periode.perpanjanganList.length" class="px-3 py-2 border-t border-outline-variant">
                  <p class="text-label-sm font-medium text-on-surface-variant mb-1">Riwayat Pembayaran</p>
                  <table class="w-full text-body-sm">
                    <thead>
                      <tr class="text-label-sm text-on-surface-variant">
                        <th class="text-left font-medium pb-1">Tanggal</th>
                        <th class="text-left font-medium pb-1">No Bukti</th>
                        <th class="text-left font-medium pb-1">Jenis</th>
                        <th class="text-right font-medium pb-1">Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="p in periode.pembayaranList" :key="`p-${p.id}`">
                        <td class="py-0.5">{{ formatDate(p.tanggalBayar) }}</td>
                        <td class="py-0.5">{{ p.noBukti }}</td>
                        <td class="py-0.5">Pendaftaran</td>
                        <td class="py-0.5 text-right">{{ formatCurrencyIdr(p.nominal) }}</td>
                      </tr>
                      <tr v-for="p in periode.perpanjanganList" :key="`x-${p.id}`">
                        <td class="py-0.5">{{ formatDate(p.tanggalBayar) }}</td>
                        <td class="py-0.5">{{ p.noBukti }}</td>
                        <td class="py-0.5">Perpanjangan</td>
                        <td class="py-0.5 text-right">{{ formatCurrencyIdr(p.nominal) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-label-md font-semibold text-on-surface mb-2">Tagihan Biaya Lain</h4>
            <p v-if="!detailBiayaLain.length" class="text-body-sm text-on-surface-variant">Tidak ada tagihan biaya lain.</p>
            <table v-else class="w-full text-body-sm border border-outline-variant rounded-md overflow-hidden">
              <thead>
                <tr class="bg-surface-container-low text-label-sm text-on-surface-variant">
                  <th class="text-left font-medium p-2">Kode Biaya</th>
                  <th class="text-right font-medium p-2">Tarif</th>
                  <th class="text-right font-medium p-2">Dibayar</th>
                  <th class="text-right font-medium p-2">Sisa</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in detailBiayaLain" :key="b.tarifLainId" class="border-t border-outline-variant">
                  <td class="p-2">{{ b.kodeBiaya }}<span v-if="b.keterangan" class="text-on-surface-variant"> ({{ b.keterangan }})</span></td>
                  <td class="p-2 text-right">{{ formatCurrencyIdr(b.tarif) }}</td>
                  <td class="p-2 text-right">{{ formatCurrencyIdr(b.dibayar) }}</td>
                  <td class="p-2 text-right" :class="b.sisa > 0 ? 'text-error font-medium' : ''">{{ formatCurrencyIdr(b.sisa) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 class="text-label-md font-semibold text-on-surface mb-2">Tunggakan Lain (Manual)</h4>
            <p v-if="!detailManual.length" class="text-body-sm text-on-surface-variant">Tidak ada tunggakan lain.</p>
            <table v-else class="w-full text-body-sm border border-outline-variant rounded-md overflow-hidden">
              <thead>
                <tr class="bg-surface-container-low text-label-sm text-on-surface-variant">
                  <th class="text-left font-medium p-2">Tanggal</th>
                  <th class="text-left font-medium p-2">Keterangan</th>
                  <th class="text-right font-medium p-2">Nominal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in detailManual" :key="m.id" class="border-t border-outline-variant">
                  <td class="p-2">{{ formatDate(m.tanggal) }}</td>
                  <td class="p-2">{{ m.keterangan || '-' }}</td>
                  <td class="p-2 text-right">{{ formatCurrencyIdr(m.nominal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex justify-end px-3 py-2 rounded-md bg-surface-container-low text-body-md">
            <span class="font-semibold text-on-surface mr-2">Total Tunggakan:</span>
            <span class="text-error font-semibold">{{ formatCurrencyIdr(detailRow.totalTunggakan) }}</span>
          </div>
        </template>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeDetail">Tutup</AppButton>
      </template>
    </Modal>
  </div>
</template>

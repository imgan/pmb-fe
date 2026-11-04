<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import {
  batasTagihanAkademikApi,
  type BatasTagihanAkademik,
  type JenisCekal,
  type StatusCekalMahasiswa,
} from '@/api/batasTagihanAkademik';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatDateTime } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';

// Alur cekal yang disepakati, dihitung dari tagihan semester berjalan yang dicicil 6x per bulan:
// KRS minimal 15% dibayar (1 bulan), UTS 50% (3 bulan), lihat nilai / cetak KHS / daftar nilai
// sementara 100% dari cicilan yang jatuh tempo s/d bulan berjalan. Diatur per prodi.
type Row = BatasTagihanAkademik & { id: number; prodi: string };
type Field = { aktif: 'krsAktif' | 'utsAktif' | 'nilaiAktif'; min: 'minBayarKrs' | 'minBayarUts' | 'minBayarNilai' };

const JENIS: { key: JenisCekal; label: string; description: string; field: Field }[] = [
  {
    key: 'krs',
    label: 'Filter Pengisian KRS',
    description: 'Blokir simpan & ajukan KRS bila pembayaran belum mencapai minimal.',
    field: { aktif: 'krsAktif', min: 'minBayarKrs' },
  },
  {
    key: 'uts',
    label: 'Filter Kehadiran UTS',
    description: 'Mahasiswa yang belum mencapai minimal bayar ditandai tidak boleh mengikuti UTS.',
    field: { aktif: 'utsAktif', min: 'minBayarUts' },
  },
  {
    key: 'nilai',
    label: 'Filter Melihat Nilai, Cetak KHS & Daftar Nilai Sementara',
    description: 'Blokir lihat nilai, cetak KHS & daftar nilai sementara bila cicilan yang jatuh tempo s/d bulan berjalan belum dibayar.',
    field: { aktif: 'nilaiAktif', min: 'minBayarNilai' },
  },
];

const { canUpdate } = usePermission(MENU.KEUANGAN_BATAS_TAGIHAN_AKADEMIK_MANAGEMENT);

const rows = ref<Row[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const search = ref('');

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const data = await batasTagihanAkademikApi.list();
    rows.value = data.map((r) => ({
      ...r,
      id: r.jurusanId,
      prodi: r.golonganKelas ? `${r.namaJurusan} (${r.golonganKelas})` : r.namaJurusan,
    }));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat batas tagihan akademik');
  } finally {
    loading.value = false;
  }
};
onMounted(fetchItems);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? rows.value.filter((r) => r.prodi.toLowerCase().includes(q)) : rows.value;
});

const columns: DataTableColumn[] = [
  { key: 'prodi', label: 'Prodi' },
  { key: 'krs', label: 'Pengisian KRS' },
  { key: 'uts', label: 'Kehadiran UTS' },
  { key: 'nilai', label: 'Nilai, KHS & Daftar Nilai Sementara' },
  { key: 'updatedAt', label: 'Terakhir Diubah' },
];

const formatPersen = (n: number) => `${Number(n.toFixed(2)).toLocaleString('id-ID')}%`;
const ruleText = (aktif: boolean, min: number, jenis: JenisCekal) => {
  if (!aktif) return 'Tidak dibatasi';
  if (jenis === 'nilai') return min >= 100 ? 'Cicilan s/d bulan berjalan lunas' : `${formatPersen(min)} cicilan s/d bulan berjalan`;
  return `Minimal bayar ${formatPersen(min)} tagihan semester`;
};

// ---- Form ubah per prodi ----
const editing = ref<Row | null>(null);
const form = reactive({ krsAktif: false, minBayarKrs: 0, utsAktif: false, minBayarUts: 0, nilaiAktif: false, minBayarNilai: 0 });
const formError = ref<string | null>(null);
const submitting = ref(false);

const openEdit = (row: Row) => {
  editing.value = row;
  formError.value = null;
  Object.assign(form, {
    krsAktif: row.krsAktif,
    minBayarKrs: row.minBayarKrs,
    utsAktif: row.utsAktif,
    minBayarUts: row.minBayarUts,
    nilaiAktif: row.nilaiAktif,
    minBayarNilai: row.minBayarNilai,
  });
};
const closeEdit = () => {
  editing.value = null;
};

const onPersenInput = (field: Field['min'], event: Event) => {
  const input = event.target as HTMLInputElement;
  const value = Number(input.value);
  form[field] = Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 0;
  // Hanya tulis ulang input bila nilainya di luar 0–100, supaya ketik desimal ("12.") tidak terganggu.
  if (value !== form[field]) input.value = String(form[field]);
};

const handleSubmit = async () => {
  if (!editing.value) return;
  submitting.value = true;
  formError.value = null;
  try {
    await batasTagihanAkademikApi.update(editing.value.jurusanId, { ...form });
    toastSuccess(`Alur cekal ${editing.value.prodi} disimpan`);
    closeEdit();
    fetchItems();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan batas tagihan');
  } finally {
    submitting.value = false;
  }
};

// ---- Status cekal per mahasiswa (mis. daftar boleh / tidak boleh ikut UTS) ----
const prodiOptions = computed(() => {
  // Satu pilihan per nama prodi (baris jurusan per golongan kelas digabung di backend lewat kode prodi).
  const seen = new Set<string>();
  return rows.value
    .filter((r) => (seen.has(r.namaJurusan) ? false : (seen.add(r.namaJurusan), true)))
    .map((r) => ({ value: r.jurusanId, label: r.namaJurusan }));
});
const statusProdi = ref<number | ''>('');
const statusJenis = ref<JenisCekal>('uts');
const statusFilter = ref<'' | 'cekal' | 'boleh'>('cekal');
const statusSearch = ref('');
const statusRows = ref<(StatusCekalMahasiswa & { id: number })[]>([]);
const statusLoading = ref(false);
const statusError = ref<string | null>(null);
const statusLoaded = ref(false);

const loadStatus = async () => {
  if (!statusProdi.value) {
    statusError.value = 'Pilih prodi terlebih dahulu';
    return;
  }
  statusLoading.value = true;
  statusError.value = null;
  try {
    const data = await batasTagihanAkademikApi.statusMahasiswa({
      jurusanId: Number(statusProdi.value),
      jenis: statusJenis.value,
      status: statusFilter.value || undefined,
      search: statusSearch.value.trim() || undefined,
    });
    statusRows.value = data.map((r) => ({ ...r, id: r.mahasiswaId }));
    statusLoaded.value = true;
  } catch (err) {
    statusError.value = extractErrorMessage(err, 'Gagal memuat status mahasiswa');
  } finally {
    statusLoading.value = false;
  }
};

const statusColumns: DataTableColumn[] = [
  { key: 'nim', label: 'NIM' },
  { key: 'namaLengkap', label: 'Nama' },
  { key: 'angkatan', label: 'Angkatan', align: 'center' },
  { key: 'tagihanSemester', label: 'Tagihan Semester', align: 'right' },
  { key: 'persenDibayar', label: 'Terbayar', align: 'right' },
  { key: 'tunggakanLain', label: 'Tunggakan Lain', align: 'right' },
  { key: 'krs', label: 'KRS', align: 'center' },
  { key: 'uts', label: 'UTS', align: 'center' },
  { key: 'nilai', label: 'Nilai/KHS', align: 'center' },
];
const formatRupiah = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
</script>

<template>
  <div>
    <PageHeader
      title="Batas Tagihan Akademik"
      subtitle="Alur cekal per prodi: minimal persentase tagihan yang sudah dibayar untuk mengisi KRS, mengikuti UTS, dan melihat nilai."
    />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright flex flex-col md:flex-row gap-3 md:items-center">
        <p class="text-body-sm text-on-surface-variant md:flex-1">
          Dihitung dari <strong>tagihan semester berjalan</strong> (tahun ajaran aktif) yang dicicil 6x per bulan
          (Ganjil September–Februari, Genap Maret–Agustus). KRS: minimal 15% (1 bulan), UTS: 50% (3 bulan),
          Nilai/KHS/Daftar Nilai Sementara: cicilan s/d bulan berjalan lunas. Tunggakan semester sebelumnya,
          biaya lain &amp; tunggakan manual harus lunas; keringanan yang disetujui mengurangi tunggakan tersebut. Tagihan
          TA/Skripsi dan wisuda tidak ikut dihitung.
        </p>
        <div class="w-full md:w-64">
          <SearchInput v-model="search" placeholder="Cari prodi..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <DataTable :columns="columns" :items="filtered" :loading="loading" :show-actions="canUpdate" empty-message="Belum ada data prodi">
        <template #cell-prodi="{ item }"><span class="font-medium">{{ item.prodi }}</span></template>
        <template v-for="j in JENIS" :key="j.key" #[`cell-${j.key}`]="{ item }">
          <div class="flex flex-col gap-1">
            <StatusBadge :label="item[j.field.aktif] ? 'Aktif' : 'Nonaktif'" :variant="item[j.field.aktif] ? 'success' : 'neutral'" />
            <span class="text-label-sm text-on-surface-variant">{{ ruleText(item[j.field.aktif], item[j.field.min], j.key) }}</span>
          </div>
        </template>
        <template #cell-updatedAt="{ item }">{{ item.updatedAt ? formatDateTime(item.updatedAt) : '-' }}</template>
        <template #actions="{ item }">
          <button type="button" class="text-primary hover:opacity-80" title="Ubah Alur Cekal" @click="openEdit(item)">
            <span class="material-symbols-outlined" style="font-size: 20px">edit</span>
          </button>
        </template>
      </DataTable>
    </section>

    <section class="mt-6 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Status Cekal Mahasiswa</div>
      <div class="p-4 border-b border-outline-variant bg-surface-bright grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.3fr_auto] gap-3 md:items-end">
        <SelectInput v-model="statusProdi" label="Prodi" required :options="prodiOptions" placeholder="-- Pilih Prodi --" />
        <SelectInput
          v-model="statusJenis"
          label="Jenis"
          :options="[
            { value: 'krs', label: 'Pengisian KRS' },
            { value: 'uts', label: 'Kehadiran UTS' },
            { value: 'nilai', label: 'Nilai / KHS' },
          ]"
        />
        <SelectInput
          v-model="statusFilter"
          label="Status"
          placeholder="Semua"
          :options="[
            { value: 'cekal', label: 'Dicekal' },
            { value: 'boleh', label: 'Diizinkan' },
          ]"
        />
        <label class="block min-w-0 [&>div]:!w-full">
          <span class="block font-medium text-label-md text-on-surface mb-2">Cari</span>
          <SearchInput v-model="statusSearch" placeholder="Cari NIM / nama..." @keyup.enter="loadStatus" />
        </label>
        <div class="flex">
          <AppButton icon="search" class="w-full xl:w-auto justify-center" :disabled="statusLoading" @click="loadStatus">
            {{ statusLoading ? 'Memuat...' : 'Tampilkan' }}
          </AppButton>
        </div>
      </div>
      <div v-if="statusError" class="p-4 text-body-sm text-error bg-error-container">{{ statusError }}</div>
      <DataTable
        :columns="statusColumns"
        :items="statusRows"
        :loading="statusLoading"
        :show-actions="false"
        :empty-message="statusLoaded ? 'Tidak ada mahasiswa yang sesuai filter' : 'Pilih prodi lalu klik Tampilkan'"
      >
        <template #cell-angkatan="{ item }">{{ item.angkatan ?? '-' }}</template>
        <template #cell-persenDibayar="{ item }">
          <span class="tabular-nums">{{ item.persenDibayar === null ? 'Belum ada tagihan' : formatPersen(Math.floor(item.persenDibayar * 100) / 100) }}</span>
        </template>
        <template #cell-tagihanSemester="{ item }"><span class="tabular-nums">{{ formatRupiah(item.tagihanSemester) }}</span></template>
        <template #cell-tunggakanLain="{ item }"><span class="tabular-nums">{{ formatRupiah(item.tunggakanLain) }}</span></template>
        <template v-for="j in JENIS" :key="j.key" #[`cell-${j.key}`]="{ item }">
          <StatusBadge :label="item[j.key] ? 'Boleh' : 'Cekal'" :variant="item[j.key] ? 'success' : 'danger'" />
        </template>
      </DataTable>
    </section>

    <Modal :model-value="!!editing" :title="`Alur Cekal — ${editing?.prodi ?? ''}`" @update:model-value="closeEdit">
      <form class="space-y-5" @submit.prevent="handleSubmit">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>

        <div v-for="j in JENIS" :key="j.key" class="space-y-3 p-4 border border-outline-variant rounded-md">
          <CheckboxToggle v-model="form[j.field.aktif]" :label="j.label" :description="j.description" />
          <label class="block">
            <span class="block font-medium text-label-md text-on-surface mb-2">{{ j.key === 'nilai' ? 'Minimal Cicilan Jatuh Tempo Dibayar (%)' : 'Minimal Tagihan Semester Dibayar (%)' }}</span>
            <div class="relative">
              <input
                :value="form[j.field.min]"
                :disabled="!form[j.field.aktif]"
                type="number"
                min="0"
                max="100"
                step="0.01"
                inputmode="decimal"
                placeholder="0"
                class="w-full pl-3 pr-9 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
                @input="onPersenInput(j.field.min, $event)"
              />
              <span class="absolute inset-y-0 right-3 flex items-center text-body-md text-on-surface-variant">%</span>
            </div>
            <span class="block mt-1 text-label-sm text-on-surface-variant">{{ j.key === 'nilai' ? '100 = cicilan s/d bulan berjalan wajib lunas.' : 'Persen dari total tagihan semester berjalan (15% kira-kira 1 bulan, 50% = 3 bulan).' }}</span>
          </label>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="closeEdit">Batal</AppButton>
        <AppButton :disabled="submitting" @click="handleSubmit">{{ submitting ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>

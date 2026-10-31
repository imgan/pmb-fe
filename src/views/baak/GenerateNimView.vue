<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import {
  generateNimApi,
  type GenerateNimAksi,
  type GenerateNimKelas,
  type GenerateNimMahasiswa,
  type WaktuKode,
} from '@/api/generateNim';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { jurusanApi } from '@/api/jurusan';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';
import { formatCurrencyIdr } from '@/utils/format';
import { MENU } from '@/constants/menuCodes';
import type { PagingMeta } from '@/types/common';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';

const { canCreate, canUpdate } = usePermission(MENU.BAAK_GENERATE_NIM_MANAGEMENT);

const tahunAjaranOptions = ref<{ value: number; label: string }[]>([]);
const jurusanOptions = ref<{ value: number; label: string }[]>([]);
const tahunAjaranId = ref<number | ''>('');
const jurusanFilter = ref<number | ''>('');
const kelasFilter = ref<string>('');
const search = ref('');

// ---- Ringkasan per kelas ----
const kelasList = ref<GenerateNimKelas[]>([]);
const belumAdaKelas = ref(0);
const kelasLoading = ref(false);

const kelasFilterOptions = computed(() => [
  { value: '-', label: 'Belum ada kelas' },
  ...kelasList.value.map((k) => ({ value: k.namaKelas, label: k.namaKelas })),
]);

const fetchKelas = async () => {
  if (!tahunAjaranId.value) return;
  kelasLoading.value = true;
  try {
    const summary = await generateNimApi.listKelas(Number(tahunAjaranId.value));
    kelasList.value = summary.kelas;
    belumAdaKelas.value = summary.belumAdaKelas;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat ringkasan kelas'));
  } finally {
    kelasLoading.value = false;
  }
};

const kelasColumns: DataTableColumn[] = [
  { key: 'namaKelas', label: 'Nama Kelas' },
  { key: 'namaJurusan', label: 'Program Studi' },
  { key: 'waktuKuliah', label: 'Waktu', align: 'center' },
  { key: 'jumlahMahasiswa', label: 'Mahasiswa', align: 'center' },
  { key: 'jumlahJadwal', label: 'Jadwal Kuliah', align: 'center' },
  { key: 'jumlahKrs', label: 'KRS', align: 'center' },
  { key: 'jumlahTagihan', label: 'Tagihan (import)', align: 'center' },
  { key: 'jumlahAktif', label: 'Status Aktif', align: 'center' },
];
// DataTable butuh `id` per baris.
const kelasRows = computed(() => kelasList.value.map((k, index) => ({ ...k, id: index + 1 })));

const progressClass = (done: number, total: number) =>
  done === 0 ? 'text-on-surface-variant' : done >= total ? 'text-primary font-semibold' : 'text-on-surface';

const AKSI_LABEL: Record<GenerateNimAksi, string> = {
  krs: 'KRS semester 1',
  tagihan: 'tagihan semester 1',
  'status-aktif': 'status aktif semester 1',
};
const generatingKey = ref<string | null>(null);

const handleGenerate = async (kelas: GenerateNimKelas, aksi: GenerateNimAksi) => {
  if (aksi === 'krs' && !kelas.jumlahJadwal) {
    toastError(`Belum ada jadwal kuliah dengan nama kelas ${kelas.namaKelas} pada tahun ajaran ini`);
    return;
  }
  const notes: Record<GenerateNimAksi, string> = {
    krs: `Seluruh ${kelas.jumlahJadwal} jadwal kuliah kelas ${kelas.namaKelas} dimasukkan ke KRS ${kelas.jumlahMahasiswa} mahasiswa dengan status DISETUJUI. KRS semester 1 yang sudah ada akan ditimpa.`,
    tagihan: `Tagihan dihitung dari KRS & Master Tarif Kuliah untuk ${kelas.jumlahMahasiswa} mahasiswa. Sebaiknya generate KRS terlebih dahulu.`,
    'status-aktif': `${kelas.jumlahMahasiswa} mahasiswa dicatat AKTIF (AKM status A) pada periode tahun ajaran ini.`,
  };
  const ok = await confirmAction({
    title: `Generate ${AKSI_LABEL[aksi]} kelas ${kelas.namaKelas}?`,
    text: notes[aksi],
    confirmLabel: 'Ya, generate',
    danger: false,
  });
  if (!ok) return;

  generatingKey.value = `${kelas.namaKelas}|${aksi}`;
  try {
    const message = await generateNimApi.generate(aksi, { tahunAjaranId: Number(tahunAjaranId.value), namaKelas: kelas.namaKelas });
    toastSuccess(message);
    await Promise.all([fetchKelas(), fetchItems()]);
  } catch (err) {
    toastError(extractErrorMessage(err, `Gagal generate ${AKSI_LABEL[aksi]}`));
  } finally {
    generatingKey.value = null;
  }
};

// ---- Daftar mahasiswa baru ----
const items = ref<GenerateNimMahasiswa[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const page = ref(1);
const limit = ref(10);
const loading = ref(false);
const error = ref<string | null>(null);

const fetchItems = async () => {
  if (!tahunAjaranId.value) return;
  loading.value = true;
  error.value = null;
  try {
    const result = await generateNimApi.listMahasiswa({
      page: page.value,
      limit: limit.value,
      tahunAjaranId: Number(tahunAjaranId.value),
      jurusanId: jurusanFilter.value || undefined,
      namaKelas: kelasFilter.value || undefined,
      search: search.value || undefined,
    });
    items.value = result.data;
    meta.value = result.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data mahasiswa baru');
  } finally {
    loading.value = false;
  }
};

const reloadFromFirstPage = () => {
  selectedIds.value = new Set();
  if (page.value !== 1) page.value = 1;
  else fetchItems();
};

watch(page, fetchItems);
watch(limit, reloadFromFirstPage);
watch([jurusanFilter, kelasFilter], reloadFromFirstPage);
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(reloadFromFirstPage, 350);
});
watch(tahunAjaranId, () => {
  kelasFilter.value = '';
  fetchKelas();
  reloadFromFirstPage();
});

onMounted(async () => {
  const [tahunAjaran, jurusan] = await Promise.all([tahunAjaranApi.list({ limit: 100 }), jurusanApi.list({ limit: 100 })]);
  tahunAjaranOptions.value = tahunAjaran.data
    .slice()
    .sort((a, b) => b.tahunMulai - a.tahunMulai)
    .map((t) => ({ value: t.id, label: `${formatTahunAjaran(t)}${t.isActive ? ' (aktif)' : ''}` }));
  jurusanOptions.value = jurusan.data.map((j) => ({
    value: j.id,
    label: `${j.namaJurusan}${j.golonganKelas ? ` - ${j.golonganKelas.namaKelas}` : ''}`,
  }));
  tahunAjaranId.value = tahunAjaran.data.find((t) => t.isActive)?.id ?? tahunAjaranOptions.value[0]?.value ?? '';
});

const columns: DataTableColumn[] = [
  { key: 'pilih', label: '', align: 'center' },
  { key: 'nim', label: 'NIM' },
  { key: 'namaLengkap', label: 'Nama' },
  { key: 'jurusan', label: 'Program Studi' },
  { key: 'kelas', label: 'Kelas', align: 'center' },
  { key: 'namaKelas', label: 'Nama Kelas', align: 'center' },
  { key: 'krs', label: 'KRS', align: 'center' },
  { key: 'tagihan', label: 'Tagihan', align: 'right' },
  { key: 'statusAktif', label: 'Status', align: 'center' },
];

// ---- Pilih (checkbox) ----
const selectedIds = ref<Set<number>>(new Set());
const toggleSelect = (id: number) => {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
};
const allPageSelected = computed(() => items.value.length > 0 && items.value.every((i) => selectedIds.value.has(i.id)));
const toggleSelectPage = () => {
  const next = new Set(selectedIds.value);
  if (allPageSelected.value) items.value.forEach((i) => next.delete(i.id));
  else items.value.forEach((i) => next.add(i.id));
  selectedIds.value = next;
};

// ---- Modal: Pilih Kelas ----
const HURUF_KELAS = 'ABCDEFGHIJ'.split('').map((h) => ({ value: h, label: `Kelas ${h}` }));
const WAKTU_OPTIONS: { value: WaktuKode; label: string }[] = [
  { value: 'P', label: 'Pagi (P)' },
  { value: 'M', label: 'Malam (M)' },
];

const isKelasOpen = ref(false);
const kelasTargets = ref<GenerateNimMahasiswa[] | null>(null); // null = mahasiswa terpilih (checkbox)
const kelasHuruf = ref('A');
const kelasWaktu = ref<WaktuKode>('P');
const kelasSubmitting = ref(false);

const kelasTargetIds = computed(() => (kelasTargets.value ? kelasTargets.value.map((m) => m.id) : [...selectedIds.value]));

const openPilihKelas = (target?: GenerateNimMahasiswa) => {
  kelasTargets.value = target ? [target] : null;
  if (target?.kelas) kelasHuruf.value = target.kelas;
  if (target?.waktuKuliah) kelasWaktu.value = target.waktuKuliah === 'Malam' ? 'M' : 'P';
  isKelasOpen.value = true;
};

// Contoh nama kelas di modal — singkatan dari mahasiswa pertama yang dipilih (bila sudah diisi).
const previewSingkatan = computed(() => {
  const source = kelasTargets.value?.[0] ?? items.value.find((i) => selectedIds.value.has(i.id));
  return source?.jurusan?.singkatan ?? null;
});
const previewNamaKelas = computed(() => `${previewSingkatan.value ?? '??'}1${kelasHuruf.value}${kelasWaktu.value}`);

const handleSimpanKelas = async () => {
  if (!kelasTargetIds.value.length) return;
  kelasSubmitting.value = true;
  try {
    const message = await generateNimApi.setKelas({
      mahasiswaIds: kelasTargetIds.value,
      kelas: kelasHuruf.value,
      waktu: kelasWaktu.value,
    });
    toastSuccess(message);
    isKelasOpen.value = false;
    if (!kelasTargets.value) selectedIds.value = new Set();
    await Promise.all([fetchKelas(), fetchItems()]);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan kelas'));
  } finally {
    kelasSubmitting.value = false;
  }
};

const singkatanKosong = computed(() => items.value.some((i) => i.kelas && !i.jurusan?.singkatan));
</script>

<template>
  <div>
    <PageHeader
      title="Generate NIM"
      subtitle="Pilih kelas mahasiswa baru, lalu generate KRS & status aktif semester 1 per kelas. Tagihan diimpor bagian keuangan."
    />

    <div class="mb-4 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col md:flex-row gap-3">
      <div class="w-full md:w-72">
        <SelectInput v-model="tahunAjaranId" label="Tahun Ajaran" :options="tahunAjaranOptions" :clearable="false" />
      </div>
      <p class="text-label-sm text-on-surface-variant md:self-end md:pb-2">
        Nama kelas = singkatan prodi + semester + huruf kelas + P/M, mis. <strong>TI1AP</strong>. Nama ini harus sama
        dengan kolom Kelas di Jadwal Kuliah supaya KRS bisa digenerate.
      </p>
    </div>

    <!-- Ringkasan per kelas -->
    <section class="mb-6 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium flex items-center justify-between gap-2 flex-wrap">
        <span>Kelas Semester 1</span>
        <span v-if="belumAdaKelas" class="text-label-sm opacity-90">{{ belumAdaKelas }} mahasiswa belum punya kelas</span>
      </div>
      <DataTable
        :columns="kelasColumns"
        :items="kelasRows"
        :loading="kelasLoading"
        :show-actions="canCreate"
        empty-message="Belum ada kelas. Pilih kelas mahasiswa di tabel bawah terlebih dahulu."
      >
        <template #cell-namaKelas="{ item }">
          <span class="font-semibold">{{ item.namaKelas }}</span>
        </template>
        <template #cell-jumlahJadwal="{ item }">
          <span :class="item.jumlahJadwal ? '' : 'text-error'" :title="item.jumlahJadwal ? '' : 'Belum ada jadwal kuliah untuk kelas ini'">
            {{ item.jumlahJadwal }}
          </span>
        </template>
        <template #cell-jumlahKrs="{ item }">
          <span :class="progressClass(item.jumlahKrs, item.jumlahMahasiswa)">{{ item.jumlahKrs }}/{{ item.jumlahMahasiswa }}</span>
        </template>
        <template #cell-jumlahTagihan="{ item }">
          <span :class="progressClass(item.jumlahTagihan, item.jumlahMahasiswa)">{{ item.jumlahTagihan }}/{{ item.jumlahMahasiswa }}</span>
        </template>
        <template #cell-jumlahAktif="{ item }">
          <span :class="progressClass(item.jumlahAktif, item.jumlahMahasiswa)">{{ item.jumlahAktif }}/{{ item.jumlahMahasiswa }}</span>
        </template>
        <template #actions="{ item }">
          <div class="flex gap-2 justify-end flex-wrap">
            <AppButton
              variant="secondary"
              icon="assignment"
              :disabled="!!generatingKey"
              @click="handleGenerate(item, 'krs')"
            >
              {{ generatingKey === `${item.namaKelas}|krs` ? 'Memproses...' : 'KRS' }}
            </AppButton>
            <!-- Tagihan tidak lagi digenerate di sini: diimpor bagian keuangan (Keuangan > Tagihan Mahasiswa). -->
            <AppButton
              variant="secondary"
              icon="how_to_reg"
              :disabled="!!generatingKey"
              @click="handleGenerate(item, 'status-aktif')"
            >
              {{ generatingKey === `${item.namaKelas}|status-aktif` ? 'Memproses...' : 'Status Aktif' }}
            </AppButton>
          </div>
        </template>
      </DataTable>
    </section>

    <!-- Daftar mahasiswa baru -->
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Mahasiswa Baru</div>
      <div class="p-4 border-b border-outline-variant flex flex-col gap-3 bg-surface-bright">
        <SearchInput v-model="search" placeholder="Cari NIM atau nama..." />
        <div class="flex flex-col md:flex-row gap-3">
          <div class="w-full md:w-72">
            <SelectInput v-model="jurusanFilter" placeholder="Semua Program Studi" :options="jurusanOptions" />
          </div>
          <div class="w-full md:w-52">
            <SelectInput v-model="kelasFilter" placeholder="Semua Kelas" :options="kelasFilterOptions" />
          </div>
        </div>
      </div>

      <div
        v-if="singkatanKosong"
        class="px-4 py-3 text-body-sm bg-error-container text-on-error-container border-b border-outline-variant"
      >
        Sebagian program studi belum punya Singkatan Prodi, sehingga nama kelasnya belum terbentuk. Isi di Master &gt; Jurusan.
      </div>
      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-4 flex-wrap">
          <label class="flex items-center gap-2 text-label-md text-on-surface cursor-pointer">
            <input type="checkbox" class="w-4 h-4 accent-primary" :checked="allPageSelected" @change="toggleSelectPage" />
            Pilih semua di halaman ini
          </label>
          <AppButton v-if="canUpdate" icon="group_add" :disabled="!selectedIds.size" @click="openPilihKelas()">
            Pilih Kelas ({{ selectedIds.size }} terpilih)
          </AppButton>
        </div>
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable :columns="columns" :items="items" :loading="loading" :show-actions="canUpdate" empty-message="Tidak ada mahasiswa baru">
        <template #cell-pilih="{ item }">
          <input
            type="checkbox"
            class="w-4 h-4 accent-primary"
            :checked="selectedIds.has(item.id)"
            @change="toggleSelect(item.id)"
          />
        </template>
        <template #cell-jurusan="{ item }">
          {{ item.jurusan?.namaJurusan ?? '-' }}
          <span v-if="item.golonganKelas" class="block text-label-sm text-on-surface-variant">{{ item.golonganKelas.namaKelas }}</span>
        </template>
        <template #cell-kelas="{ item }">
          <template v-if="item.kelas">{{ item.kelas }} / {{ item.waktuKuliah === 'Malam' ? 'M' : item.waktuKuliah === 'Pagi' ? 'P' : '-' }}</template>
          <span v-else class="text-on-surface-variant">-</span>
        </template>
        <template #cell-namaKelas="{ item }">
          <span v-if="item.namaKelas" class="font-semibold">{{ item.namaKelas }}</span>
          <span v-else class="text-on-surface-variant">-</span>
        </template>
        <template #cell-krs="{ item }">
          <StatusBadge v-if="item.krs" :label="`${item.krs.jumlahMataKuliah} MK`" variant="success" />
          <span v-else class="text-on-surface-variant">-</span>
        </template>
        <template #cell-tagihan="{ item }">
          {{ item.tagihan ? formatCurrencyIdr(item.tagihan.totalTagihan) : '-' }}
        </template>
        <template #cell-statusAktif="{ item }">
          <StatusBadge v-if="item.statusAktif === 'A'" label="Aktif" variant="success" />
          <StatusBadge v-else label="Belum" variant="neutral" />
        </template>
        <template #actions="{ item }">
          <AppButton variant="secondary" icon="class" @click="openPilihKelas(item)">Pilih Kelas</AppButton>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <!-- Modal: Pilih Kelas -->
    <Modal
      v-model="isKelasOpen"
      title="Pilih Kelas"
      :subtitle="
        kelasTargets
          ? `${kelasTargets[0].namaLengkap} — ${kelasTargets[0].nim}`
          : `${selectedIds.size} mahasiswa terpilih`
      "
    >
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput v-model="kelasHuruf" label="Kelas" :options="HURUF_KELAS" :clearable="false" />
          <SelectInput v-model="kelasWaktu" label="Waktu Kuliah" :options="WAKTU_OPTIONS" :clearable="false" />
        </div>
        <div class="p-3 rounded-md bg-surface-container text-body-sm">
          Nama kelas semester 1: <strong class="text-primary">{{ previewNamaKelas }}</strong>
          <p v-if="!previewSingkatan" class="mt-1 text-label-sm text-error">
            Singkatan prodi belum diisi di Master &gt; Jurusan, nama kelas belum bisa terbentuk.
          </p>
          <p v-else-if="!kelasTargets" class="mt-1 text-label-sm text-on-surface-variant">
            Singkatan mengikuti prodi masing-masing mahasiswa.
          </p>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="isKelasOpen = false">Batal</AppButton>
        <AppButton :disabled="kelasSubmitting || !kelasTargetIds.length" @click="handleSimpanKelas">
          {{ kelasSubmitting ? 'Menyimpan...' : 'Simpan Kelas' }}
        </AppButton>
      </template>
    </Modal>
  </div>
</template>

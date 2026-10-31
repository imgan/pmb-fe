<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import CheckboxToggle from '@/components/ui/CheckboxToggle.vue';
import RowActions from '@/components/ui/RowActions.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import DosenKelasModal from '@/components/prodi/DosenKelasModal.vue';
import { http, extractErrorMessage } from '@/api/http';
import { jurusanApi } from '@/api/jurusan';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { toastSuccess } from '@/utils/swal';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { useProdiContext } from '@/composables/useProdiContext';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';
import type { ApiResponse, PagingMeta } from '@/types/common';

/**
 * Prodi → Dosen: daftar & CRUD dosen prodi sesi. Cakupan "Homebase" = dosen ber-homebase prodi;
 * "Pengajar" = dosen yang mengajar kelas prodi pada tahun akademik terpilih (termasuk dosen luar).
 * Tambah/ubah/hapus hanya untuk dosen homebase prodi sesi (backend juga membatasi).
 */
interface DosenProdi {
  id: number;
  /** NIP (kolom nik) — juga username login portal dosen. */
  nik: string | null;
  nidn: string;
  nuptk: string | null;
  namaLengkap: string;
  gelar: string | null;
  jenisKelamin: 'L' | 'P' | null;
  pendidikanAkhir: string | null;
  jabatanFungsional: string | null;
  statusDosen: 'TETAP' | 'TIDAK_TETAP' | null;
  jenisDosen: 'INTERNAL' | 'EKSTERNAL';
  telpHp: string | null;
  noWhatsapp: string | null;
  email: string | null;
  homebase: string | null;
  jumlahKelas: number | null;
  jurusanId: number | null;
  isActive: boolean;
}

const { prodi, prodiLocked, defaultJurusanId, tahunAjaranId: tahunAjaranSesi } = useProdiContext();
const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_DOSEN_MANAGEMENT);

/** Dosen homebase prodi sesi (yang boleh diubah/hapus); tanpa prodi sesi = semua. */
const milikProdi = (d: DosenProdi) => !prodi.value || (d.jurusanId !== null && prodi.value.jurusanIds.includes(d.jurusanId));

const CAKUPAN_OPTIONS = [
  { value: 'homebase', label: 'Homebase prodi' },
  { value: 'pengajar', label: 'Pengajar di prodi' },
];
const JENIS_OPTIONS = [
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'EKSTERNAL', label: 'Eksternal' },
];

const cakupan = ref<'homebase' | 'pengajar'>('homebase');
const jenisDosen = ref<'' | 'INTERNAL' | 'EKSTERNAL'>('');
const tahunAjaranId = ref<number | ''>(tahunAjaranSesi ?? '');
const tahunAjaranOptions = ref<{ value: number; label: string }[]>([]);

// Popup Detail: kelas yang diajar dosen + peran (penanggung jawab, SKS, isi kuesioner).
const detailOpen = ref(false);
const detailDosen = ref<DosenProdi | null>(null);
const openDetail = (row: DosenProdi) => {
  detailDosen.value = row;
  detailOpen.value = true;
};
const search = ref('');
const limit = ref(10);
const page = ref(1);
const items = ref<DosenProdi[]>([]);
const meta = ref<PagingMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
const periodeLabel = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const fetchItems = async () => {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await http.get<ApiResponse<{ items: DosenProdi[]; tahunAjaran: string | null }> & { meta: PagingMeta }>('/prodi/dosen', {
      params: {
        page: page.value,
        limit: limit.value,
        search: search.value || undefined,
        cakupan: cakupan.value,
        jenisDosen: jenisDosen.value || undefined,
        tahunAjaranId: cakupan.value === 'pengajar' ? tahunAjaranId.value || undefined : undefined,
      },
    });
    items.value = data.data.items;
    periodeLabel.value = data.data.tahunAjaran;
    meta.value = data.meta;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat daftar dosen');
  } finally {
    loading.value = false;
  }
};
const reload = () => {
  if (page.value === 1) fetchItems();
  else page.value = 1;
};
watch(page, fetchItems);
watch([limit, cakupan, jenisDosen, tahunAjaranId], reload);
let debounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(debounce);
  debounce = setTimeout(reload, 350);
});

const prodiOptions = ref<{ value: number; label: string }[]>([]);

// Kartu jumlah dosen per prodi homebase (sama dengan Master Dosen SDI); prodi sesi ditandai.
const STAT_STYLES = ['bg-[#1a5f9e]', 'bg-[#c9a83c]', 'bg-[#9c1c4c]', 'bg-[#2e7d5b]', 'bg-[#6a4c93]', 'bg-[#5b6472]'];
const stats = ref<{ kodeProdi: string | null; namaJurusan: string | null; total: number }[]>([]);
const loadStats = async () => {
  try {
    const { data } = await http.get<ApiResponse<typeof stats.value>>('/prodi/dosen/stats');
    stats.value = data.data;
  } catch {
    stats.value = [];
  }
};

onMounted(async () => {
  fetchItems();
  loadStats();
  jurusanApi
    .listProdi()
    .then(({ data }) => (prodiOptions.value = data.map((j) => ({ value: j.id, label: j.namaJurusan }))))
    .catch(() => (prodiOptions.value = []));
  try {
    const { data } = await tahunAjaranApi.list({ limit: 100 });
    tahunAjaranOptions.value = data
      .slice()
      .sort((a, b) => b.tahunMulai - a.tahunMulai || b.jenisSemester.localeCompare(a.jenisSemester))
      .map((t) => ({ value: t.id, label: `${formatTahunAjaran(t)}${t.isActive ? ' (aktif)' : ''}` }));
  } catch {
    tahunAjaranOptions.value = [];
  }
});

const columns = computed<DataTableColumn[]>(() => [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nik', label: 'NIP' },
  { key: 'nidn', label: 'NIDN / NUPTK' },
  { key: 'nama', label: 'Nama Dosen' },
  { key: 'jenisDosen', label: 'Jenis', align: 'center' },
  { key: 'pendidikanAkhir', label: 'Pendidikan' },
  { key: 'jabatanFungsional', label: 'Jabatan Fungsional' },
  { key: 'kontak', label: 'Kontak' },
  ...(cakupan.value === 'pengajar'
    ? [
        { key: 'homebase', label: 'Homebase' },
        { key: 'jumlahKelas', label: 'Jml Kelas', align: 'center' as const },
      ]
    : []),
]);
const rows = computed(() => items.value.map((d, i) => ({ ...d, no: (page.value - 1) * limit.value + i + 1 })));

const namaGelar = (d: DosenProdi) => [d.namaLengkap, d.gelar].filter(Boolean).join(', ');
const waLink = (no: string) => `https://wa.me/${no.replace(/\D/g, '').replace(/^0/, '62')}`;

const judul = computed(() => {
  const bagian = [prodi.value?.nama, cakupan.value === 'pengajar' ? periodeLabel.value : null].filter(Boolean);
  return `Daftar Dosen ${cakupan.value === 'pengajar' ? 'Pengajar' : 'Homebase'}${bagian.length ? ` · ${bagian.join(' · ')}` : ''}`;
});

// ---- Tambah / ubah / hapus (dosen homebase prodi) ----
const AGAMA_OPTIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'].map((v) => ({ value: v, label: v }));
const PENDIDIKAN_OPTIONS = ['S1', 'S2', 'S3', 'D3', 'D4', 'SMA/SMK'].map((v) => ({ value: v, label: v }));
const JABATAN_OPTIONS = ['Tenaga Pengajar', 'Asisten Ahli', 'Lektor', 'Lektor Kepala', 'Guru Besar'].map((v) => ({ value: v, label: v }));
const JK_OPTIONS = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
];
const STATUS_DOSEN_OPTIONS = [
  { value: 'TETAP', label: 'Tetap' },
  { value: 'TIDAK_TETAP', label: 'Tidak Tetap' },
];

interface FormState {
  nidn: string;
  nik: string;
  nuptk: string;
  namaLengkap: string;
  gelar: string;
  jurusanId: number | string | null;
  jenisKelamin: string | number | null;
  tempatLahir: string;
  tanggalLahir: string;
  agama: string | number | null;
  pendidikanAkhir: string | number | null;
  jabatanFungsional: string | number | null;
  statusDosen: string | number | null;
  jenisDosen: string | number | null;
  telpHp: string;
  noWhatsapp: string;
  email: string;
  alamat: string;
  isActive: boolean;
}
const emptyForm = (): FormState => ({
  nidn: '',
  nik: '',
  nuptk: '',
  namaLengkap: '',
  gelar: '',
  jurusanId: defaultJurusanId ?? '',
  jenisKelamin: '',
  tempatLahir: '',
  tanggalLahir: '',
  agama: '',
  pendidikanAkhir: '',
  jabatanFungsional: '',
  statusDosen: '',
  jenisDosen: 'INTERNAL',
  telpHp: '',
  noWhatsapp: '',
  email: '',
  alamat: '',
  isActive: true,
});

const isFormOpen = ref(false);
const editingId = ref<number | null>(null);
const form = ref<FormState>(emptyForm());
const errors = ref<Record<string, string>>({});
const formError = ref<string | null>(null);
const saving = ref(false);

const openCreate = () => {
  editingId.value = null;
  form.value = emptyForm();
  errors.value = {};
  formError.value = null;
  isFormOpen.value = true;
};

const openEdit = async (row: DosenProdi) => {
  errors.value = {};
  formError.value = null;
  try {
    const { data } = await http.get<ApiResponse<Record<string, unknown>>>(`/prodi/dosen/${row.id}`);
    const d = data.data;
    const str = (k: string) => (d[k] === null || d[k] === undefined ? '' : String(d[k]));
    editingId.value = row.id;
    form.value = {
      nidn: str('nidn'),
      nik: str('nik'),
      nuptk: str('nuptk'),
      namaLengkap: str('namaLengkap'),
      gelar: str('gelar'),
      jurusanId: (d.jurusanId as number | null) ?? '',
      jenisKelamin: str('jenisKelamin'),
      tempatLahir: str('tempatLahir'),
      tanggalLahir: str('tanggalLahir'),
      agama: str('agama'),
      pendidikanAkhir: str('pendidikanAkhir'),
      jabatanFungsional: str('jabatanFungsional'),
      statusDosen: str('statusDosen'),
      jenisDosen: str('jenisDosen') || 'INTERNAL',
      telpHp: str('telpHp'),
      noWhatsapp: str('noWhatsapp'),
      email: str('email'),
      alamat: str('alamat'),
      isActive: d.isActive !== false,
    };
    isFormOpen.value = true;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data dosen');
  }
};

const simpan = async () => {
  const f = form.value;
  errors.value = {};
  if (!f.nidn.trim()) errors.value.nidn = 'NIDN wajib diisi';
  if (!f.namaLengkap.trim()) errors.value.namaLengkap = 'Nama lengkap wajib diisi';
  if (!f.nik.trim()) errors.value.nik = 'NIP wajib diisi (username & password login portal dosen)';
  if (!prodiLocked.value && !f.jurusanId) errors.value.jurusanId = 'Prodi (homebase) wajib dipilih';
  if (Object.keys(errors.value).length) return;

  const teks = (v: string) => v.trim() || null;
  const pilih = (v: string | number | null) => (v === '' || v === null ? null : String(v));
  const payload = {
    nidn: f.nidn.trim(),
    nik: teks(f.nik),
    nuptk: teks(f.nuptk),
    namaLengkap: f.namaLengkap.trim(),
    gelar: teks(f.gelar),
    jurusanId: f.jurusanId ? Number(f.jurusanId) : null,
    jenisKelamin: pilih(f.jenisKelamin),
    tempatLahir: teks(f.tempatLahir),
    tanggalLahir: f.tanggalLahir || null,
    agama: pilih(f.agama),
    pendidikanAkhir: pilih(f.pendidikanAkhir),
    jabatanFungsional: pilih(f.jabatanFungsional),
    statusDosen: pilih(f.statusDosen),
    jenisDosen: pilih(f.jenisDosen) ?? 'INTERNAL',
    telpHp: teks(f.telpHp),
    noWhatsapp: teks(f.noWhatsapp),
    email: teks(f.email),
    alamat: teks(f.alamat),
    isActive: f.isActive,
  };
  saving.value = true;
  formError.value = null;
  try {
    if (editingId.value) await http.put(`/prodi/dosen/${editingId.value}`, payload);
    else await http.post('/prodi/dosen', payload);
    toastSuccess(editingId.value ? 'Data dosen diperbarui' : `Dosen ditambahkan. Login portal dosen: NIP ${payload.nik} / password ${payload.nik}`);
    isFormOpen.value = false;
    fetchItems();
    loadStats();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan data dosen');
  } finally {
    saving.value = false;
  }
};

const deleteTarget = ref<DosenProdi | null>(null);
const deleting = ref(false);
const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await http.delete(`/prodi/dosen/${deleteTarget.value.id}`);
    toastSuccess('Dosen dihapus');
    deleteTarget.value = null;
    fetchItems();
    loadStats();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal menghapus dosen');
    deleteTarget.value = null;
  } finally {
    deleting.value = false;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Dosen" subtitle="Daftar dosen homebase dan dosen pengajar di program studi.">
      <template v-if="canCreate" #actions>
        <AppButton icon="add" @click="openCreate">Tambah Dosen</AppButton>
      </template>
    </PageHeader>

    <section v-if="stats.length" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div
        v-for="(stat, index) in stats"
        :key="stat.kodeProdi ?? '-'"
        class="rounded-lg p-4 text-on-primary"
        :class="[STAT_STYLES[index % STAT_STYLES.length], prodi && stat.kodeProdi === prodi.kodeProdi ? 'ring-4 ring-offset-2 ring-primary' : '']"
      >
        <p class="font-bold text-display-lg">{{ stat.total }}</p>
        <p class="text-label-md opacity-90">{{ stat.namaJurusan ?? 'Belum Ada Prodi' }}</p>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">{{ judul }}</div>

      <div class="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="w-full sm:w-52">
            <SelectInput v-model="cakupan" label="Cakupan" :options="CAKUPAN_OPTIONS" :clearable="false" />
          </div>
          <div v-if="cakupan === 'pengajar'" class="w-full sm:w-60">
            <SelectInput v-model="tahunAjaranId" label="Tahun Akademik" placeholder="Tahun akademik aktif" :options="tahunAjaranOptions" />
          </div>
          <div class="w-full sm:w-40">
            <SelectInput v-model="jenisDosen" label="Jenis Dosen" placeholder="Semua" :options="JENIS_OPTIONS" />
          </div>
        </div>
        <SearchInput v-model="search" placeholder="Cari nama, NIP, NIDN, NUPTK, email..." />
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="px-4 py-3 border-b border-outline-variant">
        <PageSizeSelect v-model="limit" />
      </div>

      <DataTable :columns="columns" :items="rows" :loading="loading" :show-actions="canUpdate || canDelete" empty-message="Belum ada data dosen">
        <template #cell-nik="{ item }"><span class="whitespace-nowrap">{{ item.nik || '-' }}</span></template>
        <template #cell-nidn="{ item }">
          <div>{{ item.nidn || '-' }}</div>
          <div v-if="item.nuptk" class="text-label-sm text-on-surface-variant">NUPTK {{ item.nuptk }}</div>
        </template>
        <template #cell-nama="{ item }">
          <div class="font-medium">{{ namaGelar(item) }}</div>
          <div v-if="item.statusDosen" class="text-label-sm text-on-surface-variant">{{ item.statusDosen === 'TETAP' ? 'Dosen Tetap' : 'Dosen Tidak Tetap' }}</div>
          <StatusBadge v-if="!item.isActive" label="Non-aktif" variant="neutral" class="mt-1" />
        </template>
        <template #cell-jenisDosen="{ item }">
          <StatusBadge :label="item.jenisDosen === 'INTERNAL' ? 'Internal' : 'Eksternal'" :variant="item.jenisDosen === 'INTERNAL' ? 'success' : 'neutral'" />
        </template>
        <template #cell-pendidikanAkhir="{ item }">{{ item.pendidikanAkhir || '-' }}</template>
        <template #cell-jabatanFungsional="{ item }">{{ item.jabatanFungsional || '-' }}</template>
        <template #cell-kontak="{ item }">
          <div v-if="item.email" class="break-all">
            <a :href="`mailto:${item.email}`" class="text-primary hover:underline">{{ item.email }}</a>
          </div>
          <div v-if="item.noWhatsapp">
            <a :href="waLink(item.noWhatsapp)" target="_blank" rel="noopener" class="text-primary hover:underline">WA {{ item.noWhatsapp }}</a>
          </div>
          <div v-else-if="item.telpHp">{{ item.telpHp }}</div>
          <span v-if="!item.email && !item.noWhatsapp && !item.telpHp" class="text-on-surface-variant">-</span>
        </template>
        <template #cell-homebase="{ item }">{{ item.homebase || '-' }}</template>
        <template #cell-jumlahKelas="{ item }">{{ item.jumlahKelas ?? '-' }}</template>
        <template #actions="{ item }">
          <div class="flex items-center justify-end gap-3">
            <button
              type="button"
              class="text-on-surface-variant hover:text-primary transition-colors"
              title="Detail kelas yang diajar"
              @click="openDetail(item)"
            >
              <span class="material-symbols-outlined" style="font-size: 20px">visibility</span>
            </button>
            <RowActions
              v-if="milikProdi(item)"
              :can-update="canUpdate"
              :can-delete="canDelete"
              @edit="openEdit(item)"
              @delete="deleteTarget = item"
            />
          </div>
        </template>
      </DataTable>

      <Pagination v-model="page" :meta="meta" />
    </section>

    <Modal v-model="isFormOpen" :title="editingId ? 'Ubah Dosen' : 'Tambah Dosen'" size="lg">
      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="simpan">
        <div v-if="formError" class="md:col-span-2 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <TextInput v-model="form.nidn" label="NIDN" required :error="errors.nidn" />
        <TextInput v-model="form.nuptk" label="NUPTK" />
        <TextInput v-model="form.namaLengkap" label="Nama Lengkap" required :error="errors.namaLengkap" />
        <TextInput v-model="form.gelar" label="Gelar" placeholder="Contoh: S.Kep., M.Kes" />
        <SelectInput
          v-model="form.jurusanId"
          label="Prodi (Homebase)"
          :required="!prodiLocked"
          placeholder="--Pilih prodi--"
          :options="prodiOptions"
          :disabled="prodiLocked"
          :error="errors.jurusanId"
        />
        <TextInput
          v-model="form.nik"
          label="NIP"
          required
          placeholder="Contoh: D-2501036"
          hint="Dipakai login portal dosen: username & password awal = NIP"
          :error="errors.nik"
        />
        <SelectInput v-model="form.jenisKelamin" label="Jenis Kelamin" placeholder="--Pilih--" :options="JK_OPTIONS" />
        <SelectInput v-model="form.agama" label="Agama" placeholder="--Pilih--" :options="AGAMA_OPTIONS" />
        <TextInput v-model="form.tempatLahir" label="Tempat Lahir" />
        <DateInput v-model="form.tanggalLahir" label="Tanggal Lahir" />
        <SelectInput v-model="form.pendidikanAkhir" label="Pendidikan Akhir" placeholder="--Pilih--" :options="PENDIDIKAN_OPTIONS" />
        <SelectInput v-model="form.jabatanFungsional" label="Jabatan Fungsional" placeholder="--Pilih--" :options="JABATAN_OPTIONS" />
        <SelectInput v-model="form.statusDosen" label="Status Dosen" placeholder="--Pilih--" :options="STATUS_DOSEN_OPTIONS" />
        <SelectInput v-model="form.jenisDosen" label="Jenis Dosen" :options="JENIS_OPTIONS" :clearable="false" />
        <TextInput v-model="form.telpHp" label="Telp/HP" />
        <TextInput v-model="form.noWhatsapp" label="No WhatsApp" />
        <TextInput v-model="form.email" type="email" label="Email" class="md:col-span-2" />
        <TextareaInput v-model="form.alamat" label="Alamat" class="md:col-span-2" :rows="2" />
        <CheckboxToggle v-model="form.isActive" label="Aktif" description="Dosen nonaktif tidak muncul di pilihan dosen lain." />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="isFormOpen = false">Batal</AppButton>
        <AppButton :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Hapus Dosen"
      :message="`Hapus dosen ${deleteTarget?.namaLengkap ?? ''}? Data dosen tidak lagi muncul di daftar.`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
    <DosenKelasModal
      v-model="detailOpen"
      :dosen-id="detailDosen?.id ?? null"
      :dosen-nama="detailDosen?.namaLengkap"
      :tahun-ajaran-options="tahunAjaranOptions"
      :tahun-ajaran-awal="cakupan === 'pengajar' ? tahunAjaranId : tahunAjaranSesi"
      :can-edit="canUpdate"
    />
  </div>
</template>

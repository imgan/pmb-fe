<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import TextInput from '@/components/ui/TextInput.vue';
import TextareaInput from '@/components/ui/TextareaInput.vue';
import DateInput from '@/components/ui/DateInput.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import KalenderBulanan from '@/components/KalenderBulanan.vue';
import {
  durasiHari,
  kalenderAkademikApi,
  KATEGORI_BY,
  KATEGORI_KALENDER,
  rentangTanggal,
  ymd,
  type KategoriKalender,
  type KegiatanKalender,
} from '@/api/kalenderAkademik';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';
import { downloadBlob, openBlob } from '@/utils/download';
import { toastError, toastSuccess } from '@/utils/swal';

/**
 * BAAK → Kalender Akademik: kegiatan akademik per tahun akademik dengan kategori berwarna (KKN, PKL,
 * perkuliahan, pembayaran, libur, wisuda, seminar, dst. — lihat KATEGORI_KALENDER). Tampilan kalender
 * bulanan (klik tanggal kosong = tambah, klik kegiatan = ubah) atau daftar; Export Excel & Print PDF
 * mengikuti filter. Tanggal disimpan sebagai YYYY-MM-DD tanpa zona waktu.
 */
const { canCreate, canUpdate, canDelete } = usePermission(MENU.BAAK_KALENDER_AKADEMIK_MANAGEMENT);

const tahunAjaranOptions = ref<{ value: number; label: string }[]>([]);
const tahunAjaranId = ref<number | ''>('');
const kategori = ref<KategoriKalender | ''>('');
const tampilan = ref<'kalender' | 'daftar'>('kalender');

const items = ref<KegiatanKalender[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const kategoriOptions = KATEGORI_KALENDER.map((k) => ({ value: k.value, label: k.label }));
const hariIni = ymd(new Date());

const filter = () => ({ tahunAjaranId: Number(tahunAjaranId.value) || undefined, kategori: kategori.value || undefined });

const fetchData = async () => {
  if (!tahunAjaranId.value) return;
  loading.value = true;
  error.value = null;
  try {
    items.value = await kalenderAkademikApi.list(filter());
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kalender akademik');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const { data } = await tahunAjaranApi.list({ limit: 100 });
    const sorted = data.slice().sort((a, b) => b.tahunMulai - a.tahunMulai || b.jenisSemester.localeCompare(a.jenisSemester));
    tahunAjaranOptions.value = sorted.map((t) => ({ value: t.id, label: `${formatTahunAjaran(t)}${t.isActive ? ' (aktif)' : ''}` }));
    tahunAjaranId.value = sorted.find((t) => t.isActive)?.id ?? sorted[0]?.id ?? '';
  } catch {
    tahunAjaranOptions.value = [];
  }
  await fetchData();
});
watch([tahunAjaranId, kategori], fetchData);

const periodeLabel = computed(() => tahunAjaranOptions.value.find((t) => t.value === tahunAjaranId.value)?.label ?? '-');

// ---- Export Excel & Print ----
const exporting = ref(false);
const printing = ref(false);
const handleExport = async () => {
  exporting.value = true;
  try {
    const { blob, filename } = await kalenderAkademikApi.exportExcel(filter());
    downloadBlob(blob, filename);
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal export Excel'));
  } finally {
    exporting.value = false;
  }
};
const handlePrint = async () => {
  printing.value = true;
  try {
    openBlob(await kalenderAkademikApi.pdf(filter()));
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membuka cetak kalender'));
  } finally {
    printing.value = false;
  }
};

// ---- Tambah / ubah ----
const formOpen = ref(false);
const editing = ref<KegiatanKalender | null>(null);
const form = reactive({ namaKegiatan: '', kategori: 'PERKULIAHAN' as KategoriKalender | '', tanggalMulai: '', tanggalSelesai: '', keterangan: '' as string | null });
const formErrors = reactive<Record<string, string>>({});
const formError = ref<string | null>(null);
const saving = ref(false);

const openForm = (row: KegiatanKalender | null = null, tanggal?: string) => {
  editing.value = row;
  Object.keys(formErrors).forEach((k) => delete formErrors[k]);
  formError.value = null;
  Object.assign(form, {
    namaKegiatan: row?.namaKegiatan ?? '',
    kategori: row?.kategori ?? (kategori.value || 'PERKULIAHAN'),
    tanggalMulai: row?.tanggalMulai ?? tanggal ?? '',
    tanggalSelesai: row?.tanggalSelesai ?? tanggal ?? '',
    keterangan: row?.keterangan ?? '',
  });
  formOpen.value = true;
};
const klikTanggal = (tgl: string) => {
  if (canCreate.value) openForm(null, tgl);
};
const klikKegiatan = (k: KegiatanKalender) => {
  if (canUpdate.value) openForm(k);
  else detail.value = k;
};
const detail = ref<KegiatanKalender | null>(null);
const detailOpen = computed({
  get: () => !!detail.value,
  set: (v: boolean) => {
    if (!v) detail.value = null;
  },
});

watch(
  () => form.tanggalMulai,
  (v) => {
    if (v && (!form.tanggalSelesai || form.tanggalSelesai < v)) form.tanggalSelesai = v;
  }
);

const simpan = async () => {
  Object.keys(formErrors).forEach((k) => delete formErrors[k]);
  formError.value = null;
  if (form.namaKegiatan.trim().length < 2) formErrors.namaKegiatan = 'Nama kegiatan wajib diisi';
  if (!form.kategori) formErrors.kategori = 'Kategori wajib dipilih';
  if (!form.tanggalMulai) formErrors.tanggalMulai = 'Tanggal mulai wajib diisi';
  if (!form.tanggalSelesai) formErrors.tanggalSelesai = 'Tanggal selesai wajib diisi';
  else if (form.tanggalMulai && form.tanggalSelesai < form.tanggalMulai) formErrors.tanggalSelesai = 'Tidak boleh sebelum tanggal mulai';
  if (Object.keys(formErrors).length) return;
  saving.value = true;
  try {
    const payload = {
      tahunAjaranId: editing.value?.tahunAjaranId ?? Number(tahunAjaranId.value),
      namaKegiatan: form.namaKegiatan.trim(),
      kategori: form.kategori as KategoriKalender,
      tanggalMulai: form.tanggalMulai,
      tanggalSelesai: form.tanggalSelesai,
      keterangan: form.keterangan?.trim() || null,
    };
    if (editing.value) await kalenderAkademikApi.update(editing.value.id, payload);
    else await kalenderAkademikApi.create(payload);
    toastSuccess(editing.value ? 'Kegiatan diperbarui' : 'Kegiatan ditambahkan');
    formOpen.value = false;
    fetchData();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan kegiatan');
  } finally {
    saving.value = false;
  }
};

// ---- Hapus ----
const deleting = ref<KegiatanKalender | null>(null);
const deleteLoading = ref(false);
const confirmDelete = async () => {
  if (!deleting.value) return;
  deleteLoading.value = true;
  try {
    await kalenderAkademikApi.remove(deleting.value.id);
    toastSuccess('Kegiatan dihapus');
    formOpen.value = false;
    fetchData();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus kegiatan'));
  } finally {
    deleteLoading.value = false;
    deleting.value = null;
  }
};
</script>

<template>
  <div>
    <PageHeader title="Kalender Akademik" subtitle="Jadwal kegiatan akademik per tahun akademik: perkuliahan, registrasi/KRS, ujian, libur, wisuda, dan lainnya.">
      <template #actions>
        <AppButton variant="secondary" icon="download" :disabled="exporting || !tahunAjaranId" @click="handleExport">
          {{ exporting ? 'Mengunduh...' : 'Export Excel' }}
        </AppButton>
        <AppButton variant="secondary" icon="print" :disabled="printing || !tahunAjaranId" @click="handlePrint">
          {{ printing ? 'Membuka...' : 'Print' }}
        </AppButton>
        <AppButton v-if="canCreate" icon="add" :disabled="!tahunAjaranId" @click="openForm()">Tambah Kegiatan</AppButton>
      </template>
    </PageHeader>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-6 flex flex-col md:flex-row md:items-end gap-4">
      <div class="w-full md:w-72">
        <SelectInput v-model="tahunAjaranId" label="Tahun Akademik" :options="tahunAjaranOptions" :clearable="false" placeholder="Pilih tahun akademik" />
      </div>
      <div class="w-full md:w-56">
        <SelectInput v-model="kategori" label="Kategori" :options="kategoriOptions" placeholder="Semua Kategori" />
      </div>
      <div class="md:ml-auto inline-flex rounded-md border border-outline-variant overflow-hidden" role="tablist">
        <button
          v-for="t in [{ key: 'kalender', label: 'Kalender', icon: 'calendar_month' }, { key: 'daftar', label: 'Daftar', icon: 'list' }] as const"
          :key="t.key"
          type="button"
          role="tab"
          :aria-selected="tampilan === t.key"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-label-md"
          :class="tampilan === t.key ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'"
          @click="tampilan = t.key"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">{{ t.icon }}</span>
          {{ t.label }}
        </button>
      </div>
    </section>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <KalenderBulanan
      v-if="tampilan === 'kalender'"
      :items="items"
      :loading="loading"
      :reset-key="tahunAjaranId"
      :tanggal-bisa-diklik="canCreate"
      :kosong-pesan="`Belum ada kegiatan pada ${periodeLabel}.${canCreate ? ' Klik tanggal pada kalender atau tombol Tambah Kegiatan.' : ''}`"
      @tanggal="klikTanggal"
      @kegiatan="klikKegiatan"
      @lainnya="tampilan = 'daftar'"
    />

    <section v-if="tampilan === 'daftar'" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-body-sm">
          <thead class="bg-primary text-on-primary text-label-md">
            <tr>
              <th class="px-3 py-2.5 w-12 text-center">No</th>
              <th class="px-3 py-2.5 text-left">Kegiatan</th>
              <th class="px-3 py-2.5 text-left">Kategori</th>
              <th class="px-3 py-2.5 text-left">Tanggal</th>
              <th class="px-3 py-2.5 text-center">Durasi</th>
              <th class="px-3 py-2.5 text-left">Keterangan</th>
              <th v-if="canUpdate || canDelete" class="px-3 py-2.5 w-24 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="p-6 text-center text-on-surface-variant">Memuat...</td>
            </tr>
            <tr v-else-if="!items.length">
              <td colspan="7" class="p-6 text-center text-on-surface-variant">Belum ada kegiatan pada {{ periodeLabel }}.</td>
            </tr>
            <template v-else>
              <tr
                v-for="(k, i) in items"
                :key="k.id"
                class="border-t border-outline-variant"
                :class="k.tanggalMulai <= hariIni && k.tanggalSelesai >= hariIni ? 'bg-primary/5' : ''"
              >
                <td class="px-3 py-2.5 text-center tabular-nums">{{ i + 1 }}</td>
                <td class="px-3 py-2.5 font-medium text-on-surface">
                  {{ k.namaKegiatan }}
                  <span v-if="k.tanggalMulai <= hariIni && k.tanggalSelesai >= hariIni" class="ml-1 px-2 py-0.5 rounded-full bg-primary text-on-primary text-label-sm">
                    Berlangsung
                  </span>
                </td>
                <td class="px-3 py-2.5">
                  <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span class="w-2.5 h-2.5 rounded-sm border border-outline-variant" :style="{ background: KATEGORI_BY[k.kategori].color }"></span>
                    {{ KATEGORI_BY[k.kategori].label }}
                  </span>
                </td>
                <td class="px-3 py-2.5 whitespace-nowrap">{{ rentangTanggal(k) }}</td>
                <td class="px-3 py-2.5 text-center tabular-nums">{{ durasiHari(k) }} hari</td>
                <td class="px-3 py-2.5 text-on-surface-variant">{{ k.keterangan || '-' }}</td>
                <td v-if="canUpdate || canDelete" class="px-3 py-2.5">
                  <div class="flex items-center justify-center gap-3">
                    <button v-if="canUpdate" type="button" class="text-on-surface-variant hover:text-primary" title="Ubah" @click="openForm(k)">
                      <span class="material-symbols-outlined" style="font-size: 20px">edit</span>
                    </button>
                    <button v-if="canDelete" type="button" class="text-on-surface-variant hover:text-error" title="Hapus" @click="deleting = k">
                      <span class="material-symbols-outlined" style="font-size: 20px">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <Modal v-model="formOpen" :title="editing ? 'Ubah Kegiatan' : 'Tambah Kegiatan'" :subtitle="periodeLabel" size="md">
      <form class="space-y-4" @submit.prevent="simpan">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <TextInput v-model="form.namaKegiatan" label="Nama Kegiatan" required placeholder="mis. Ujian Tengah Semester" :error="formErrors.namaKegiatan" />
        <SelectInput v-model="form.kategori" label="Kategori" :options="kategoriOptions" :clearable="false" required :error="formErrors.kategori" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DateInput v-model="form.tanggalMulai" label="Tanggal Mulai" required :error="formErrors.tanggalMulai" />
          <DateInput v-model="form.tanggalSelesai" label="Tanggal Selesai" required :min="form.tanggalMulai || undefined" :error="formErrors.tanggalSelesai" />
        </div>
        <TextareaInput v-model="form.keterangan" label="Keterangan" :rows="3" placeholder="Opsional" />
      </form>
      <template #footer>
        <AppButton v-if="editing && canDelete" variant="danger" icon="delete" class="mr-auto" @click="deleting = editing">Hapus</AppButton>
        <AppButton variant="secondary" @click="formOpen = false">Batal</AppButton>
        <AppButton :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>

    <Modal v-model="detailOpen" :title="detail?.namaKegiatan ?? ''" size="md">
      <dl v-if="detail" class="space-y-2 text-body-md">
        <div class="flex gap-3"><dt class="w-28 text-on-surface-variant">Kategori</dt><dd>{{ KATEGORI_BY[detail.kategori].label }}</dd></div>
        <div class="flex gap-3"><dt class="w-28 text-on-surface-variant">Tanggal</dt><dd>{{ rentangTanggal(detail) }} ({{ durasiHari(detail) }} hari)</dd></div>
        <div class="flex gap-3"><dt class="w-28 text-on-surface-variant">Keterangan</dt><dd>{{ detail.keterangan || '-' }}</dd></div>
      </dl>
    </Modal>

    <ConfirmDialog
      :open="!!deleting"
      title="Hapus Kegiatan"
      :message="`Hapus kegiatan &quot;${deleting?.namaKegiatan ?? ''}&quot;?`"
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import FileInput from '@/components/ui/FileInput.vue';
import RichTextEditor from '@/components/ui/RichTextEditor.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import RpsSalinPeriodeModal from './RpsSalinPeriodeModal.vue';
import { BENTUK_PEMBELAJARAN_LABEL, JENIS_PERTEMUAN_LABEL, useRpsApi, type BentukPembelajaran, type JenisPertemuan, type RpsDetail, type RpsPeriode, type RpsPertemuan } from '@/api/rps';
import { extractErrorMessage } from '@/api/http';
import type { ImportResult } from '@/types/common';
import { downloadBlob } from '@/utils/download';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';
import { btnAksi, htmlKeTeks, inputCls } from './shared';

// Klien RPS sesuai portal (Prodi / Dosen) dari halaman RPS.
const rpsApi = useRpsApi();

/**
 * Menu "Rencana Pembelajaran": daftar rencana tiap sesi pada periode terpilih (Tambah / Salin Data /
 * Upload Excel di bar atas) dan form "Detail Rencana Pembelajaran" yang menggantikan daftar saat
 * tambah/ubah (tombol Simpan di bar atas; "Kembali ke Daftar" menutup form).
 */
const props = defineProps<{
  mkId: number;
  detail: RpsDetail;
  tahunAjaranId: number;
  namaPeriode: string;
  periode: RpsPeriode;
  mkOptions: SelectOption[];
  tahunAjaranOptions: SelectOption[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}>();
const emit = defineEmits<{ reload: [] }>();

const JENIS_OPTIONS: SelectOption[] = Object.entries(JENIS_PERTEMUAN_LABEL).map(([value, label]) => ({ value, label }));
const BENTUK_OPTIONS: SelectOption[] = Object.entries(BENTUK_PEMBELAJARAN_LABEL).map(([value, label]) => ({ value, label }));
const cpmkInduk = computed(() => props.detail.cpmk.filter((c) => !c.parentId));
const subOf = (id: number) => props.detail.cpmk.filter((c) => c.parentId === id);
/** CPMK/Sub-CPMK terpilih satu sesi, urut seperti Pemetaan CPMK (induk lalu sub-nya). */
const cpmkSesi = (ids: number[]) => cpmkInduk.value.flatMap((c) => [c, ...subOf(c.id)]).filter((c) => ids.includes(c.id));
// ---- Lihat detail satu sesi (tombol mata) ----
const lihat = ref<RpsPertemuan | null>(null);
const ubahDariLihat = () => {
  const p = lihat.value;
  lihat.value = null;
  if (p) buka(p);
};
const totalBobot = computed(() => Math.round(props.periode.pertemuan.reduce((s, p) => s + (p.bobot ?? 0), 0) * 100) / 100);

// ---- Form Detail Rencana Pembelajaran ----
interface Draft {
  sesi: string | number;
  jenisPertemuan: string | number | null;
  cpmkIds: number[];
  materi: string;
  materiEn: string;
  indikator: string;
  kriteriaPenilaian: string;
  bentukPembelajaran: string | number | null;
  metodePembelajaran: string;
  waktu: string;
  bobot: string | number;
  referensi: string;
}
const kosong = (): Draft => ({
  sesi: (props.periode.pertemuan.at(-1)?.sesi ?? 0) + 1,
  jenisPertemuan: '',
  cpmkIds: [],
  materi: '',
  materiEn: '',
  indikator: '',
  kriteriaPenilaian: '',
  bentukPembelajaran: 'LURING',
  metodePembelajaran: '',
  waktu: '',
  bobot: '',
  referensi: '',
});
/** null = mode daftar; 'new' = tambah; angka = id yang diubah. */
const editing = ref<number | 'new' | null>(null);
const form = reactive<Draft>(kosong());
const formError = ref<string | null>(null);
const saving = ref(false);

const buka = (item: RpsPertemuan | null) => {
  Object.assign(
    form,
    item
      ? {
          sesi: item.sesi,
          jenisPertemuan: item.jenisPertemuan,
          cpmkIds: [...item.cpmkIds],
          materi: item.materi,
          materiEn: item.materiEn ?? '',
          indikator: item.indikator ?? '',
          kriteriaPenilaian: item.kriteriaPenilaian ?? '',
          bentukPembelajaran: item.bentukPembelajaran ?? '',
          metodePembelajaran: item.metodePembelajaran ?? '',
          waktu: item.waktu ?? '',
          bobot: item.bobot ?? '',
          referensi: item.referensi ?? '',
        }
      : kosong(),
  );
  formError.value = null;
  editing.value = item ? item.id : 'new';
};
const tutup = () => {
  editing.value = null;
  formError.value = null;
};
/** Dipanggil tombol "Kembali ke Daftar" halaman induk: tutup form dulu bila sedang terbuka. */
const kembali = () => {
  if (editing.value === null) return false;
  tutup();
  return true;
};
defineExpose({ kembali });

const toggleCpmk = (id: number) => {
  form.cpmkIds = form.cpmkIds.includes(id) ? form.cpmkIds.filter((x) => x !== id) : [...form.cpmkIds, id];
};
const kosongHtml = (html: string) => !htmlKeTeks(html).trim();

const simpan = async () => {
  const sesi = Number(form.sesi);
  if (!Number.isInteger(sesi) || sesi < 1) return (formError.value = 'Pertemuan (sesi) ke wajib diisi angka ≥ 1');
  if (!form.jenisPertemuan) return (formError.value = 'Jenis pertemuan wajib dipilih');
  if (kosongHtml(form.materi)) return (formError.value = 'Materi perkuliahan (IND) wajib diisi');
  const bobot = form.bobot === '' || form.bobot === null ? null : Number(form.bobot);
  if (bobot !== null && (Number.isNaN(bobot) || bobot < 0 || bobot > 100)) return (formError.value = 'Bobot penilaian harus 0–100');
  saving.value = true;
  formError.value = null;
  try {
    const id = editing.value;
    await rpsApi.savePertemuan(
      props.mkId,
      {
        tahunAjaranId: props.tahunAjaranId,
        sesi,
        jenisPertemuan: form.jenisPertemuan as JenisPertemuan,
        cpmkIds: form.cpmkIds,
        materi: form.materi,
        materiEn: kosongHtml(form.materiEn) ? null : form.materiEn,
        indikator: form.indikator.trim() || null,
        kriteriaPenilaian: form.kriteriaPenilaian.trim() || null,
        bentukPembelajaran: (form.bentukPembelajaran || null) as BentukPembelajaran | null,
        metodePembelajaran: form.metodePembelajaran.trim() || null,
        waktu: form.waktu.trim() || null,
        bobot,
        referensi: form.referensi.trim() || null,
      },
      typeof id === 'number' ? id : undefined,
    );
    toastSuccess(typeof id === 'number' ? 'Rencana pembelajaran diperbarui' : 'Rencana pembelajaran ditambahkan');
    tutup();
    emit('reload');
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan rencana pembelajaran');
  } finally {
    saving.value = false;
  }
};

const hapus = async (item: RpsPertemuan) => {
  const ok = await confirmAction({ title: `Hapus rencana sesi ${item.sesi}?`, confirmLabel: 'Ya, hapus' });
  if (!ok) return;
  try {
    await rpsApi.remove('pertemuan', props.mkId, item.id);
    toastSuccess(`Sesi ${item.sesi} dihapus`);
    emit('reload');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus'));
  }
};

// ---- Salin Data ----
const salinOpen = ref(false);

// ---- Upload Excel ----
const uploadOpen = ref(false);
const uploadFile = ref<string | null>(null);
const uploadResult = ref<ImportResult | null>(null);
const uploading = ref(false);
const bukaUpload = () => {
  uploadFile.value = null;
  uploadResult.value = null;
  uploadOpen.value = true;
};
const unduhTemplate = async () => {
  try {
    downloadBlob(await rpsApi.templatePertemuan(), 'template-rencana-pembelajaran.xlsx');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal mengunduh template'));
  }
};
const upload = async () => {
  if (!uploadFile.value) return toastError('Pilih file Excel terlebih dahulu');
  uploading.value = true;
  try {
    uploadResult.value = await rpsApi.importPertemuan(props.mkId, props.tahunAjaranId, uploadFile.value);
    if (uploadResult.value.successCount) emit('reload');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal upload Excel'));
  } finally {
    uploading.value = false;
  }
};
</script>

<template>
  <Teleport defer to="#rps-aksi">
    <template v-if="editing === null">
      <template v-if="canCreate">
        <AppButton icon="add" @click="buka(null)">Tambah</AppButton>
        <AppButton variant="secondary" icon="content_copy" @click="salinOpen = true">Salin Data</AppButton>
        <AppButton variant="secondary" icon="upload" @click="bukaUpload">Upload Excel</AppButton>
      </template>
    </template>
    <AppButton v-else-if="canCreate || canUpdate" icon="save" :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
  </Teleport>

  <!-- Daftar rencana pembelajaran -->
  <section v-if="editing === null" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-x-auto">
    <table class="w-full text-body-sm border-collapse">
      <thead class="bg-primary text-on-primary">
        <tr>
          <th class="p-3 text-center w-14">Sesi</th>
          <th class="p-3 text-left min-w-[18rem]">CPMK &amp; Sub-CPMK</th>
          <th class="p-3 text-left min-w-36">Materi Perkuliahan</th>
          <th class="p-3 text-left min-w-48">Indikator Penilaian</th>
          <th class="p-3 text-left min-w-56">Metode Pembelajaran</th>
          <th class="p-3 text-center w-16">Aksi</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-outline-variant align-top">
        <tr v-if="!periode.pertemuan.length">
          <td colspan="6" class="p-6 text-center text-on-surface-variant">
            Anda belum menambahkan Rencana Pembelajaran. Silahkan klik tombol hijau <strong>Tambah</strong> di atas untuk menambahkan.
          </td>
        </tr>
        <tr v-for="p in periode.pertemuan" :key="p.id">
          <td class="p-3 text-center font-semibold">{{ p.sesi }}</td>
          <!-- CPMK & Sub-CPMK: kode + deskripsi; sub ditandai ↳ -->
          <td class="p-3">
            <div v-if="cpmkSesi(p.cpmkIds).length" class="space-y-2">
              <div v-for="c in cpmkSesi(p.cpmkIds)" :key="c.id" :class="c.parentId ? 'pl-5' : ''">
                <p class="text-label-sm font-bold uppercase text-on-surface">
                  <span v-if="c.parentId" class="text-on-surface-variant mr-1">↳</span>{{ c.kode }}
                </p>
                <p class="whitespace-pre-line text-on-surface-variant">{{ c.deskripsi }}</p>
              </div>
            </div>
            <span v-else class="text-on-surface-variant">-</span>
          </td>
          <!-- Materi & jenis pertemuan -->
          <td class="p-3">
            <p class="text-label-sm font-bold text-on-surface">Materi Pembelajaran</p>
            <p class="whitespace-pre-line mb-2">{{ htmlKeTeks(p.materi) }}</p>
            <p class="text-label-sm font-bold text-on-surface">Jenis Pertemuan</p>
            <p :class="p.jenisPertemuan === 'UTS' || p.jenisPertemuan === 'UAS' ? 'font-semibold text-[#9a6700]' : ''">
              {{ JENIS_PERTEMUAN_LABEL[p.jenisPertemuan] }}
            </p>
          </td>
          <td class="p-3 whitespace-pre-line">{{ p.indikator || '-' }}</td>
          <!-- Bentuk + metode pembelajaran -->
          <td class="p-3">
            <p v-if="p.bentukPembelajaran" class="text-label-sm font-bold text-on-surface">{{ BENTUK_PEMBELAJARAN_LABEL[p.bentukPembelajaran] }}</p>
            <p class="whitespace-pre-line">{{ p.metodePembelajaran || '-' }}</p>
            <p v-if="p.waktu || p.bobot !== null" class="mt-1 text-label-sm text-on-surface-variant">
              {{ [p.waktu, p.bobot !== null ? `Bobot ${p.bobot}%` : null].filter(Boolean).join(' · ') }}
            </p>
          </td>
          <td class="p-3">
            <div class="flex flex-col items-center gap-1">
              <button type="button" :class="[btnAksi, 'bg-[#0ea5e9]']" title="Lihat detail" @click="lihat = p">
                <span class="material-symbols-outlined" style="font-size: 16px">visibility</span>
              </button>
              <button v-if="canUpdate" type="button" :class="[btnAksi, 'bg-[#eda100]']" title="Ubah" @click="buka(p)">
                <span class="material-symbols-outlined" style="font-size: 16px">edit</span>
              </button>
              <button v-if="canDelete" type="button" :class="[btnAksi, 'bg-[#d83b3b]']" title="Hapus" @click="hapus(p)">
                <span class="material-symbols-outlined" style="font-size: 16px">delete</span>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
      <tfoot v-if="periode.pertemuan.length" class="border-t border-outline-variant bg-surface-container-low">
        <tr>
          <td colspan="6" class="p-3 text-right text-label-md">
            {{ periode.pertemuan.length }} sesi · Total bobot penilaian
            <span class="font-semibold" :class="totalBobot > 100 ? 'text-error' : ''">{{ totalBobot }}%</span>
          </td>
        </tr>
      </tfoot>
    </table>
  </section>

  <!-- Lihat detail satu sesi -->
  <Modal
    :model-value="!!lihat"
    :title="`Rencana Pembelajaran — Sesi ${lihat?.sesi ?? ''}`"
    :subtitle="namaPeriode"
    size="xl"
    @update:model-value="(v: boolean) => { if (!v) lihat = null; }"
  >
    <dl v-if="lihat" class="divide-y divide-outline-variant text-body-sm">
      <div class="grid grid-cols-1 md:grid-cols-[12rem_1fr] gap-2 py-2.5">
        <dt class="font-semibold text-primary">Jenis Pertemuan</dt>
        <dd>{{ JENIS_PERTEMUAN_LABEL[lihat.jenisPertemuan] }}</dd>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[12rem_1fr] gap-2 py-2.5">
        <dt class="font-semibold text-primary">CPMK &amp; Sub-CPMK</dt>
        <dd>
          <div v-if="cpmkSesi(lihat.cpmkIds).length" class="space-y-1.5">
            <p v-for="c in cpmkSesi(lihat.cpmkIds)" :key="c.id" :class="c.parentId ? 'pl-5' : ''">
              <span class="font-semibold">{{ c.parentId ? '↳ ' : '' }}{{ c.kode }}</span> — {{ c.deskripsi }}
            </p>
          </div>
          <span v-else class="text-on-surface-variant">-</span>
        </dd>
      </div>
      <div
        v-for="[label, nilai] in [
          ['Materi (IND)', htmlKeTeks(lihat.materi)],
          ['Materi (ENG)', htmlKeTeks(lihat.materiEn)],
          ['Indikator Penilaian', lihat.indikator],
          ['Kriteria & Bentuk Penilaian', lihat.kriteriaPenilaian],
          ['Bentuk Pembelajaran', lihat.bentukPembelajaran ? BENTUK_PEMBELAJARAN_LABEL[lihat.bentukPembelajaran] : null],
          ['Metode Pembelajaran', lihat.metodePembelajaran],
          ['Waktu', lihat.waktu],
          ['Bobot Penilaian', lihat.bobot !== null ? `${lihat.bobot}%` : null],
          ['Referensi', lihat.referensi],
        ] as [string, string | null][]"
        :key="label"
        class="grid grid-cols-1 md:grid-cols-[12rem_1fr] gap-2 py-2.5"
      >
        <dt class="font-semibold text-primary">{{ label }}</dt>
        <dd class="whitespace-pre-line">{{ nilai || '-' }}</dd>
      </div>
    </dl>
    <template #footer>
      <AppButton variant="secondary" @click="lihat = null">Tutup</AppButton>
      <AppButton v-if="canUpdate && lihat" icon="edit" @click="ubahDariLihat">Ubah</AppButton>
    </template>
  </Modal>

  <!-- Form Detail Rencana Pembelajaran -->
  <section v-if="editing !== null" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
    <h2 class="mx-4 pt-4 pb-2 border-b-2 border-primary font-semibold text-headline-sm text-primary">Detail Rencana Pembelajaran</h2>
    <div v-if="formError" class="mx-4 mt-3 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
    <div class="divide-y divide-outline-variant text-body-sm px-4 pb-4">
      <div class="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 py-3">
        <span class="font-medium text-primary">Periode Akademik</span>
        <span>{{ namaPeriode }}</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 py-3">
        <span class="font-medium text-primary">Pertemuan (Sesi) Ke-<span class="text-error">*</span></span>
        <input v-model="form.sesi" type="number" min="1" max="99" :class="inputCls" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 py-3">
        <span class="font-medium text-primary">Jenis Pertemuan<span class="text-error">*</span></span>
        <SelectInput v-model="form.jenisPertemuan" :options="JENIS_OPTIONS" placeholder="-- Pilih Jenis Pertemuan --" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 py-3">
        <span class="font-medium text-primary">CPMK &amp; Sub-CPMK</span>
        <div>
          <p v-if="!cpmkInduk.length" class="text-on-surface-variant">Belum ada CPMK. Tambahkan lewat menu Pemetaan CPMK.</p>
          <div v-else class="space-y-1.5">
            <template v-for="c in cpmkInduk" :key="c.id">
              <label class="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" class="h-4 w-4 mt-0.5" :checked="form.cpmkIds.includes(c.id)" @change="toggleCpmk(c.id)" />
                <span><span class="font-medium">{{ c.kode }}</span> — {{ c.deskripsi }}</span>
              </label>
              <label v-for="s in subOf(c.id)" :key="s.id" class="flex items-start gap-2 cursor-pointer pl-6">
                <input type="checkbox" class="h-4 w-4 mt-0.5" :checked="form.cpmkIds.includes(s.id)" @change="toggleCpmk(s.id)" />
                <span><span class="font-medium">{{ s.kode }}</span> — {{ s.deskripsi }}</span>
              </label>
            </template>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 py-3">
        <span class="font-medium text-primary">Materi Perkuliahan (IND)<span class="text-error">*</span></span>
        <RichTextEditor v-model="form.materi" placeholder="Materi Perkuliahan (IND)" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 py-3">
        <span class="font-medium text-primary">Materi Perkuliahan (ENG)</span>
        <RichTextEditor v-model="form.materiEn" placeholder="Materi Perkuliahan (ENG) — opsional" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 py-3">
        <span class="font-medium text-primary">Indikator Penilaian</span>
        <textarea v-model="form.indikator" :class="inputCls" rows="3" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 py-3">
        <span class="font-medium text-primary">Kriteria &amp; Bentuk Penilaian</span>
        <textarea v-model="form.kriteriaPenilaian" :class="inputCls" rows="3" placeholder="mis. Rubrik; tes tulis, presentasi" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 py-3">
        <span class="font-medium text-primary">Bentuk Pembelajaran</span>
        <div class="md:max-w-xs">
          <SelectInput v-model="form.bentukPembelajaran" :options="BENTUK_OPTIONS" placeholder="-- Pilih Bentuk Pembelajaran --" />
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 py-3">
        <span class="font-medium text-primary">Metode Pembelajaran</span>
        <textarea v-model="form.metodePembelajaran" :class="inputCls" rows="2" placeholder="mis. Ceramah, diskusi, studi kasus" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 py-3">
        <span class="font-medium text-primary">Waktu</span>
        <input v-model="form.waktu" :class="[inputCls, 'md:max-w-xs']" maxlength="100" placeholder="mis. 3 x 50 menit" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 py-3">
        <span class="font-medium text-primary">Bobot Penilaian (%)</span>
        <input v-model="form.bobot" type="number" min="0" max="100" step="0.01" :class="[inputCls, 'md:max-w-[10rem]']" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 py-3">
        <span class="font-medium text-primary">Referensi</span>
        <textarea v-model="form.referensi" :class="inputCls" rows="2" placeholder="mis. [1] Bab 2; [2] hal. 30–45" />
      </div>
    </div>
  </section>

  <RpsSalinPeriodeModal
    v-model="salinOpen"
    jenis="pertemuan"
    :mk-id="mkId"
    :tahun-ajaran-id="tahunAjaranId"
    :mk-options="mkOptions"
    :tahun-ajaran-options="tahunAjaranOptions"
    @disalin="emit('reload')"
  />

  <Modal v-model="uploadOpen" title="Upload Excel Rencana Pembelajaran" size="md">
    <div class="space-y-4 text-body-sm">
      <p class="text-on-surface-variant">
        Unduh template, isi satu baris per sesi, lalu upload. Data masuk ke periode <strong>{{ namaPeriode }}</strong>; sesi yang sudah ada akan
        diperbarui. Kolom Kode CPMK diisi kode CPMK/Sub-CPMK dipisah koma.
      </p>
      <button type="button" class="inline-flex items-center gap-1.5 text-label-md text-primary hover:underline" @click="unduhTemplate">
        <span class="material-symbols-outlined" style="font-size: 18px">description</span>
        Download Template
      </button>
      <FileInput v-model="uploadFile" accept=".xlsx" hint="File Excel (.xlsx)" />
      <div v-if="uploadResult" class="space-y-2">
        <p>
          <strong class="text-success">{{ uploadResult.successCount }} berhasil</strong>
          <span v-if="uploadResult.errorCount"> · <strong class="text-error">{{ uploadResult.errorCount }} gagal</strong></span>
        </p>
        <ul v-if="uploadResult.errors.length || uploadResult.warnings?.length" class="border border-outline-variant rounded-md max-h-48 overflow-y-auto divide-y divide-outline-variant text-label-sm">
          <li v-for="e in uploadResult.errors" :key="`e${e.row}`" class="p-2 text-error">Baris {{ e.row }}: {{ e.message }}</li>
          <li v-for="(w, i) in uploadResult.warnings ?? []" :key="`w${i}`" class="p-2">
            <span v-if="w.row">Baris {{ w.row }}: </span>{{ w.message }}
          </li>
        </ul>
      </div>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="uploadOpen = false">Tutup</AppButton>
      <AppButton icon="upload" :disabled="uploading || !uploadFile" @click="upload">{{ uploading ? 'Mengunggah...' : 'Upload' }}</AppButton>
    </template>
  </Modal>
</template>

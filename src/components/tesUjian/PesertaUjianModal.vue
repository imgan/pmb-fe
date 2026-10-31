<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import TextInput from '@/components/ui/TextInput.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import TambahPesertaUjianModal from './TambahPesertaUjianModal.vue';
import KoreksiUjianModal from './KoreksiUjianModal.vue';
import { tesUjianApi, type PesertaUjian, type StatusTesUjian, type TesUjian } from '@/api/tesUjian';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';
import { formatDateTime } from '@/utils/format';

/** Popup Daftar Peserta (menu Tes Ujian): peserta yang berhak ujian, nilai & hasil, Set Nilai, Batalkan, Tambah Peserta. */
const props = defineProps<{ tes: TesUjian | null; canUpdate: boolean }>();
const open = defineModel<boolean>({ default: false });
const emit = defineEmits<{ changed: [] }>();

const loading = ref(false);
const error = ref<string | null>(null);
const rows = ref<PesertaUjian[]>([]);
const search = ref('');
const tambahOpen = ref(false);

const muat = async () => {
  if (!props.tes) return;
  loading.value = true;
  error.value = null;
  try {
    rows.value = await tesUjianApi.listPeserta(props.tes.id, search.value.trim());
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat peserta ujian');
  } finally {
    loading.value = false;
  }
};
watch(open, (v) => {
  if (!v) return;
  search.value = '';
  muat();
});
let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(timer);
  timer = setTimeout(muat, 350);
});

const onAdded = () => {
  muat();
  emit('changed');
};

const STATUS: Record<StatusTesUjian, { label: string; cls: string }> = {
  belum_ujian: { label: 'Belum Dinilai', cls: 'bg-surface-container text-on-surface-variant' },
  lulus: { label: 'Lulus', cls: 'bg-success-container text-on-success-container' },
  tidak_lulus: { label: 'Tidak Lulus', cls: 'bg-danger-container text-on-danger-container' },
};
const STATUS_OPTIONS = [
  { value: 'lulus', label: 'Lulus' },
  { value: 'tidak_lulus', label: 'Tidak Lulus' },
  { value: 'belum_ujian', label: 'Belum Dinilai' },
];

// Popup Set Nilai.
const nilaiTarget = ref<PesertaUjian | null>(null);
const nilaiForm = reactive({ nilai: '', status: 'lulus' as string | number | null });
const nilaiError = ref<string | null>(null);
const savingNilai = ref(false);
const bukaSetNilai = (r: PesertaUjian) => {
  nilaiTarget.value = r;
  nilaiForm.nilai = r.nilai === null ? '' : String(r.nilai);
  nilaiForm.status = r.status === 'belum_ujian' ? 'lulus' : r.status;
  nilaiError.value = null;
};
const simpanNilai = async () => {
  if (!props.tes || !nilaiTarget.value) return;
  const nilai = nilaiForm.nilai === '' ? null : Number(nilaiForm.nilai);
  if (nilai !== null && (Number.isNaN(nilai) || nilai < 0 || nilai > 100)) {
    nilaiError.value = 'Nilai harus angka 0–100';
    return;
  }
  savingNilai.value = true;
  try {
    await tesUjianApi.setNilai(props.tes.id, nilaiTarget.value.id, { nilai, status: nilaiForm.status as StatusTesUjian });
    toastSuccess('Nilai disimpan');
    nilaiTarget.value = null;
    muat();
  } catch (err) {
    nilaiError.value = extractErrorMessage(err, 'Gagal menyimpan nilai');
  } finally {
    savingNilai.value = false;
  }
};

// Popup Koreksi jawaban soal online.
const koreksiOpen = ref(false);
const koreksiTarget = ref<PesertaUjian | null>(null);
const bukaKoreksi = (r: PesertaUjian) => {
  koreksiTarget.value = r;
  koreksiOpen.value = true;
};
const onKoreksi = () => {
  muat();
  emit('changed');
};

const batalkan = async (r: PesertaUjian) => {
  if (!props.tes) return;
  const ok = await confirmAction({ title: 'Batalkan peserta ujian?', text: `${r.namaLengkap} dikeluarkan dari ${props.tes.namaUjian}.`, confirmLabel: 'Batalkan' });
  if (!ok) return;
  try {
    await tesUjianApi.batalkan(props.tes.id, r.id);
    toastSuccess('Peserta dibatalkan');
    muat();
    emit('changed');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal membatalkan peserta'));
  }
};
</script>

<template>
  <Modal v-model="open" :title="`Peserta Ujian &quot;${tes?.namaUjian ?? ''}&quot;`" :subtitle="tes?.gelombang?.namaGelombang" size="2xl">
    <div class="space-y-3">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <SearchInput v-model="search" placeholder="Cari nama peserta..." />
        <AppButton v-if="canUpdate" icon="add" @click="tambahOpen = true">Tambah Peserta Ujian</AppButton>
      </div>
      <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
      <div class="overflow-x-auto max-h-[60vh] overflow-y-auto border border-outline-variant rounded-md">
        <table class="w-full text-body-sm">
          <thead class="sticky top-0 z-10">
            <tr class="bg-surface-container text-left text-on-surface">
              <th class="px-3 py-2.5 font-semibold">Nama</th>
              <th class="px-3 py-2.5 font-semibold">Jurusan</th>
              <th class="px-3 py-2.5 font-semibold">Dokumen</th>
              <th class="px-3 py-2.5 font-semibold">Nilai</th>
              <th v-if="canUpdate" class="px-3 py-2.5 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="px-3 py-8 text-center text-on-surface-variant">Memuat data...</td>
            </tr>
            <template v-else>
              <tr v-for="r in rows" :key="r.id" class="border-b border-outline-variant">
                <td class="px-3 py-2.5 font-semibold text-on-surface">{{ r.namaLengkap }}</td>
                <td class="px-3 py-2.5 text-on-surface-variant">{{ r.jurusan }}</td>
                <td class="px-3 py-2.5">
                  <span v-if="r.dokumenLengkap" class="material-symbols-outlined text-success" style="font-size: 20px" title="Dokumen lengkap">check_circle</span>
                  <span v-else class="text-[11px] text-error">Dokumen belum lengkap</span>
                </td>
                <td class="px-3 py-2.5">
                  <p class="tabular-nums text-on-surface">{{ r.nilai ?? '-' }}</p>
                  <span class="inline-flex mt-1 px-2.5 py-0.5 rounded-full font-medium text-label-sm" :class="STATUS[r.status].cls">{{ STATUS[r.status].label }}</span>
                  <template v-if="tes?.bankUjianId">
                    <p v-if="r.selesaiAt" class="mt-1 text-[11px] text-success">Dikirim {{ formatDateTime(r.selesaiAt) }}</p>
                    <p v-else-if="r.mulaiAt" class="mt-1 text-[11px] text-primary">Sedang mengerjakan</p>
                    <p v-else class="mt-1 text-[11px] text-on-surface-variant">Belum mengerjakan</p>
                    <p v-if="r.essayBelumDinilai" class="text-[11px] text-error">{{ r.essayBelumDinilai }} essay belum dinilai</p>
                  </template>
                </td>
                <td v-if="canUpdate" class="px-3 py-2.5">
                  <div class="flex flex-col items-end gap-1">
                    <button
                      v-if="tes?.bankUjianId && r.selesaiAt"
                      type="button"
                      class="px-2.5 py-1 rounded bg-[#0e9aa7] text-white text-label-sm hover:opacity-90"
                      @click="bukaKoreksi(r)"
                    >
                      Koreksi
                    </button>
                    <button type="button" class="px-2.5 py-1 rounded bg-primary text-on-primary text-label-sm hover:opacity-90" @click="bukaSetNilai(r)">Set Nilai</button>
                    <button type="button" class="px-2.5 py-1 rounded bg-error text-on-error text-label-sm hover:opacity-90" @click="batalkan(r)">Batalkan</button>
                  </div>
                </td>
              </tr>
              <tr v-if="rows.length === 0">
                <td colspan="5" class="px-3 py-8 text-center text-on-surface-variant">Belum ada peserta ujian.</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
    <template #footer>
      <AppButton variant="danger" @click="open = false">Tutup</AppButton>
    </template>
  </Modal>

  <TambahPesertaUjianModal v-model="tambahOpen" :tes="tes" @added="onAdded" />
  <KoreksiUjianModal v-model="koreksiOpen" :tes-id="tes?.id ?? null" :peserta="koreksiTarget" :can-update="canUpdate" @saved="onKoreksi" />

  <Modal :model-value="!!nilaiTarget" title="Set Nilai" :subtitle="nilaiTarget?.namaLengkap" @update:model-value="nilaiTarget = null">
    <form class="space-y-4" @submit.prevent="simpanNilai">
      <div v-if="nilaiError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ nilaiError }}</div>
      <TextInput v-model="nilaiForm.nilai" label="Nilai" type="number" min="0" max="100" step="0.01" placeholder="0 – 100" />
      <SelectInput v-model="nilaiForm.status" label="Hasil" :options="STATUS_OPTIONS" :clearable="false" />
      <p class="text-label-sm text-on-surface-variant">Hasil ini juga mengubah status ujian di akun peserta dan kolom Lulus Tes Masuk di menu Peserta.</p>
    </form>
    <template #footer>
      <AppButton variant="secondary" @click="nilaiTarget = null">Batal</AppButton>
      <AppButton :disabled="savingNilai" @click="simpanNilai">{{ savingNilai ? 'Menyimpan...' : 'Simpan' }}</AppButton>
    </template>
  </Modal>
</template>

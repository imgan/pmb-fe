<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import { useRpsApi, type RpsInfo, type RpsPeriode } from '@/api/rps';
import { extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';
import { inputCls } from './shared';

// Klien RPS sesuai portal (Prodi / Dosen) dari halaman RPS.
const rpsApi = useRpsApi();

/** Menu "Detail RPS": identitas RPS mata kuliah pada periode terpilih (deskripsi, bahan kajian, pustaka, media, tim). */
const props = defineProps<{ mkId: number; tahunAjaranId: number; periode: RpsPeriode; canUpdate: boolean }>();
const emit = defineEmits<{ reload: [] }>();

const KOSONG: RpsInfo = {
  deskripsi: '',
  bahanKajian: '',
  pustakaUtama: '',
  pustakaPendukung: '',
  mediaSoftware: '',
  mediaHardware: '',
  mkPrasyarat: '',
  dosenPengembang: '',
  koordinatorRmk: '',
  teamTeaching: '',
  tanggalPenyusunan: '',
};
const form = reactive<RpsInfo>({ ...KOSONG });
const reset = () => {
  const r = props.periode.rps;
  Object.assign(form, Object.fromEntries(Object.keys(KOSONG).map((k) => [k, r?.[k as keyof RpsInfo] ?? ''])));
};
watch(() => props.periode, reset, { immediate: true });

const FIELD_TEKS: { key: keyof RpsInfo; label: string; rows: number; hint?: string }[] = [
  { key: 'deskripsi', label: 'Deskripsi Singkat Mata Kuliah', rows: 4 },
  { key: 'bahanKajian', label: 'Bahan Kajian / Materi Pembelajaran', rows: 4, hint: 'Satu pokok bahasan per baris' },
  { key: 'pustakaUtama', label: 'Pustaka Utama', rows: 3, hint: 'Satu pustaka per baris, mis. [1] Penulis, Judul, Penerbit, Tahun' },
  { key: 'pustakaPendukung', label: 'Pustaka Pendukung', rows: 3 },
  { key: 'mediaSoftware', label: 'Media Pembelajaran — Perangkat Lunak', rows: 2 },
  { key: 'mediaHardware', label: 'Media Pembelajaran — Perangkat Keras', rows: 2 },
  { key: 'teamTeaching', label: 'Dosen Pengampu / Team Teaching', rows: 2, hint: 'Satu nama per baris' },
];

const saving = ref(false);
const simpan = async () => {
  saving.value = true;
  try {
    await rpsApi.saveRps(props.mkId, props.tahunAjaranId, { ...form, tanggalPenyusunan: form.tanggalPenyusunan || null });
    toastSuccess('Detail RPS disimpan');
    emit('reload');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan detail RPS'));
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Teleport v-if="canUpdate" defer to="#rps-aksi">
    <AppButton icon="save" :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
    <AppButton variant="secondary" icon="refresh" :disabled="saving" @click="reset">Batalkan</AppButton>
  </Teleport>

  <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
    <h2 class="px-4 py-3 border-b border-outline-variant font-semibold text-primary">Detail RPS</h2>
    <div class="divide-y divide-outline-variant text-body-sm">
      <div class="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-2 px-4 py-3">
        <span class="font-medium text-primary">Tanggal Penyusunan</span>
        <input v-model="form.tanggalPenyusunan" type="date" :class="[inputCls, 'md:max-w-xs']" :disabled="!canUpdate" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-2 px-4 py-3">
        <span class="font-medium text-primary">Dosen Pengembang RPS</span>
        <input v-model="form.dosenPengembang" :class="inputCls" maxlength="255" :disabled="!canUpdate" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-2 px-4 py-3">
        <span class="font-medium text-primary">Koordinator RMK</span>
        <input v-model="form.koordinatorRmk" :class="inputCls" maxlength="255" :disabled="!canUpdate" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-2 px-4 py-3">
        <span class="font-medium text-primary">Mata Kuliah Prasyarat</span>
        <input v-model="form.mkPrasyarat" :class="inputCls" maxlength="255" placeholder="Kosongkan bila tidak ada" :disabled="!canUpdate" />
      </div>
      <div v-for="f in FIELD_TEKS" :key="f.key" class="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-2 px-4 py-3">
        <span class="font-medium text-primary">{{ f.label }}</span>
        <div>
          <textarea v-model="form[f.key]" :class="inputCls" :rows="f.rows" :disabled="!canUpdate" />
          <p v-if="f.hint" class="mt-1 text-label-sm text-on-surface-variant">{{ f.hint }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

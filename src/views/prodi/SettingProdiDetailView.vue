<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import { settingProdiApi, type SettingProdiDetail, type SettingProdiIsian } from '@/api/settingProdi';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';
import { toastError } from '@/utils/swal';

/**
 * Detail Setting Program Studi satu periode: info (periode, prodi, kurikulum mahasiswa baru) dan tab
 * KRS & Validasi / KHS & Nilai / Ujian / Lain-lain. Tombol Edit mengubah tampilan menjadi form di tempat.
 */
const props = defineProps<{ id: string }>();
const route = useRoute();
const router = useRouter();
const { canUpdate } = usePermission(MENU.PRODI_SETTING_MANAGEMENT);

type Key = keyof SettingProdiIsian;
interface Field {
  key: Key;
  label: string;
  type: 'bool' | 'date' | 'number' | 'text';
  suffix?: string;
  min?: number;
  max?: number;
}
const TABS: { key: string; label: string; kiri: Field[]; kanan: Field[] }[] = [
  {
    key: 'krs',
    label: 'KRS & Validasi',
    kiri: [
      { key: 'bukaKrs', label: 'Buka KRS?', type: 'bool' },
      { key: 'tanggalAwalKrs', label: 'Tanggal Awal KRS', type: 'date' },
      { key: 'tanggalAkhirKrs', label: 'Tanggal Akhir KRS', type: 'date' },
      { key: 'maksSks', label: 'Maksimal SKS', type: 'number', suffix: 'SKS', min: 1, max: 40 },
    ],
    kanan: [
      { key: 'wajibValidasiPa', label: 'KRS Wajib Divalidasi Dosen PA?', type: 'bool' },
      { key: 'cekTagihanKrs', label: 'Cek Tagihan Sebelum KRS?', type: 'bool' },
      { key: 'tanggalAwalPerubahanKrs', label: 'Tanggal Awal Perubahan KRS', type: 'date' },
      { key: 'tanggalAkhirPerubahanKrs', label: 'Tanggal Akhir Perubahan KRS', type: 'date' },
    ],
  },
  {
    key: 'khs',
    label: 'KHS & Nilai',
    kiri: [
      { key: 'bukaKhs', label: 'Buka KHS?', type: 'bool' },
      { key: 'tanggalAwalKhs', label: 'Tanggal Awal KHS', type: 'date' },
      { key: 'tanggalAkhirKhs', label: 'Tanggal Akhir KHS', type: 'date' },
      { key: 'tanggalCetakKhs', label: 'Tanggal Cetak KHS', type: 'date' },
    ],
    kanan: [
      { key: 'bukaPengisianNilai', label: 'Buka Pengisian Nilai?', type: 'bool' },
      { key: 'dosenIsiPersentaseKomponen', label: 'Dosen Bisa Isi Persentase Komponen?', type: 'bool' },
      { key: 'tanggalAwalPengisianNilai', label: 'Tanggal Awal Pengisian Nilai', type: 'date' },
      { key: 'tanggalAkhirPengisianNilai', label: 'Tanggal Akhir Pengisian Nilai', type: 'date' },
    ],
  },
  {
    key: 'ujian',
    label: 'Ujian',
    kiri: [
      { key: 'bukaCetakKartuUjian', label: 'Buka Cetak Kartu Ujian?', type: 'bool' },
      { key: 'cekTagihanUjian', label: 'Cek Tagihan Sebelum Ujian?', type: 'bool' },
    ],
    kanan: [
      { key: 'minKehadiranUts', label: 'Minimal Kehadiran UTS', type: 'number', suffix: '%', min: 0, max: 100 },
      { key: 'minKehadiranUas', label: 'Minimal Kehadiran UAS', type: 'number', suffix: '%', min: 0, max: 100 },
    ],
  },
  { key: 'lain', label: 'Lain-lain', kiri: [{ key: 'keterangan', label: 'Keterangan', type: 'text' }], kanan: [] },
];
const tab = ref(typeof route.query.tab === 'string' && TABS.some((t) => t.key === route.query.tab) ? route.query.tab : 'khs');
const tabAktif = computed(() => TABS.find((t) => t.key === tab.value)!);
/** Pasangan rentang tanggal yang dicek (awal ≤ akhir) sebelum simpan. */
const RENTANG: [Key, Key, string][] = [
  ['tanggalAwalKrs', 'tanggalAkhirKrs', 'KRS'],
  ['tanggalAwalPerubahanKrs', 'tanggalAkhirPerubahanKrs', 'Perubahan KRS'],
  ['tanggalAwalKhs', 'tanggalAkhirKhs', 'KHS'],
  ['tanggalAwalPengisianNilai', 'tanggalAkhirPengisianNilai', 'Pengisian Nilai'],
];

const data = ref<SettingProdiDetail | null>(null);
const error = ref<string | null>(null);
const sukses = ref<string | null>(null);
const editing = ref(false);
const saving = ref(false);
type Nilai = string | number | boolean | null;
const form = reactive<Record<string, Nilai>>({});

const KEYS = TABS.flatMap((t) => [...t.kiri, ...t.kanan].map((f) => f.key)).concat('kurikulumMahasiswaBaruId');
const isiForm = () => {
  if (!data.value) return;
  const d = data.value as unknown as Record<string, Nilai>;
  for (const k of KEYS) form[k] = d[k] ?? '';
};

const load = async () => {
  error.value = null;
  try {
    data.value = await settingProdiApi.detail(props.id);
    isiForm();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat setting program studi');
  }
};
onMounted(async () => {
  await load();
  if (route.query.edit && canUpdate.value) editing.value = true;
});
watch(tab, (t) => router.replace({ query: { ...route.query, tab: t } }));

const kurikulumOptions = computed<SelectOption[]>(() =>
  (data.value?.kurikulumOptions ?? []).map((k) => ({ value: k.id, label: `${k.nama}${k.isActive ? '' : ' (nonaktif)'}` })),
);

const mulaiEdit = () => {
  isiForm();
  sukses.value = null;
  editing.value = true;
};
const batal = () => {
  isiForm();
  editing.value = false;
  router.replace({ query: { ...route.query, edit: undefined } });
};
const simpan = async () => {
  if (!data.value) return;
  for (const [awal, akhir, label] of RENTANG) {
    if (form[awal] && form[akhir] && String(form[awal]) > String(form[akhir])) return toastError(`Tanggal awal ${label} tidak boleh setelah tanggal akhirnya`);
  }
  saving.value = true;
  try {
    const payload = Object.fromEntries(KEYS.map((k) => [k, form[k] === '' ? null : form[k]])) as unknown as SettingProdiIsian;
    sukses.value = await settingProdiApi.update(data.value.id, payload);
    editing.value = false;
    router.replace({ query: { ...route.query, edit: undefined } });
    await load();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan setting'));
  } finally {
    saving.value = false;
  }
};

/** "2026-03-05" → "5 Maret 2026". */
const tanggalPanjang = (v: unknown) => {
  if (!v) return '';
  const d = new Date(`${String(v).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
};
const nilaiTampil = (f: Field) => {
  const v = (data.value as unknown as Record<string, unknown>)?.[f.key];
  if (f.type === 'date') return tanggalPanjang(v);
  if (f.type === 'number') return v === null || v === undefined ? '' : `${v}${f.suffix === '%' ? '%' : ` ${f.suffix ?? ''}`}`;
  return v ? String(v) : '';
};
/** Baris info: label tebal kiri (lebar tetap, boleh 2 baris) + nilai, garis bawah. */
const barisCls = 'grid grid-cols-[13rem_1fr] gap-3 px-2 py-2.5 border-b border-outline-variant items-start';
const labelCls = 'font-semibold text-primary leading-snug';
const inputCls =
  'w-full px-2 py-1.5 border border-outline-variant rounded text-body-sm bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none';
</script>

<template>
  <div>
    <PageHeader title="Setting" subtitle="Detail Setting Program Studi" />

    <div v-if="sukses" class="mb-4 flex items-center gap-3 px-4 py-3 rounded-md border border-[#059669]/30 bg-[#059669]/10 text-[#05603a] text-body-sm">
      <span class="flex-1">{{ sukses }}</span>
      <button type="button" class="text-[#05603a]/60 hover:text-[#05603a]" title="Tutup" @click="sukses = null">
        <span class="material-symbols-outlined" style="font-size: 18px">close</span>
      </button>
    </div>
    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <section v-if="data" class="bg-surface-container-lowest border border-outline-variant border-t-2 border-t-primary rounded-lg overflow-hidden">
      <!-- Aksi -->
      <div class="p-3 border-b border-outline-variant flex flex-wrap justify-end gap-2">
        <template v-if="!editing">
          <AppButton variant="secondary" icon="arrow_back" @click="router.push({ name: 'prodi-setting' })">Kembali ke Daftar</AppButton>
          <AppButton v-if="canUpdate" icon="edit" @click="mulaiEdit">Edit</AppButton>
        </template>
        <template v-else>
          <AppButton variant="secondary" icon="close" :disabled="saving" @click="batal">Batal</AppButton>
          <AppButton icon="save" :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
        </template>
      </div>

      <!-- Info periode & prodi (dua kolom, baris bergaris bawah) -->
      <div class="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 px-2 text-body-sm">
        <dl>
          <div :class="barisCls">
            <dt :class="labelCls">Periode</dt>
            <dd>{{ formatTahunAjaran(data.tahunAjaran) }}</dd>
          </div>
          <div :class="barisCls">
            <dt :class="labelCls">Kurikulum Mahasiswa Baru</dt>
            <dd>
              <SelectInput
                v-if="editing"
                :model-value="form.kurikulumMahasiswaBaruId as string | number | null"
                :options="kurikulumOptions"
                placeholder="-- Pilih Kurikulum --"
                @update:model-value="(v) => (form.kurikulumMahasiswaBaruId = v)"
              />
              <template v-else>{{ data.kurikulumMahasiswaBaru?.nama ?? '' }}</template>
            </dd>
          </div>
        </dl>
        <dl>
          <div :class="barisCls">
            <dt :class="labelCls">Program Studi</dt>
            <dd>{{ [data.jurusan?.jenjangPendidikan, data.jurusan?.namaJurusan].filter(Boolean).join(' - ') }}</dd>
          </div>
        </dl>
      </div>

      <!-- Tab (menempel di bawah info, kiri) -->
      <div class="px-4 mt-3 flex flex-wrap gap-1">
        <button
          v-for="t in TABS"
          :key="t.key"
          type="button"
          class="px-4 py-2.5 rounded-t-md text-body-sm border border-b-0 transition-colors"
          :class="
            tab === t.key
              ? 'bg-primary text-on-primary border-primary font-medium'
              : 'bg-surface-container-high text-on-surface-variant border-outline-variant hover:bg-surface-container-highest'
          "
          @click="tab = t.key"
        >
          {{ t.label }}
        </button>
      </div>
      <!-- Isi tab: kotak bergaris, dua kolom label tebal + nilai -->
      <div class="mx-2 mb-3 border border-outline-variant grid grid-cols-1 md:grid-cols-2 md:gap-x-8 px-2 text-body-sm">
        <dl v-for="(kolom, i) in [tabAktif.kiri, tabAktif.kanan]" v-show="kolom.length" :key="i" :class="!tabAktif.kanan.length ? 'md:col-span-2' : ''">
          <div v-for="f in kolom" :key="f.key" :class="barisCls">
            <dt :class="labelCls">{{ f.label }}</dt>
            <dd>
              <template v-if="editing">
                <label v-if="f.type === 'bool'" class="inline-flex items-center gap-2 cursor-pointer">
                  <input v-model="form[f.key]" type="checkbox" class="h-4 w-4 accent-primary" />
                  <span class="text-on-surface-variant">{{ form[f.key] ? 'Ya' : 'Tidak' }}</span>
                </label>
                <input v-else-if="f.type === 'date'" v-model="form[f.key]" type="date" :class="[inputCls, 'max-w-[12rem]']" />
                <div v-else-if="f.type === 'number'" class="flex items-center gap-2">
                  <input v-model="form[f.key]" type="number" :min="f.min" :max="f.max" :class="[inputCls, 'max-w-[7rem]']" />
                  <span class="text-on-surface-variant">{{ f.suffix }}</span>
                </div>
                <textarea
                  v-else
                  :value="String(form[f.key] ?? '')"
                  :class="inputCls"
                  rows="4"
                  @input="form[f.key] = ($event.target as HTMLTextAreaElement).value"
                />
              </template>
              <template v-else>
                <span
                  v-if="f.type === 'bool'"
                  class="material-symbols-outlined font-bold"
                  :class="data[f.key] ? 'text-[#059669]' : 'text-error'"
                  style="font-size: 16px"
                >
                  {{ data[f.key] ? 'check' : 'close' }}
                </span>
                <span v-else class="whitespace-pre-line">{{ nilaiTampil(f) }}</span>
              </template>
            </dd>
          </div>
        </dl>
      </div>
    </section>
    <div v-else-if="!error" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
  </div>
</template>

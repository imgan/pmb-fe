<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import { useKelasKuliahApi, type JadwalUjianKelas, type UjianKelas } from '@/api/kelasKuliah';
import { extractErrorMessage } from '@/api/http';
import { formatDateTime } from '@/utils/format';
import { toastError, toastSuccess } from '@/utils/swal';

/**
 * Detail Kelas → Jadwal Ujian: UTS & UAS kelas. Data sama dengan menu Jadwal Kuliah → Jadwal Ujian (Prodi)
 * dan Jadwal Ujian (Dosen) — isian di sini langsung tampil di menu tsb & sebaliknya. Ruangan, jam ke- &
 * pengawas mengikuti jadwal kuliah.
 */
const props = defineProps<{ kelasId: number; canUpdate: boolean }>();
const kelasKuliahApi = useKelasKuliahApi();

const data = ref<JadwalUjianKelas | null>(null);
const error = ref<string | null>(null);
const load = async () => {
  error.value = null;
  try {
    data.value = await kelasKuliahApi.jadwalUjian(props.kelasId);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat jadwal ujian');
  }
};
onMounted(load);
watch(() => props.kelasId, load);

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'ONLINE', label: 'Online' },
];
const LABEL_UJIAN = { UTS: 'Ujian Tengah Semester (UTS)', UAS: 'Ujian Akhir Semester (UAS)' };

// Form ubah satu jenis ujian.
const editing = ref<'UTS' | 'UAS' | null>(null);
const form = reactive<{ status: string | number | null; sifat: string | number | null; tanggal: string }>({ status: '', sifat: '', tanggal: '' });
const saving = ref(false);
const mulai = (u: UjianKelas) => {
  Object.assign(form, { status: u.status ?? '', sifat: u.sifat ?? '', tanggal: u.tanggal ?? '' });
  editing.value = u.jenisUjian;
};
const simpan = async () => {
  if (!editing.value) return;
  saving.value = true;
  try {
    data.value = await kelasKuliahApi.simpanJadwalUjian(props.kelasId, {
      jenisUjian: editing.value,
      status: (form.status || null) as string | null,
      sifat: (form.sifat || null) as string | null,
      tanggal: form.tanggal || null,
    });
    toastSuccess(`Jadwal ${editing.value} disimpan`);
    editing.value = null;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan jadwal ujian'));
  } finally {
    saving.value = false;
  }
};

const tanggalPanjang = (v: string | null) => {
  if (!v) return '-';
  const d = new Date(`${v.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
};
const inputCls = 'w-full px-2 py-1.5 border border-outline-variant rounded text-body-sm bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none';
</script>

<template>
  <div class="space-y-4">
    <div v-if="error" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <p class="text-body-sm text-on-surface-variant">
      Data ini sama dengan menu <strong>Jadwal Ujian</strong> — perubahan di sini langsung tampil di sana, dan sebaliknya. Ruangan, jam ke- &amp; pengawas
      mengikuti jadwal kuliah.
    </p>

    <div v-if="data" class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <section v-for="u in data.ujian" :key="u.jenisUjian" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="px-4 py-3 border-b border-outline-variant flex items-center gap-3">
          <h2 class="flex-1 font-semibold text-primary">{{ LABEL_UJIAN[u.jenisUjian] }}</h2>
          <span
            class="inline-flex px-2 py-0.5 rounded-full text-label-sm"
            :class="u.tanggal ? 'bg-[#059669]/15 text-[#05603a]' : 'bg-surface-container text-on-surface-variant'"
          >
            {{ u.tanggal ? 'Terjadwal' : 'Belum dijadwalkan' }}
          </span>
          <AppButton v-if="canUpdate && editing !== u.jenisUjian" variant="secondary" icon="edit" @click="mulai(u)">Ubah</AppButton>
        </div>

        <!-- Form ubah -->
        <div v-if="editing === u.jenisUjian" class="p-4 space-y-3 text-body-sm">
          <label class="block">
            <span class="font-medium text-primary">Tanggal Ujian</span>
            <input v-model="form.tanggal" type="date" :class="[inputCls, 'mt-1 max-w-[12rem]']" />
          </label>
          <SelectInput v-model="form.status" label="Status" :options="STATUS_OPTIONS" placeholder="-- Pilih Status --" />
          <SelectInput v-model="form.sifat" label="Sifat Ujian" :options="data.sifatOptions.map((s) => ({ value: s, label: s }))" placeholder="-- Pilih Sifat --" />
          <div class="flex justify-end gap-2 pt-1">
            <AppButton variant="secondary" :disabled="saving" @click="editing = null">Batal</AppButton>
            <AppButton icon="save" :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
          </div>
        </div>

        <!-- Tampilan -->
        <dl v-else class="divide-y divide-outline-variant text-body-sm">
          <div
            v-for="[label, nilai] in [
              ['Tanggal Ujian', tanggalPanjang(u.tanggal)],
              ['Status', u.status === 'ONLINE' ? 'Online' : u.status === 'OFFLINE' ? 'Offline' : '-'],
              ['Sifat Ujian', u.sifat ?? '-'],
              ['Ruangan', u.ruangan ?? '-'],
              ['Jam Ke-', u.jamKe ?? '-'],
              ['Pengawas', u.pengawas || '-'],
            ] as [string, string | number][]"
            :key="label"
            class="grid grid-cols-[9rem_1fr] gap-3 px-4 py-2.5"
          >
            <dt class="font-semibold text-primary">{{ label }}</dt>
            <dd>{{ nilai }}</dd>
          </div>
          <p v-if="u.diubahOleh" class="px-4 py-2 text-label-sm text-on-surface-variant">
            Terakhir diubah oleh {{ u.diubahOleh }}{{ u.diubahPada ? ` · ${formatDateTime(u.diubahPada)}` : '' }}
          </p>
        </dl>
      </section>
    </div>
    <div v-else-if="!error" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat jadwal ujian...</div>
  </div>
</template>

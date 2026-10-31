<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import { settingProdiApi, type SettingProdi } from '@/api/settingProdi';
import { jurusanApi } from '@/api/jurusan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { useProdiContext } from '@/composables/useProdiContext';
import { MENU } from '@/constants/menuCodes';
import type { TahunAjaran } from '@/types/entities';
import { formatDateTime } from '@/utils/format';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';

/**
 * Setting Program Studi (tombol "Setting Prodi" pojok kanan atas modul Prodi): daftar setting per periode.
 * Detail & ubah di halaman SettingProdiDetailView (tab KRS & Validasi, KHS & Nilai, Ujian, Lain-lain).
 */
const router = useRouter();
const { canCreate, canDelete } = usePermission(MENU.PRODI_SETTING_MANAGEMENT);
const { prodiLocked, defaultJurusanId, tahunAjaranId: sessionTahunAjaranId } = useProdiContext();

const rows = ref<SettingProdi[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await settingProdiApi.list();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat setting program studi');
  } finally {
    loading.value = false;
  }
};

// ---- Tambah setting periode baru ----
const jurusanOptions = ref<SelectOption[]>([]);
const tahunAjaranList = ref<TahunAjaran[]>([]);
const tahunAjaranOptions = computed<SelectOption[]>(() =>
  [...tahunAjaranList.value]
    .sort((a, b) => b.tahunMulai * 10 + (b.jenisSemester === 'GENAP' ? 2 : 1) - (a.tahunMulai * 10 + (a.jenisSemester === 'GENAP' ? 2 : 1)))
    .map((t) => ({ value: t.id, label: formatTahunAjaran(t) })),
);
const tambahOpen = ref(false);
const formJurusan = ref<string | number | null>('');
const formTa = ref<string | number | null>('');
const menyimpan = ref(false);
const bukaTambah = () => {
  formJurusan.value = defaultJurusanId ?? '';
  formTa.value = sessionTahunAjaranId ?? '';
  tambahOpen.value = true;
};
const tambah = async () => {
  if (!formJurusan.value || !formTa.value) return toastError('Pilih program studi & periode');
  menyimpan.value = true;
  try {
    const item = await settingProdiApi.create({ jurusanId: Number(formJurusan.value), tahunAjaranId: Number(formTa.value) });
    tambahOpen.value = false;
    router.push({ name: 'prodi-setting-detail', params: { id: item.id }, query: { edit: '1' } });
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menambah setting'));
  } finally {
    menyimpan.value = false;
  }
};

const hapus = async (item: SettingProdi) => {
  const ok = await confirmAction({
    title: 'Hapus setting?',
    text: `Setting ${item.jurusan?.namaJurusan ?? ''} periode ${formatTahunAjaran(item.tahunAjaran)} akan dihapus.`,
    confirmLabel: 'Ya, hapus',
  });
  if (!ok) return;
  try {
    await settingProdiApi.remove(item.id);
    toastSuccess('Setting dihapus');
    await load();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus'));
  }
};

onMounted(async () => {
  load();
  try {
    const [jurusan, ta] = await Promise.all([jurusanApi.listProdi({ limit: 200 }), tahunAjaranApi.list({ limit: 100 })]);
    jurusanOptions.value = jurusan.data.map((j) => ({ value: j.id, label: j.kodeProdi ? `${j.kodeProdi} - ${j.namaJurusan}` : j.namaJurusan }));
    tahunAjaranList.value = ta.data;
  } catch {
    // pilihan tambah data tetap kosong
  }
});

const ikon = (v: boolean) => (v ? 'check' : 'close');
</script>

<template>
  <div>
    <PageHeader title="Setting" subtitle="Setting Program Studi per periode akademik" />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-wrap items-center gap-3">
        <p class="text-body-sm text-on-surface-variant">Pengaturan KRS & validasi, KHS & nilai, ujian dan lain-lain untuk tiap periode.</p>
        <AppButton v-if="canCreate" class="ml-auto" icon="add" @click="bukaTambah">Tambah Setting</AppButton>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] border-b border-outline-variant text-label-md text-primary font-semibold">
            <tr>
              <th class="p-4">Periode</th>
              <th class="p-4">Program Studi</th>
              <th class="p-4">Kurikulum Mahasiswa Baru</th>
              <th class="p-4 text-center">Buka KRS</th>
              <th class="p-4 text-center">Buka KHS</th>
              <th class="p-4 text-center">Pengisian Nilai</th>
              <th class="p-4">Diperbarui</th>
              <th class="p-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-if="loading">
              <td colspan="8" class="p-8 text-center text-on-surface-variant">Memuat data...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="8" class="p-8 text-center text-on-surface-variant">
                Belum ada setting program studi.<template v-if="canCreate"> Klik <strong>Tambah Setting</strong> untuk membuat.</template>
              </td>
            </tr>
            <tr v-for="r in rows" v-else :key="r.id" class="hover:bg-surface-container transition-colors">
              <td class="p-4 whitespace-nowrap">
                {{ formatTahunAjaran(r.tahunAjaran) }}
                <span v-if="r.tahunAjaran?.isActive" class="ml-1 px-1.5 py-0.5 rounded bg-primary-container text-on-primary-container text-label-sm">Aktif</span>
              </td>
              <td class="p-4">{{ [r.jurusan?.jenjangPendidikan, r.jurusan?.namaJurusan].filter(Boolean).join(' - ') }}</td>
              <td class="p-4">{{ r.kurikulumMahasiswaBaru?.nama ?? '-' }}</td>
              <td v-for="[k, v] in [['krs', r.bukaKrs], ['khs', r.bukaKhs], ['nilai', r.bukaPengisianNilai]] as [string, boolean][]" :key="k" class="p-4 text-center">
                <span class="material-symbols-outlined" :class="v ? 'text-[#059669]' : 'text-error'" style="font-size: 18px">{{ ikon(v) }}</span>
              </td>
              <td class="p-4 whitespace-nowrap text-on-surface-variant">{{ formatDateTime(r.updatedAt) }}</td>
              <td class="p-4">
                <div class="flex justify-center gap-2">
                  <AppButton variant="secondary" icon="visibility" @click="router.push({ name: 'prodi-setting-detail', params: { id: r.id } })">Detail</AppButton>
                  <button
                    v-if="canDelete"
                    type="button"
                    class="inline-flex items-center justify-center w-9 h-9 rounded-md text-error hover:bg-error-container"
                    title="Hapus"
                    @click="hapus(r)"
                  >
                    <span class="material-symbols-outlined" style="font-size: 18px">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Modal v-model="tambahOpen" title="Tambah Setting Program Studi" size="md">
      <div class="space-y-4">
        <SelectInput v-model="formJurusan" label="Program Studi" required :options="jurusanOptions" placeholder="-- Pilih Program Studi --" :disabled="prodiLocked" />
        <SelectInput v-model="formTa" label="Periode" required :options="tahunAjaranOptions" placeholder="-- Pilih Periode --" />
        <p class="text-body-sm text-on-surface-variant">Setelah dibuat, isi detail setting pada tab KRS & Validasi, KHS & Nilai, Ujian dan Lain-lain.</p>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="tambahOpen = false">Batal</AppButton>
        <AppButton icon="add" :disabled="menyimpan" @click="tambah">{{ menyimpan ? 'Menyimpan...' : 'Tambah' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>

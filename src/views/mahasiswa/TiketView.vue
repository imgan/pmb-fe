<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import {
  mahasiswaTiketApi,
  JENIS_KEBUTUHAN_LABEL,
  STATUS_TIKET_LABEL,
  STATUS_TIKET_VARIANT,
  type JenisKebutuhanTiket,
  type TiketMahasiswa,
} from '@/api/tiketMahasiswa';
import { useMahasiswaAuthStore } from '@/stores/mahasiswaAuth';
import { extractErrorMessage } from '@/api/http';
import { formatDateTime } from '@/utils/format';
import { toastSuccess } from '@/utils/swal';

const mahasiswaAuthStore = useMahasiswaAuthStore();
const JENIS_OPTIONS = Object.entries(JENIS_KEBUTUHAN_LABEL) as [JenisKebutuhanTiket, string][];

const items = ref<TiketMahasiswa[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const jenis = ref<JenisKebutuhanTiket | ''>('');
const uraian = ref('');
const formError = ref<string | null>(null);
const saving = ref(false);
const batalTarget = ref<TiketMahasiswa | null>(null);
const membatalkan = ref(false);

const load = async () => {
  try {
    items.value = await mahasiswaTiketApi.list();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat tiket');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (!mahasiswaAuthStore.mahasiswa) mahasiswaAuthStore.loadProfile().catch(() => undefined);
  load();
});

const reset = () => {
  jenis.value = '';
  uraian.value = '';
  formError.value = null;
};

const simpan = async () => {
  formError.value = null;
  if (!jenis.value) {
    formError.value = 'Pilih jenis kebutuhan';
    return;
  }
  if (uraian.value.trim().length < 5) {
    formError.value = 'Uraikan kendala Anda (minimal 5 karakter)';
    return;
  }
  saving.value = true;
  try {
    const res = await mahasiswaTiketApi.ajukan({ jenisKebutuhan: jenis.value, uraian: uraian.value.trim() });
    toastSuccess(res.message);
    reset();
    await load();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal mengajukan tiket');
  } finally {
    saving.value = false;
  }
};

const batalkan = async () => {
  if (!batalTarget.value) return;
  membatalkan.value = true;
  try {
    await mahasiswaTiketApi.batalkan(batalTarget.value.id);
    toastSuccess('Tiket dibatalkan');
    batalTarget.value = null;
    await load();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal membatalkan tiket');
    batalTarget.value = null;
  } finally {
    membatalkan.value = false;
  }
};
</script>

<template>
  <div>
    <header class="mb-6">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Pengajuan Tiket</h1>
      <p class="text-body-md text-on-surface-variant mt-1">
        Pilih jenis kebutuhan, uraikan kendala Anda, lalu klik Simpan. Petugas akan menanggapi tiket Anda.
      </p>
    </header>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 md:p-6 mb-6">
      <dl class="grid grid-cols-[120px_1fr] md:grid-cols-[160px_1fr] gap-y-2 text-body-md mb-4">
        <dt class="text-on-surface-variant">NIM</dt>
        <dd class="text-on-surface">: {{ mahasiswaAuthStore.mahasiswa?.nim ?? '-' }}</dd>
        <dt class="text-on-surface-variant">Nama</dt>
        <dd class="text-on-surface">: {{ mahasiswaAuthStore.mahasiswa?.namaLengkap ?? '-' }}</dd>
        <dt class="text-on-surface-variant">Program Studi</dt>
        <dd class="text-on-surface">: {{ mahasiswaAuthStore.mahasiswa?.jurusan?.namaJurusan ?? '-' }}</dd>
      </dl>

      <form class="space-y-4" @submit.prevent="simpan">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <fieldset>
          <legend class="block font-medium text-label-md text-on-surface mb-2">Jenis Kebutuhan<span class="text-error"> *</span></legend>
          <div class="flex flex-col gap-2">
            <label v-for="[value, label] in JENIS_OPTIONS" :key="value" class="inline-flex items-center gap-2 text-body-md cursor-pointer">
              <input v-model="jenis" type="radio" name="jenis-kebutuhan" :value="value" class="accent-[var(--color-primary,#8b6f2f)]" />
              <span>{{ label }}</span>
            </label>
          </div>
        </fieldset>
        <label class="block">
          <span class="block font-medium text-label-md text-on-surface mb-2">Uraian<span class="text-error"> *</span></span>
          <textarea
            v-model="uraian"
            rows="4"
            maxlength="2000"
            placeholder="Contoh: Komputer tidak bisa akses sistem informasi pada browser Chrome"
            class="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          ></textarea>
        </label>
        <div class="flex gap-2">
          <AppButton type="submit" :disabled="saving">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
          <AppButton variant="secondary" @click="reset">Batal</AppButton>
        </div>
      </form>
    </section>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Riwayat Tiket</div>
      <div v-if="loading" class="p-6 text-center text-body-sm text-on-surface-variant">Memuat tiket...</div>
      <div v-else-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>
      <div v-else-if="!items.length" class="p-6 text-center text-body-sm text-on-surface-variant">Belum ada tiket.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-body-sm">
          <thead class="text-label-sm text-on-surface-variant border-b border-outline-variant">
            <tr>
              <th class="px-4 py-2 text-left font-medium">No Tiket</th>
              <th class="px-4 py-2 text-left font-medium">Tanggal</th>
              <th class="px-4 py-2 text-left font-medium">Jenis Keluhan</th>
              <th class="px-4 py-2 text-left font-medium">Uraian</th>
              <th class="px-4 py-2 text-left font-medium">Tanggapan</th>
              <th class="px-4 py-2 text-left font-medium">Petugas</th>
              <th class="px-4 py-2 text-center font-medium">Status</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant align-top">
            <tr v-for="t in items" :key="t.id">
              <td class="px-4 py-2 whitespace-nowrap font-medium text-on-surface">{{ t.nomorTiket ?? t.id }}</td>
              <td class="px-4 py-2 whitespace-nowrap">{{ formatDateTime(t.createdAt) }}</td>
              <td class="px-4 py-2 whitespace-nowrap">{{ JENIS_KEBUTUHAN_LABEL[t.jenisKebutuhan] }}</td>
              <td class="px-4 py-2 min-w-48 whitespace-pre-line">{{ t.uraian }}</td>
              <td class="px-4 py-2 min-w-48 whitespace-pre-line">{{ t.tanggapan || '-' }}</td>
              <td class="px-4 py-2 whitespace-nowrap">{{ t.petugas?.name ?? '-' }}</td>
              <td class="px-4 py-2 text-center">
                <StatusBadge :label="STATUS_TIKET_LABEL[t.status]" :variant="STATUS_TIKET_VARIANT[t.status]" />
              </td>
              <td class="px-4 py-2 text-right">
                <button v-if="t.status === 'BARU'" type="button" class="text-label-md text-error hover:underline" @click="batalTarget = t">
                  Batalkan
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ConfirmDialog
      :open="!!batalTarget"
      title="Batalkan Tiket"
      :message="`Batalkan tiket ${batalTarget?.nomorTiket ?? ''}?`"
      :loading="membatalkan"
      @confirm="batalkan"
      @cancel="batalTarget = null"
    />
  </div>
</template>

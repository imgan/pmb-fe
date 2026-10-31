<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import {
  dosenKesediaanMengajarApi,
  HARI_KESEDIAAN,
  type HariKesediaan,
  type KesediaanMengajar,
  type KesediaanMengajarData,
} from '@/api/dosenPortal';
import { extractErrorMessage } from '@/api/http';
import { confirmAction, toastSuccess } from '@/utils/swal';

/**
 * Lain-Lain → Kesediaan Mengajar: matakuliah yang bersedia diajar + jam kesediaan per hari, untuk
 * tahun akademik terpilih (Profil → Setting Tahun Akademik; default tahun aktif). Biasanya diisi
 * setelah UAS sebagai bahan ploting jadwal periode berikutnya.
 */
const HARI_LABEL: Record<HariKesediaan, string> = {
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
  minggu: 'Minggu',
};

const data = ref<KesediaanMengajarData | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    data.value = await dosenKesediaanMengajarApi.get();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kesediaan mengajar');
  } finally {
    loading.value = false;
  }
};
onMounted(load);

// ---- Tabel (cari & paginasi di sisi klien) ----
const search = ref('');
const limit = ref(10);
const page = ref(1);
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  const items = data.value?.items ?? [];
  if (!q) return items;
  return items.filter((r) => [r.kodeMk, r.namaMk, ...HARI_KESEDIAAN.map((h) => r[h])].some((v) => v?.toLowerCase().includes(q)));
});
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / limit.value)));
const paged = computed(() => filtered.value.slice((page.value - 1) * limit.value, page.value * limit.value));
const rangeStart = computed(() => (filtered.value.length ? (page.value - 1) * limit.value + 1 : 0));
watch([search, limit], () => (page.value = 1));

// ---- Form tambah / ubah ----
type JamForm = Record<HariKesediaan, { aktif: boolean; mulai: string; selesai: string }>;
const emptyJam = (): JamForm =>
  Object.fromEntries(HARI_KESEDIAAN.map((h) => [h, { aktif: false, mulai: '08:00', selesai: '12:00' }])) as JamForm;

const isFormOpen = ref(false);
const editing = ref<KesediaanMengajar | null>(null);
const mataKuliahId = ref<string | number | null>('');
const jam = reactive<JamForm>(emptyJam());
const formError = ref<string | null>(null);
const saving = ref(false);

const openForm = (item: KesediaanMengajar | null = null) => {
  editing.value = item;
  formError.value = null;
  mataKuliahId.value = item?.mataKuliahId ?? '';
  Object.assign(jam, emptyJam());
  if (item) {
    HARI_KESEDIAAN.forEach((h) => {
      const v = item[h];
      if (v) jam[h] = { aktif: true, mulai: v.slice(0, 5), selesai: v.slice(6) };
    });
  }
  isFormOpen.value = true;
};

const simpan = async () => {
  if (!mataKuliahId.value) return (formError.value = 'Matakuliah wajib dipilih');
  const aktif = HARI_KESEDIAAN.filter((h) => jam[h].aktif);
  if (!aktif.length) return (formError.value = 'Centang minimal satu hari kesediaan');
  const salah = aktif.find((h) => !jam[h].mulai || !jam[h].selesai || jam[h].mulai >= jam[h].selesai);
  if (salah) return (formError.value = `Jam selesai hari ${HARI_LABEL[salah]} harus setelah jam mulai`);

  const payload = {
    mataKuliahId: Number(mataKuliahId.value),
    ...(Object.fromEntries(HARI_KESEDIAAN.map((h) => [h, jam[h].aktif ? `${jam[h].mulai}-${jam[h].selesai}` : null])) as Record<
      HariKesediaan,
      string | null
    >),
  };
  saving.value = true;
  formError.value = null;
  try {
    if (editing.value) await dosenKesediaanMengajarApi.update(editing.value.id, payload);
    else await dosenKesediaanMengajarApi.create(payload);
    toastSuccess(editing.value ? 'Kesediaan mengajar diperbarui' : 'Kesediaan mengajar ditambahkan');
    isFormOpen.value = false;
    await load();
  } catch (err) {
    formError.value = extractErrorMessage(err, 'Gagal menyimpan kesediaan mengajar');
  } finally {
    saving.value = false;
  }
};

const hapus = async (item: KesediaanMengajar) => {
  const ok = await confirmAction({ title: 'Hapus kesediaan mengajar?', text: `${item.kodeMk ?? ''} ${item.namaMk ?? ''}`.trim(), confirmLabel: 'Ya, hapus' });
  if (!ok) return;
  try {
    await dosenKesediaanMengajarApi.remove(item.id);
    toastSuccess('Kesediaan mengajar dihapus');
    await load();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal menghapus kesediaan mengajar');
  }
};

const tampilJam = (v: string | null) => (v ? v.replace('-', ' – ') : '-');
</script>

<template>
  <div>
    <PageHeader
      title="Form Kesediaan Mengajar"
      :subtitle="`Dosen / Kesediaan Mengajar${data ? ` ${data.tahunAjaran.label}` : ''}`"
    />

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant flex flex-col gap-3">
        <p class="text-body-sm text-on-surface-variant">
          Isi matakuliah yang bersedia Anda ajar beserta jam kesediaan tiap hari sebagai bahan ploting jadwal periode berikutnya.
          Periode mengikuti Setting Tahun Akademik di menu profil.
        </p>
        <div>
          <AppButton icon="add" :disabled="loading || !data" @click="openForm()">Tambah</AppButton>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <PageSizeSelect v-model="limit" />
          <SearchInput v-model="search" placeholder="Cari matakuliah atau jam..." />
        </div>
      </div>

      <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead class="bg-[#F1F5F9] border-b border-outline-variant">
            <tr class="text-label-md text-primary font-semibold">
              <th class="p-3 text-center">No</th>
              <th v-for="h in HARI_KESEDIAAN" :key="h" class="p-3 text-center whitespace-nowrap">{{ HARI_LABEL[h] }}</th>
              <th class="p-3">Matakuliah</th>
              <th class="p-3 text-center">#</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant text-body-sm text-on-surface">
            <tr v-if="!paged.length">
              <td :colspan="HARI_KESEDIAAN.length + 3" class="p-6 text-center text-on-surface-variant">Belum ada data kesediaan mengajar</td>
            </tr>
            <tr v-for="(item, i) in paged" :key="item.id">
              <td class="p-3 text-center">{{ rangeStart + i }}</td>
              <td v-for="h in HARI_KESEDIAAN" :key="h" class="p-3 text-center whitespace-nowrap" :class="{ 'text-on-surface-variant': !item[h] }">
                {{ tampilJam(item[h]) }}
              </td>
              <td class="p-3 min-w-[14rem]">
                <div class="font-medium">{{ item.namaMk ?? '-' }}</div>
                <div class="text-label-sm text-on-surface-variant">{{ item.kodeMk }} &middot; {{ item.sks ?? '-' }} SKS</div>
              </td>
              <td class="p-3">
                <div class="flex justify-center gap-1">
                  <AppButton variant="ghost" icon="edit" @click="openForm(item)">Ubah</AppButton>
                  <AppButton variant="ghost" icon="delete" @click="hapus(item)">Hapus</AppButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading" class="px-4 py-3 border-t border-outline-variant flex items-center justify-between gap-3 text-body-sm text-on-surface-variant">
        <span>Menampilkan {{ rangeStart }}–{{ Math.min(page * limit, filtered.length) }} dari {{ filtered.length }} data</span>
        <div class="flex items-center gap-1">
          <button type="button" class="px-3 py-1 rounded-md border border-outline-variant disabled:opacity-40" :disabled="page <= 1" @click="page--">‹</button>
          <span class="px-2">{{ page }} / {{ totalPages }}</span>
          <button type="button" class="px-3 py-1 rounded-md border border-outline-variant disabled:opacity-40" :disabled="page >= totalPages" @click="page++">›</button>
        </div>
      </div>
    </section>

    <Modal
      v-model="isFormOpen"
      :title="editing ? 'Ubah Kesediaan Mengajar' : 'Tambah Kesediaan Mengajar'"
      :subtitle="data ? `Tahun Akademik ${data.tahunAjaran.label}` : ''"
      size="lg"
    >
      <div class="space-y-4">
        <div v-if="formError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ formError }}</div>
        <SearchableSelect
          v-model="mataKuliahId"
          label="Matakuliah"
          required
          placeholder="--Pilih matakuliah--"
          search-placeholder="Cari kode atau nama matakuliah..."
          :options="data?.mataKuliahOptions ?? []"
        />
        <div>
          <p class="font-medium text-label-md text-on-surface mb-2">Jam Kesediaan <span class="text-error">*</span></p>
          <div class="border border-outline-variant rounded-md divide-y divide-outline-variant">
            <div v-for="h in HARI_KESEDIAAN" :key="h" class="px-3 py-2 flex flex-wrap items-center gap-3">
              <label class="flex items-center gap-2 w-28 text-body-sm text-on-surface">
                <input v-model="jam[h].aktif" type="checkbox" class="accent-[var(--color-primary,#8b6f2f)]" />
                {{ HARI_LABEL[h] }}
              </label>
              <template v-if="jam[h].aktif">
                <input
                  v-model="jam[h].mulai"
                  type="time"
                  class="px-2 py-1 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm"
                />
                <span class="text-on-surface-variant">s/d</span>
                <input
                  v-model="jam[h].selesai"
                  type="time"
                  class="px-2 py-1 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm"
                />
              </template>
              <span v-else class="text-body-sm text-on-surface-variant">Tidak bersedia</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="isFormOpen = false">Batal</AppButton>
        <AppButton :disabled="saving" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>

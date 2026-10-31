<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import Modal from '@/components/ui/Modal.vue';
import KalenderBulanan from '@/components/KalenderBulanan.vue';
import { durasiHari, KATEGORI_BY, rentangTanggal, ymd, type KegiatanKalender } from '@/api/kalenderAkademik';
import { mahasiswaKalenderAkademikApi } from '@/api/mahasiswaPortal';
import { extractErrorMessage } from '@/api/http';

/**
 * Jadwal → Kalender Akademik (portal mahasiswa, hanya lihat): kegiatan akademik yang diatur BAAK,
 * default tahun akademik aktif. Klik kegiatan untuk melihat detailnya.
 */
const tahunAjaranOptions = ref<{ value: number; label: string }[]>([]);
const tahunAjaranId = ref<number | ''>('');
const items = ref<KegiatanKalender[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const tampilan = ref<'kalender' | 'daftar'>('kalender');
const hariIni = ymd(new Date());

const muat = async (id?: number) => {
  loading.value = true;
  error.value = null;
  try {
    const res = await mahasiswaKalenderAkademikApi.get(id);
    tahunAjaranOptions.value = res.tahunAjaranOptions;
    tahunAjaranId.value = res.tahunAjaranId ?? '';
    items.value = res.items;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kalender akademik');
  } finally {
    loading.value = false;
  }
};
onMounted(() => muat());
const gantiTahun = (v: string | number | null) => {
  if (v) muat(Number(v));
};

const periodeLabel = computed(() => tahunAjaranOptions.value.find((t) => t.value === tahunAjaranId.value)?.label ?? '-');
const akanDatang = computed(() => items.value.filter((k) => k.tanggalSelesai >= hariIni).slice(0, 5));

const detail = ref<KegiatanKalender | null>(null);
const detailOpen = computed({
  get: () => !!detail.value,
  set: (v: boolean) => {
    if (!v) detail.value = null;
  },
});
</script>

<template>
  <div>
    <header class="mb-6">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Kalender Akademik</h1>
      <p class="text-body-md text-on-surface-variant mt-1">Jadwal kegiatan akademik kampus: perkuliahan, KRS, ujian, libur, wisuda, dan lainnya.</p>
    </header>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-6 flex flex-col md:flex-row md:items-end gap-4">
      <div class="w-full md:w-72">
        <SelectInput
          v-model="tahunAjaranId"
          label="Tahun Akademik"
          :options="tahunAjaranOptions"
          :clearable="false"
          placeholder="Tahun akademik"
          @change="gantiTahun"
        />
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

    <!-- Kegiatan terdekat -->
    <section v-if="akanDatang.length" class="mb-6 bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
      <h2 class="text-label-md font-semibold text-on-surface mb-3">Kegiatan berlangsung & akan datang</h2>
      <ul class="space-y-2">
        <li v-for="k in akanDatang" :key="k.id" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
          <span class="w-3 h-3 rounded-sm shrink-0 border border-outline-variant" :style="{ background: KATEGORI_BY[k.kategori].color }"></span>
          <span class="font-medium text-on-surface">{{ k.namaKegiatan }}</span>
          <span class="text-on-surface-variant">{{ rentangTanggal(k) }}</span>
          <span v-if="k.tanggalMulai <= hariIni" class="px-2 py-0.5 rounded-full bg-primary text-on-primary text-label-sm">Berlangsung</span>
        </li>
      </ul>
    </section>

    <KalenderBulanan
      v-if="tampilan === 'kalender'"
      :items="items"
      :loading="loading"
      :reset-key="tahunAjaranId"
      :kosong-pesan="`Belum ada kegiatan pada ${periodeLabel}.`"
      @kegiatan="detail = $event"
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
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="p-6 text-center text-on-surface-variant">Memuat...</td>
            </tr>
            <tr v-else-if="!items.length">
              <td colspan="6" class="p-6 text-center text-on-surface-variant">Belum ada kegiatan pada {{ periodeLabel }}.</td>
            </tr>
            <template v-else>
              <tr
                v-for="(k, i) in items"
                :key="k.id"
                class="border-t border-outline-variant"
                :class="k.tanggalMulai <= hariIni && k.tanggalSelesai >= hariIni ? 'bg-primary/5' : ''"
              >
                <td class="px-3 py-2.5 text-center tabular-nums">{{ i + 1 }}</td>
                <td class="px-3 py-2.5 font-medium text-on-surface">{{ k.namaKegiatan }}</td>
                <td class="px-3 py-2.5">
                  <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span class="w-2.5 h-2.5 rounded-sm border border-outline-variant" :style="{ background: KATEGORI_BY[k.kategori].color }"></span>
                    {{ KATEGORI_BY[k.kategori].label }}
                  </span>
                </td>
                <td class="px-3 py-2.5 whitespace-nowrap">{{ rentangTanggal(k) }}</td>
                <td class="px-3 py-2.5 text-center tabular-nums">{{ durasiHari(k) }} hari</td>
                <td class="px-3 py-2.5 text-on-surface-variant">{{ k.keterangan || '-' }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <Modal v-model="detailOpen" :title="detail?.namaKegiatan ?? ''" size="md">
      <dl v-if="detail" class="space-y-2 text-body-md">
        <div class="flex gap-3"><dt class="w-28 text-on-surface-variant">Kategori</dt><dd>{{ KATEGORI_BY[detail.kategori].label }}</dd></div>
        <div class="flex gap-3"><dt class="w-28 text-on-surface-variant">Tanggal</dt><dd>{{ rentangTanggal(detail) }} ({{ durasiHari(detail) }} hari)</dd></div>
        <div class="flex gap-3"><dt class="w-28 text-on-surface-variant">Keterangan</dt><dd>{{ detail.keterangan || '-' }}</dd></div>
      </dl>
    </Modal>
  </div>
</template>

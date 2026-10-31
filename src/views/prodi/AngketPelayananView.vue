<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import { angketPelayananApi, type RekapAngketPelayanan } from '@/api/angketPelayanan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { useProdiContext } from '@/composables/useProdiContext';

// Hasil angket pelayanan mahasiswa (diisi sebelum KRS, skor 1–5). Data dibatasi ke prodi sesi
// (akun Kaprodi terkunci ke prodinya). Saran ditampilkan tanpa identitas — angket bersifat anonim.
const { prodi, tahunAjaranId: sessionTahunAjaranId } = useProdiContext();

const tahunAjaranOptions = ref<SelectOption[]>([]);
const tahunAjaranId = ref<number | ''>('');
const angkatan = ref<number | ''>('');
const ANGKATAN_OPTIONS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => ({ value: y, label: String(y) }));

const rekap = ref<RekapAngketPelayanan | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    rekap.value = await angketPelayananApi.rekap({
      tahunAjaranId: tahunAjaranId.value || undefined,
      angkatan: angkatan.value || undefined,
    });
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat hasil angket');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const result = await tahunAjaranApi.list({ limit: 100 });
    tahunAjaranOptions.value = result.data.map((t) => ({ value: t.id, label: `${t.nama} ${t.jenisSemester}` }));
    tahunAjaranId.value =
      result.data.find((t) => t.id === sessionTahunAjaranId)?.id ?? result.data.find((t) => t.isActive)?.id ?? '';
  } catch {
    tahunAjaranOptions.value = [];
  }
  load();
});
watch([tahunAjaranId, angkatan], load);

// Pagination saran (data sudah dimuat semua, dipotong di tampilan).
const saranPage = ref(1);
const saranPageSize = ref(10);
watch([rekap, saranPageSize], () => (saranPage.value = 1));
const saranMeta = computed(() => {
  const total = rekap.value?.saran.length ?? 0;
  return { total, page: saranPage.value, limit: saranPageSize.value, totalPages: Math.max(1, Math.ceil(total / saranPageSize.value)) };
});
const saranItems = computed(() =>
  (rekap.value?.saran ?? []).slice((saranPage.value - 1) * saranPageSize.value, saranPage.value * saranPageSize.value)
);

const persenResponden = computed(() =>
  rekap.value && rekap.value.totalMahasiswa ? Math.round((rekap.value.responden / rekap.value.totalMahasiswa) * 1000) / 10 : 0
);

// Kelompokkan pertanyaan per kategori.
const kelompok = computed(() => {
  const map = new Map<string, RekapAngketPelayanan['pertanyaan']>();
  (rekap.value?.pertanyaan ?? []).forEach((p) => {
    const key = p.kategori ?? 'Lainnya';
    map.set(key, [...(map.get(key) ?? []), p]);
  });
  return [...map.entries()].map(([kategori, items]) => {
    const terisi = items.filter((i) => i.rataRata !== null);
    return {
      kategori,
      items,
      rataRata: terisi.length ? Math.round((terisi.reduce((s, i) => s + (i.rataRata ?? 0), 0) / terisi.length) * 100) / 100 : null,
    };
  });
});

const SKOR = ['1', '2', '3', '4', '5'] as const;
const SKOR_COLOR: Record<(typeof SKOR)[number], string> = {
  '1': 'bg-error',
  '2': 'bg-[#E0A93B]',
  '3': 'bg-outline',
  '4': 'bg-[#4F8FC0]',
  '5': 'bg-[#059669]',
};
const SKOR_LABEL: Record<(typeof SKOR)[number], string> = {
  '1': 'Sangat tidak puas',
  '2': 'Tidak puas',
  '3': 'Cukup',
  '4': 'Puas',
  '5': 'Sangat puas',
};
const persen = (n: number, total: number) => (total ? (n / total) * 100 : 0);
const formatTanggal = (v: string) => new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
</script>

<template>
  <div>
    <PageHeader
      title="Angket Pelayanan"
      :subtitle="`Hasil angket kepuasan pelayanan yang diisi mahasiswa sebelum KRS${prodi ? ` — ${prodi.nama}` : ''}.`"
    />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <SelectInput v-model="tahunAjaranId" label="Tahun Ajaran" placeholder="Semua tahun ajaran" :options="tahunAjaranOptions" />
      <SelectInput v-model="angkatan" label="Angkatan" placeholder="Semua angkatan" :options="ANGKATAN_OPTIONS" />
    </section>

    <div v-if="error" class="mb-4 p-3 rounded-md text-body-sm text-error bg-error-container">{{ error }}</div>
    <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>

    <template v-else-if="rekap">
      <section class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
          <p class="text-label-md text-on-surface-variant">Responden</p>
          <p class="text-headline-md font-semibold tabular-nums">{{ rekap.responden }} <span class="text-body-md font-normal text-on-surface-variant">/ {{ rekap.totalMahasiswa }} mahasiswa aktif</span></p>
          <p class="text-label-sm text-on-surface-variant">{{ persenResponden }}% sudah mengisi</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
          <p class="text-label-md text-on-surface-variant">Rata-rata Kepuasan</p>
          <p class="text-headline-md font-semibold tabular-nums">{{ rekap.rataRataKeseluruhan ?? '-' }} <span class="text-body-md font-normal text-on-surface-variant">/ 5</span></p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
          <p class="text-label-md text-on-surface-variant">Saran Masuk</p>
          <p class="text-headline-md font-semibold tabular-nums">{{ rekap.saran.length }}</p>
        </div>
      </section>

      <p v-if="!rekap.responden" class="p-8 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg">
        Belum ada mahasiswa yang mengisi angket untuk filter ini.
      </p>

      <template v-else>
        <section
          v-for="k in kelompok"
          :key="k.kategori"
          class="mb-6 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden"
        >
          <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium flex justify-between">
            <span>{{ k.kategori }}</span>
            <span>Rata-rata {{ k.rataRata ?? '-' }}</span>
          </div>
          <div class="divide-y divide-outline-variant">
            <div v-for="p in k.items" :key="p.id" class="p-4 grid grid-cols-1 md:grid-cols-[1fr_16rem_4rem] gap-3 md:items-center">
              <p class="text-body-md text-on-surface">{{ p.pertanyaan }}</p>
              <div>
                <div class="flex h-3 rounded-full overflow-hidden bg-surface-container">
                  <div
                    v-for="s in SKOR"
                    :key="s"
                    :class="SKOR_COLOR[s]"
                    :style="{ width: `${persen(p.distribusi[s], p.jumlahJawaban)}%` }"
                    :title="`${SKOR_LABEL[s]} (${s}): ${p.distribusi[s]} orang`"
                  ></div>
                </div>
                <p class="mt-1 text-label-sm text-on-surface-variant tabular-nums">
                  <span v-for="s in SKOR" :key="s" class="mr-2">{{ s }}: {{ p.distribusi[s] }}</span>
                </p>
              </div>
              <p class="text-headline-md font-semibold tabular-nums text-right">{{ p.rataRata ?? '-' }}</p>
            </div>
          </div>
        </section>

        <div class="mb-6 flex flex-wrap gap-4 text-label-sm text-on-surface-variant">
          <span v-for="s in SKOR" :key="s" class="flex items-center gap-1.5">
            <span class="inline-block w-3 h-3 rounded-sm" :class="SKOR_COLOR[s]"></span>{{ s }} = {{ SKOR_LABEL[s] }}
          </span>
        </div>

        <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
          <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">Saran Mahasiswa (anonim)</div>
          <p v-if="!rekap.saran.length" class="p-6 text-center text-body-sm text-on-surface-variant">Belum ada saran.</p>
          <div v-if="rekap.saran.length" class="px-4 py-3 border-b border-outline-variant">
            <PageSizeSelect v-model="saranPageSize" />
          </div>
          <ul v-if="rekap.saran.length" class="divide-y divide-outline-variant">
            <li v-for="s in saranItems" :key="s.id" class="p-4">
              <p class="text-body-md text-on-surface whitespace-pre-line">{{ s.saran }}</p>
              <p class="mt-1 text-label-sm text-on-surface-variant">
                {{ s.prodi ?? '-' }} · Angkatan {{ s.angkatan ?? '-' }} · {{ formatTanggal(s.tanggal) }}
              </p>
            </li>
          </ul>
          <Pagination v-if="rekap.saran.length" v-model="saranPage" :meta="saranMeta" />
        </section>
      </template>
    </template>
  </div>
</template>

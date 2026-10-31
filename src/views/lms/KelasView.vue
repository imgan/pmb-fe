<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import LmsFilterBar from '@/components/lms/LmsFilterBar.vue';
import ProgresBar from '@/components/lms/ProgresBar.vue';
import MataKuliahIlustrasi from '@/components/elearning/MataKuliahIlustrasi.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import { useLmsData } from '@/composables/useLmsFilter';
import { usePaginasi } from '@/composables/usePaginasi';
import { lmsConsoleApi, type LmsKelasRekap } from '@/api/lmsConsole';
import { JENIS_KONTEN, teksAngka, waktuRelatif } from '@/utils/lmsKonten';

/** LMS → Kelas Online: semua kelas (jadwal kuliah) tahun akademik terpilih + rekap e-learning tiap kelas. */
const route = useRoute();
const search = ref('');
const status = ref<'' | 'ADA' | 'KOSONG'>(route.query.status === 'KOSONG' || route.query.status === 'ADA' ? (route.query.status as 'ADA' | 'KOSONG') : '');
const { data, loading, error } = useLmsData<LmsKelasRekap[]>(lmsConsoleApi.kelas, () => ({ search: search.value, status: status.value }), 'Gagal memuat kelas');

const rows = computed(() => data.value ?? []);
const { page, limit, meta, halaman } = usePaginasi(rows);
const ringkas = computed(() => ({
  total: rows.value.length,
  berkonten: rows.value.filter((r) => r.totalKonten).length,
  belumDinilai: rows.value.reduce((s, r) => s + r.tugasBelumDinilai, 0),
}));
const JENIS_KOLOM = ['materi', 'video', 'kuis', 'tugas'] as const;
const META_KOLOM = { materi: JENIS_KONTEN.MATERI, video: JENIS_KONTEN.VIDEO, kuis: JENIS_KONTEN.KUIS, tugas: JENIS_KONTEN.TUGAS };
</script>

<template>
  <div>
    <PageHeader title="Kelas Online" subtitle="LMS / Kelas Online — e-learning tiap kelas perkuliahan." />
    <LmsFilterBar v-model:search="search" placeholder="Cari mata kuliah, kelas, dosen...">
      <div class="flex rounded-lg border border-outline-variant overflow-hidden text-label-md h-10">
        <button
          v-for="s in [
            { key: '', label: 'Semua' },
            { key: 'ADA', label: 'Berkonten' },
            { key: 'KOSONG', label: 'Belum ada konten' },
          ] as const"
          :key="s.key"
          type="button"
          class="px-3 transition-colors"
          :class="status === s.key ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-container'"
          @click="status = s.key"
        >
          {{ s.label }}
        </button>
      </div>
    </LmsFilterBar>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <PageSizeSelect v-model="limit" />
      <p class="text-body-sm text-on-surface-variant">
        {{ ringkas.total }} kelas · {{ ringkas.berkonten }} berkonten
        <template v-if="ringkas.belumDinilai">
          ·
          <span class="text-[#b45309] font-medium">{{ ringkas.belumDinilai }} tugas belum dinilai</span>
        </template>
      </p>
    </div>

    <div class="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden" :class="{ 'opacity-60': loading }">
      <div class="overflow-x-auto">
        <table class="w-full text-body-sm">
          <thead class="bg-surface-container-low text-label-md text-on-surface-variant">
            <tr>
              <th class="text-left font-semibold px-4 py-3">Mata Kuliah</th>
              <th class="text-left font-semibold px-3 py-3">Dosen</th>
              <th class="text-center font-semibold px-2 py-3">Peserta</th>
              <th class="text-center font-semibold px-3 py-3">Konten</th>
              <th class="text-left font-semibold px-3 py-3">Keaktifan</th>
              <th class="text-left font-semibold px-3 py-3">Penyelesaian</th>
              <th class="text-center font-semibold px-2 py-3">Kuis / Tugas</th>
              <th class="text-left font-semibold px-3 py-3">Terakhir</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && !rows.length"><td colspan="8" class="px-4 py-10 text-center text-on-surface-variant">Tidak ada kelas.</td></tr>
            <tr v-for="k in halaman" :key="k.id" class="border-t border-outline-variant hover:bg-surface-container-low">
              <td class="px-4 py-3">
                <RouterLink :to="{ name: 'lms-kelas-detail', params: { id: k.id } }" class="flex items-center gap-3 group">
                  <MataKuliahIlustrasi :nama="k.namaMataKuliah" :kode="k.kodeMataKuliah" :ikon="k.ikon" ukuran="sm" />
                  <div class="min-w-0">
                    <p class="font-semibold text-on-surface group-hover:text-primary">{{ k.namaMataKuliah }}</p>
                    <p class="text-label-sm text-on-surface-variant">{{ k.kodeMataKuliah }} · Kelas {{ k.kelas }} · {{ k.prodi ?? '-' }}</p>
                  </div>
                </RouterLink>
              </td>
              <td class="px-3 py-3 text-on-surface">
                {{ k.dosen ?? '-' }}
                <p v-if="k.pengampu.length" class="text-label-sm text-on-surface-variant">+ {{ k.pengampu.length }} pengampu</p>
              </td>
              <td class="px-2 py-3 text-center tabular-nums">{{ k.peserta }}</td>
              <td class="px-3 py-3">
                <div v-if="k.totalKonten" class="flex justify-center gap-1.5">
                  <span
                    v-for="j in JENIS_KOLOM"
                    v-show="k.jumlah[j]"
                    :key="j"
                    class="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-label-sm"
                    :class="META_KOLOM[j].kelas"
                    :title="META_KOLOM[j].label"
                  >
                    <span class="material-symbols-outlined" style="font-size: 14px">{{ META_KOLOM[j].icon }}</span>
                    {{ k.jumlah[j] }}
                  </span>
                </div>
                <p v-else class="text-center text-label-sm text-on-surface-variant">Belum ada</p>
                <p v-if="k.draf" class="text-center text-[11px] text-on-surface-variant mt-0.5">{{ k.draf }} draf</p>
              </td>
              <td class="px-3 py-3">
                <ProgresBar
                  :nilai="k.totalKonten ? k.keaktifan : null"
                  :keterangan="k.totalKonten ? `${k.mahasiswaAktif}/${k.peserta} mahasiswa` : undefined"
                />
              </td>
              <td class="px-3 py-3"><ProgresBar :nilai="k.penyelesaian" :keterangan="k.penugasan ? `${k.selesai}/${k.penugasan} penugasan` : undefined" /></td>
              <td class="px-2 py-3 text-center tabular-nums">
                {{ teksAngka(k.rataKuis) }} / {{ teksAngka(k.rataTugas) }}
                <p v-if="k.tugasBelumDinilai" class="text-[11px] text-[#b45309]">{{ k.tugasBelumDinilai }} belum dinilai</p>
              </td>
              <td class="px-3 py-3 text-label-sm text-on-surface-variant whitespace-nowrap">{{ waktuRelatif(k.kontenTerakhir) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination v-model="page" :meta="meta" />
    </div>
  </div>
</template>

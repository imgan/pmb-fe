<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import ProgresBar from '@/components/lms/ProgresBar.vue';
import KontenDetailModal from '@/components/lms/KontenDetailModal.vue';
import MataKuliahIlustrasi from '@/components/elearning/MataKuliahIlustrasi.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import { usePaginasi } from '@/composables/usePaginasi';
import { lmsConsoleApi, type LmsKelasDetail } from '@/api/lmsConsole';
import { extractErrorMessage } from '@/api/http';
import { formatDateTime } from '@/utils/format';
import { JENIS_KONTEN, TARGET_KONTEN, teksAngka, teksDurasi, waktuRelatif } from '@/utils/lmsKonten';

/** LMS → Kelas Online → detail: info kelas, daftar konten e-learning + statistik, dan progres tiap peserta. */
const route = useRoute();
const data = ref<LmsKelasDetail | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
onMounted(async () => {
  loading.value = true;
  try {
    data.value = await lmsConsoleApi.kelasDetail(String(route.params.id));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kelas');
  } finally {
    loading.value = false;
  }
});

const tab = ref<'konten' | 'peserta'>('konten');
const cari = ref('');
const peserta = computed(() => {
  const s = cari.value.trim().toLowerCase();
  return (data.value?.peserta ?? []).filter((p) => !s || p.nama.toLowerCase().includes(s) || p.nim.includes(s));
});
const konten = computed(() => data.value?.konten ?? []);
const { page: pageKonten, limit: limitKonten, meta: metaKonten, halaman: halamanKonten } = usePaginasi(konten);
const { page: pagePeserta, limit: limitPeserta, meta: metaPeserta, halaman: halamanPeserta } = usePaginasi(peserta);
const detailOpen = ref(false);
const detailId = ref<number | null>(null);
const bukaKonten = (id: number) => {
  detailId.value = id;
  detailOpen.value = true;
};
</script>

<template>
  <div>
    <PageHeader
      :title="data?.kelas.namaMataKuliah ?? 'Detail Kelas'"
      :subtitle="data ? `${data.kelas.kodeMataKuliah} · Kelas ${data.kelas.kelas} · ${data.kelas.tahunAjaran ?? ''}` : ''"
      :back-to="{ name: 'lms-kelas' }"
      back-label="Kelas Online"
    />
    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-if="loading" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat...</div>

    <template v-if="data">
      <section class="mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 flex flex-wrap items-center gap-5">
        <MataKuliahIlustrasi :nama="data.kelas.namaMataKuliah" :kode="data.kelas.kodeMataKuliah" :ikon="data.kelas.ikon" ukuran="lg" />
        <dl class="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-3 text-body-sm flex-1">
          <div>
            <dt class="text-label-sm text-on-surface-variant">Prodi</dt>
            <dd class="font-medium text-on-surface">{{ data.kelas.prodi ?? '-' }}</dd>
          </div>
          <div>
            <dt class="text-label-sm text-on-surface-variant">Dosen koordinator</dt>
            <dd class="font-medium text-on-surface">{{ data.kelas.dosen ?? '-' }}</dd>
            <dd v-if="data.kelas.pengampu.length" class="text-label-sm text-on-surface-variant">Pengampu: {{ data.kelas.pengampu.join('; ') }}</dd>
          </div>
          <div>
            <dt class="text-label-sm text-on-surface-variant">SKS · Semester</dt>
            <dd class="font-medium text-on-surface">{{ data.kelas.sks ?? '-' }} · {{ data.kelas.semester ?? '-' }}</dd>
          </div>
          <div>
            <dt class="text-label-sm text-on-surface-variant">Peserta</dt>
            <dd class="font-medium text-on-surface">{{ data.kelas.peserta }} mahasiswa</dd>
          </div>
          <div>
            <dt class="text-label-sm text-on-surface-variant">Konten</dt>
            <dd class="font-medium text-on-surface">{{ data.konten.length }} ({{ data.konten.filter((k) => !k.isPublished).length }} draf)</dd>
          </div>
        </dl>
      </section>

      <div class="mb-4 flex items-center gap-2 border-b border-outline-variant">
        <button
          v-for="t in [
            { key: 'konten', label: `Konten (${data.konten.length})`, icon: 'library_books' },
            { key: 'peserta', label: `Progres Peserta (${data.peserta.length})`, icon: 'groups' },
          ] as const"
          :key="t.key"
          type="button"
          class="-mb-px flex items-center gap-1.5 px-4 py-2.5 border-b-2 text-label-md transition-colors"
          :class="tab === t.key ? 'border-primary text-primary font-semibold' : 'border-transparent text-on-surface-variant hover:text-on-surface'"
          @click="tab = t.key"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">{{ t.icon }}</span>
          {{ t.label }}
        </button>
        <input
          v-if="tab === 'peserta'"
          v-model="cari"
          type="text"
          placeholder="Cari NIM / nama..."
          class="ml-auto mb-1 w-56 px-3 py-1.5 border border-outline-variant rounded-lg bg-surface-container-lowest text-body-sm focus:border-primary focus:outline-none"
        />
      </div>

      <!-- Konten -->
      <template v-if="tab === 'konten'">
        <PageSizeSelect v-model="limitKonten" class="mb-3" />
        <div class="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-body-sm">
              <thead class="bg-surface-container-low text-label-md text-on-surface-variant">
                <tr>
                  <th class="text-left font-semibold px-4 py-3">Konten</th>
                  <th class="text-center font-semibold px-2 py-3">Pert.</th>
                  <th class="text-left font-semibold px-3 py-3">Penerima</th>
                  <th class="text-center font-semibold px-2 py-3">Dilihat</th>
                  <th class="text-left font-semibold px-3 py-3">Penyelesaian</th>
                  <th class="text-center font-semibold px-2 py-3">Rata</th>
                  <th class="text-center font-semibold px-2 py-3">Komentar</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!data.konten.length">
                  <td colspan="7" class="px-4 py-10 text-center text-on-surface-variant">Dosen belum mengunggah konten e-learning di kelas ini.</td>
                </tr>
                <tr
                  v-for="k in halamanKonten"
                  :key="k.id"
                  class="border-t border-outline-variant hover:bg-surface-container-low cursor-pointer"
                  @click="bukaKonten(k.id)"
                >
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <span class="material-symbols-outlined rounded-md p-1.5" :class="JENIS_KONTEN[k.jenis].kelas" style="font-size: 18px">
                        {{ JENIS_KONTEN[k.jenis].icon }}
                      </span>
                      <div class="min-w-0">
                        <p class="font-semibold text-on-surface">
                          {{ k.judul }}
                          <span v-if="!k.isPublished" class="ml-1 rounded px-1.5 py-0.5 text-[11px] bg-surface-container text-on-surface-variant font-normal">
                            Draf
                          </span>
                        </p>
                        <p class="text-label-sm text-on-surface-variant">
                          {{ JENIS_KONTEN[k.jenis].label }} · {{ formatDateTime(k.createdAt) }}
                          <template v-if="k.tenggat">· tenggat {{ formatDateTime(k.tenggat) }}</template>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td class="px-2 py-3 text-center">{{ k.pertemuanKe ?? '–' }}</td>
                  <td class="px-3 py-3">
                    {{ k.penerima }}
                    <span class="text-label-sm text-on-surface-variant">· {{ TARGET_KONTEN[k.target] }}</span>
                  </td>
                  <td class="px-2 py-3 text-center tabular-nums">
                    {{ k.melihat }}
                    <span class="text-label-sm text-on-surface-variant">({{ k.dilihat }}×)</span>
                  </td>
                  <td class="px-3 py-3"><ProgresBar :nilai="k.penyelesaian" :keterangan="`${k.selesai}/${k.penerima}`" /></td>
                  <td class="px-2 py-3 text-center tabular-nums">{{ teksAngka(k.rata) }}</td>
                  <td class="px-2 py-3 text-center tabular-nums">{{ k.komentar }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Pagination v-model="pageKonten" :meta="metaKonten" />
        </div>
      </template>

      <!-- Progres peserta -->
      <template v-else>
        <PageSizeSelect v-model="limitPeserta" class="mb-3" />
        <div class="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-body-sm">
              <thead class="bg-surface-container-low text-label-md text-on-surface-variant">
                <tr>
                  <th class="text-left font-semibold px-4 py-3">NIM</th>
                  <th class="text-left font-semibold px-3 py-3">Nama</th>
                  <th class="text-left font-semibold px-3 py-3">Penyelesaian</th>
                  <th class="text-center font-semibold px-2 py-3">Rata Kuis</th>
                  <th class="text-center font-semibold px-2 py-3">Rata Tugas</th>
                  <th class="text-center font-semibold px-2 py-3">Dilihat</th>
                  <th class="text-center font-semibold px-2 py-3">Durasi</th>
                  <th class="text-left font-semibold px-3 py-3">Terakhir aktif</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!peserta.length"><td colspan="8" class="px-4 py-10 text-center text-on-surface-variant">Tidak ada peserta.</td></tr>
                <tr v-for="p in halamanPeserta" :key="p.id" class="border-t border-outline-variant">
                  <td class="px-4 py-2.5 tabular-nums">{{ p.nim }}</td>
                  <td class="px-3 py-2.5 font-medium text-on-surface">{{ p.nama }}</td>
                  <td class="px-3 py-2.5"><ProgresBar :nilai="p.penyelesaian" :keterangan="`${p.selesai}/${p.ditugaskan} konten`" /></td>
                  <td class="px-2 py-2.5 text-center tabular-nums">{{ teksAngka(p.rataKuis) }}</td>
                  <td class="px-2 py-2.5 text-center tabular-nums">{{ teksAngka(p.rataTugas) }}</td>
                  <td class="px-2 py-2.5 text-center tabular-nums">{{ p.dilihat || '–' }}</td>
                  <td class="px-2 py-2.5 text-center">{{ teksDurasi(p.durasi) }}</td>
                  <td class="px-3 py-2.5 text-label-sm text-on-surface-variant whitespace-nowrap">{{ waktuRelatif(p.terakhirAktif) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Pagination v-model="pagePeserta" :meta="metaPeserta" />
        </div>
      </template>
    </template>

    <KontenDetailModal v-model="detailOpen" :konten-id="detailId" />
  </div>
</template>

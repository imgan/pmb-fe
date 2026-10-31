<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Pagination from '@/components/ui/Pagination.vue';
import HoverTip from '@/components/ui/HoverTip.vue';
import { dosenMataKuliahApi, type DosenMataKuliahRow } from '@/api/dosenMataKuliah';
import { extractErrorMessage } from '@/api/http';

/**
 * Daftar mata kuliah yang diajar dosen login pada tahun akademik terpilih (Profil → Setting Tahun Akademik)
 * beserta status pengisian RPS / CPL / CPMK — dipakai halaman Input Nilai. Tombol kelas memancarkan
 * `pilih` (buka input nilai kelas tsb); ikon mata membuka halaman RPS yang sama dengan Prodi.
 */
const emit = defineEmits<{ pilih: [kelasId: number]; loaded: [tahunAjaran: { id: number; nama: string } | null] }>();
const rows = ref<DosenMataKuliahRow[]>([]);
const tahunAjaran = ref<{ id: number; nama: string } | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    const data = await dosenMataKuliahApi.list();
    rows.value = data.rows;
    tahunAjaran.value = data.tahunAjaran;
    emit('loaded', data.tahunAjaran);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat mata kuliah');
  } finally {
    loading.value = false;
  }
};
onMounted(load);

// ---- Filter jenis kurikulum + cari (diterapkan lewat tombol cari / Enter) ----
const jenis = ref<'' | 'obe' | 'non'>('');
const cari = ref('');
const search = ref('');
const terapkanCari = () => (search.value = cari.value.trim());
const muatUlang = () => {
  cari.value = '';
  search.value = '';
  jenis.value = '';
  load();
};

const page = ref(1);
const pageSize = ref(10);
watch([search, jenis, pageSize], () => (page.value = 1));
const filtered = computed(() => {
  const q = search.value.toLowerCase();
  return rows.value.filter((r) => {
    if (jenis.value === 'obe' && !r.isObe) return false;
    if (jenis.value === 'non' && r.isObe) return false;
    return !q || [r.kode, r.mataKuliah, r.prodi ?? '', ...r.kelas.map((k) => k.kelas)].some((v) => v.toLowerCase().includes(q));
  });
});
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const meta = computed(() => ({ total: filtered.value.length, page: page.value, limit: pageSize.value, totalPages: totalPages.value }));
const pageItems = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));

const JENIS_MK: Record<string, string> = { TEORI: 'Kuliah', PRAKTIK: 'Praktikum', TEORI_PRAKTIK: 'Kuliah + Praktikum' };
const KOLOM_ISI = [
  { key: 'rps', label: 'RPS' },
  { key: 'cpl', label: 'CPL' },
  { key: 'cpmk', label: 'CPMK' },
] as const;
const th = 'px-3 py-2.5 border border-on-primary/25 font-semibold';
const td = 'px-3 py-2.5 border border-outline-variant';
</script>

<template>
  <div>
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <!-- Bar atas: filter jenis kurikulum + cari -->
      <div class="p-3 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-outline-variant">
        <select
          v-model="jenis"
          class="w-full sm:w-44 px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm"
          title="Jenis kurikulum"
        >
          <option value="">-- Semua --</option>
          <option value="obe">OBE</option>
          <option value="non">Non OBE</option>
        </select>
        <div class="flex items-stretch gap-2 w-full sm:w-[26rem]">
          <input
            v-model="cari"
            type="text"
            placeholder="Cari Mata Kuliah"
            class="flex-1 min-w-0 px-3 py-2 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm"
            @keyup.enter="terapkanCari"
          />
          <button type="button" class="px-3 rounded-md bg-[#2e7d5b] text-white hover:opacity-90" title="Cari" @click="terapkanCari">
            <span class="material-symbols-outlined" style="font-size: 18px">search</span>
          </button>
          <button type="button" class="px-3 rounded-md bg-[#2563eb] text-white hover:opacity-90" title="Muat ulang" :disabled="loading" @click="muatUlang">
            <span class="material-symbols-outlined" style="font-size: 18px">refresh</span>
          </button>
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-body-sm">
          <thead class="bg-primary text-on-primary">
            <tr>
              <th rowspan="2" :class="th" class="text-left">Kurikulum</th>
              <th rowspan="2" :class="th" class="text-left">Kode MK</th>
              <th rowspan="2" :class="th" class="text-left min-w-[14rem]">Nama Mata Kuliah</th>
              <th rowspan="2" :class="th" class="text-center">SKS</th>
              <th rowspan="2" :class="th" class="text-left">Jenis MK</th>
              <th rowspan="2" :class="th" class="text-left">Prodi Pengampu</th>
              <th rowspan="2" :class="th" class="text-center">Jenis Kurikulum</th>
              <th colspan="3" :class="th" class="text-center">Status Pengisian</th>
              <th rowspan="2" :class="th" class="text-center">Aksi</th>
            </tr>
            <tr>
              <th v-for="k in KOLOM_ISI" :key="k.key" :class="th" class="text-center">{{ k.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="11" :class="td" class="p-8 text-center text-on-surface-variant">Memuat data...</td>
            </tr>
            <tr v-else-if="!pageItems.length">
              <td colspan="11" :class="td" class="p-8 text-center text-on-surface-variant">
                {{ rows.length ? 'Tidak ada mata kuliah yang cocok' : 'Anda belum mengajar mata kuliah pada tahun akademik ini' }}
              </td>
            </tr>
            <tr v-for="item in pageItems" v-else :key="item.id" class="hover:bg-surface-container transition-colors align-top">
              <td :class="td">{{ item.tahunKurikulum ?? '-' }}</td>
              <td :class="td" class="whitespace-nowrap">{{ item.kode }}</td>
              <td :class="td">
                {{ item.mataKuliah }}
                <div class="mt-1 flex flex-wrap gap-1">
                  <span
                    class="inline-flex px-1.5 py-0.5 rounded text-label-sm"
                    :class="item.aktif ? 'bg-[#059669]/15 text-[#05603a]' : 'bg-surface-container text-on-surface-variant'"
                    :title="item.aktif ? `Aktif di semester ${item.aktifSemesters.join(', ')}` : 'Belum diaktifkan di Kurikulum → Matakuliah Aktif'"
                  >
                    {{ item.aktif ? 'Aktif' : 'Tidak Aktif' }}
                  </span>
                  <button
                    v-for="k in item.kelas"
                    :key="k.id"
                    type="button"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-label-sm border border-primary/40 bg-primary-container/40 text-on-primary-container hover:bg-primary-container"
                    :title="`Input nilai kelas ${k.kelas}${item.isObe ? ' (OBE)' : ''}`"
                    @click="emit('pilih', k.id)"
                  >
                    <span class="material-symbols-outlined" style="font-size: 14px">edit_note</span>
                    {{ k.kelas }} · {{ k.peran }}
                  </button>
                </div>
              </td>
              <td :class="td" class="text-center tabular-nums">{{ item.sksTotal }}</td>
              <td :class="td">{{ item.jenisMataKuliah ? JENIS_MK[item.jenisMataKuliah] : '-' }}</td>
              <td :class="td">{{ item.prodi ?? '-' }}</td>
              <td :class="td" class="text-center">
                <span
                  class="inline-flex px-3 py-0.5 rounded border text-label-sm font-medium"
                  :class="item.isObe ? 'border-[#2563eb]/40 bg-[#2563eb]/10 text-[#1e40af]' : 'border-outline-variant bg-surface-container text-on-surface-variant'"
                >
                  {{ item.isObe ? 'OBE' : 'Non OBE' }}
                </span>
              </td>
              <td v-for="k in KOLOM_ISI" :key="k.key" :class="td" class="text-center">
                <span
                  class="inline-flex px-2 py-0.5 rounded border text-label-sm whitespace-nowrap"
                  :class="item.pengisian[k.key] ? 'border-[#059669]/40 bg-[#059669]/10 text-[#05603a]' : 'border-error/40 bg-error-container/40 text-error'"
                >
                  {{ item.pengisian[k.key] ? 'Sudah Terisi' : 'Belum Terisi' }}
                </span>
              </td>
              <td :class="td" class="text-center whitespace-nowrap">
                <div class="inline-flex items-center gap-1.5">
                  <HoverTip
                    v-if="item.kelas.length"
                    :text="`Input Nilai${item.kelas.length > 1 ? ` — Kelas ${item.kelas[0].kelas}` : ''}`"
                    :sub="item.isObe ? 'Komposisi Nilai Kelas (OBE): nilai diinput per CPMK tiap metode evaluasi.' : 'Komposisi nilai: Bobot OBE kelas (Partisipasi, Tugas, Quiz, Proyek, UTS, UAS).'"
                  >
                    <button
                      type="button"
                      class="inline-flex items-center justify-center w-8 h-7 rounded bg-[#2e7d5b] text-white hover:opacity-90"
                      :aria-label="`Input nilai kelas ${item.kelas[0].kelas}`"
                      @click="emit('pilih', item.kelas[0].id)"
                    >
                      <span class="material-symbols-outlined" style="font-size: 18px">edit_note</span>
                    </button>
                  </HoverTip>
                  <HoverTip :text="item.bisaUbahRps ? 'Detail & Ubah RPS' : 'Detail RPS (lihat saja)'" :sub="item.bisaUbahRps ? undefined : (item.alasan ?? undefined)">
                    <RouterLink
                      :to="{ name: 'dosen-mata-kuliah-rps', params: { id: item.id }, query: { periode: tahunAjaran?.id } }"
                      class="inline-flex items-center justify-center w-8 h-7 rounded bg-[#0ea5e9] text-white hover:opacity-90"
                      aria-label="Detail RPS"
                    >
                      <span class="material-symbols-outlined" style="font-size: 18px">visibility</span>
                    </RouterLink>
                  </HoverTip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Kaki tabel: info halaman, jumlah baris, paginasi -->
      <div class="p-3 flex flex-col md:flex-row md:items-center gap-3 border-t border-outline-variant">
        <span class="px-3 py-1.5 rounded bg-primary-container/40 text-label-md text-on-surface-variant">
          Hal {{ page }}/{{ totalPages }} ({{ filtered.length }} data)
        </span>
        <select v-model.number="pageSize" class="w-full md:w-44 md:ml-6 px-3 py-1.5 border border-outline-variant rounded-md bg-surface-container-lowest text-body-sm">
          <option v-for="n in [10, 25, 50, 100]" :key="n" :value="n">{{ n }} baris</option>
        </select>
        <div class="md:ml-auto">
          <Pagination v-if="filtered.length > pageSize" v-model="page" :meta="meta" />
        </div>
      </div>
    </section>
  </div>
</template>

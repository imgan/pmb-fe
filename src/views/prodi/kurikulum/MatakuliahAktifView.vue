<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import Pagination from '@/components/ui/Pagination.vue';
import PageSizeSelect from '@/components/ui/PageSizeSelect.vue';
import SearchInput from '@/components/ui/SearchInput.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { kurikulumApi, matakuliahAktifApi, type MatakuliahAktifResult, type MatakuliahAktifRow } from '@/api/kurikulum';
import { jurusanApi } from '@/api/jurusan';
import { tahunAjaranApi } from '@/api/tahunAjaran';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { useProdiContext } from '@/composables/useProdiContext';
import { MENU } from '@/constants/menuCodes';
import { confirmAction, toastError, toastSuccess } from '@/utils/swal';
import type { TahunAjaran } from '@/types/entities';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';

// Tujuan menu: memilih mata kuliah kurikulum yang dibuka pada tahun akademik + semester tertentu.
// Hanya mata kuliah aktif yang muncul di pilihan mata kuliah saat BAAK menambah jadwal kuliah.
// Mata kuliah dari beberapa tahun kurikulum (mis. 2020, 2022, 2023) bisa aktif bersamaan dalam
// satu semester — tinggal pilih Tahun Kurikulum lain lalu aktifkan mata kuliahnya.
const { canUpdate } = usePermission(MENU.PRODI_MATAKULIAH_AKTIF_MANAGEMENT);
const { prodiLocked, prodiPlaceholder, tahunAjaranId: sessionTahunAjaranId } = useProdiContext();

const SEMESTER_OPTIONS: SelectOption[] = Array.from({ length: 14 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

const tahunAjaranList = ref<TahunAjaran[]>([]);
const jurusanOptions = ref<SelectOption[]>([]);
const tahunKurikulumOptions = ref<SelectOption[]>([]);

// Filter kurikulum
const jurusanId = ref<number | ''>('');
const tahunKurikulum = ref<number | ''>('');
const semesterKurikulum = ref<number | ''>('');
// Target aktivasi
const tahunAjaranId = ref<number | ''>('');
const aktifSemester = ref<number | ''>('');

const search = ref('');
const result = ref<MatakuliahAktifResult>({ rows: [], ringkasan: [] });
const applied = ref<{ tahunAjaranId: number; aktifSemester: number } | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const selected = ref<Set<number>>(new Set());
const page = ref(1);
const pageSize = ref(10);

const tahunAjaranOptions = computed<SelectOption[]>(() =>
  tahunAjaranList.value.map((t) => ({ value: t.id, label: `${formatTahunAjaran(t)}` }))
);
const selectedTahunAjaran = computed(() => tahunAjaranList.value.find((t) => t.id === tahunAjaranId.value) ?? null);
// Tahun akademik ganjil hanya membuka semester ganjil (1, 3, 5, ...), genap sebaliknya.
const aktifSemesterOptions = computed(() => {
  const jenis = selectedTahunAjaran.value?.jenisSemester;
  if (!jenis) return SEMESTER_OPTIONS;
  return SEMESTER_OPTIONS.filter((o) => (Number(o.value) % 2 === 1) === (jenis === 'GANJIL'));
});
watch(aktifSemesterOptions, (options) => {
  if (aktifSemester.value && !options.some((o) => o.value === aktifSemester.value)) aktifSemester.value = '';
});
// Default Aktif Semester mengikuti Semester Kurikulum yang dipilih (kalau sesuai ganjil/genap).
watch(semesterKurikulum, (smt) => {
  if (smt && aktifSemesterOptions.value.some((o) => o.value === smt)) aktifSemester.value = smt;
});

const appliedLabel = computed(() => {
  if (!applied.value) return '';
  const ta = tahunAjaranList.value.find((t) => t.id === applied.value?.tahunAjaranId);
  return `${ta ? `${formatTahunAjaran(ta)}` : '-'} · Semester ${applied.value.aktifSemester}`;
});

const handlePeriksa = async () => {
  if (!tahunAjaranId.value || !aktifSemester.value) {
    toastError('Pilih Aktif Tahun Akademik dan Aktif Semester terlebih dahulu');
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    result.value = await matakuliahAktifApi.list({
      tahunAjaranId: Number(tahunAjaranId.value),
      aktifSemester: Number(aktifSemester.value),
      jurusanId: jurusanId.value || undefined,
      tahunKurikulum: tahunKurikulum.value || undefined,
      semester: semesterKurikulum.value || undefined,
    });
    applied.value = { tahunAjaranId: Number(tahunAjaranId.value), aktifSemester: Number(aktifSemester.value) };
    selected.value = new Set();
    page.value = 1;
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data matakuliah aktif');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const [tahunAjaranResult, jurusanResult, years] = await Promise.all([
      tahunAjaranApi.list({ limit: 100 }),
      jurusanApi.listProdi({ limit: 200 }),
      kurikulumApi.tahunOptions(),
    ]);
    tahunAjaranList.value = tahunAjaranResult.data;
    jurusanOptions.value = jurusanResult.data.map((j) => ({
      value: j.id,
      label: j.kodeProdi ? `${j.kodeProdi} - ${j.namaJurusan}` : j.namaJurusan,
    }));
    tahunKurikulumOptions.value = years.map((y) => ({ value: y, label: String(y) }));
    tahunAjaranId.value =
      tahunAjaranResult.data.find((t) => t.id === sessionTahunAjaranId)?.id ??
      tahunAjaranResult.data.find((t) => t.isActive)?.id ??
      tahunAjaranResult.data[0]?.id ??
      '';
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat pilihan filter');
  }
});

watch([search, pageSize], () => (page.value = 1));

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return result.value.rows;
  return result.value.rows.filter((r) => [r.kode, r.mataKuliah].some((v) => v.toLowerCase().includes(q)));
});
const meta = computed(() => ({
  total: filtered.value.length,
  page: page.value,
  limit: pageSize.value,
  totalPages: Math.max(1, Math.ceil(filtered.value.length / pageSize.value)),
}));
const pageItems = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const rowNo = (index: number) => (page.value - 1) * pageSize.value + index + 1;

const allPageSelected = computed(() => pageItems.value.length > 0 && pageItems.value.every((r) => selected.value.has(r.id)));
const togglePage = () => {
  const next = new Set(selected.value);
  if (allPageSelected.value) pageItems.value.forEach((r) => next.delete(r.id));
  else pageItems.value.forEach((r) => next.add(r.id));
  selected.value = next;
};
const toggleRow = (id: number) => {
  const next = new Set(selected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selected.value = next;
};
const selectedRows = computed(() => result.value.rows.filter((r) => selected.value.has(r.id)));
const selectedBelumAktif = computed(() => selectedRows.value.filter((r) => !r.aktif));
const selectedAktif = computed(() => selectedRows.value.filter((r) => r.aktif));

const applyAktif = async (items: MatakuliahAktifRow[], aktif: boolean) => {
  if (!items.length || !applied.value) return;
  if (!aktif) {
    const ok = await confirmAction({
      title: 'Nonaktifkan mata kuliah?',
      text: `${items.length} mata kuliah tidak bisa dipilih lagi untuk jadwal ${appliedLabel.value}.`,
      confirmLabel: 'Ya, nonaktifkan',
    });
    if (!ok) return;
  }
  saving.value = true;
  try {
    const { changed } = await matakuliahAktifApi.set({
      tahunAjaranId: applied.value.tahunAjaranId,
      semester: applied.value.aktifSemester,
      mataKuliahIds: items.map((r) => r.id),
      aktif,
    });
    toastSuccess(`${changed} mata kuliah ${aktif ? 'diaktifkan' : 'dinonaktifkan'}`);
    await handlePeriksa();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan matakuliah aktif'));
  } finally {
    saving.value = false;
  }
};

const otherSemesters = (item: MatakuliahAktifRow) =>
  item.aktifSemesters.filter((s) => s !== applied.value?.aktifSemester);
</script>

<template>
  <div>
    <PageHeader
      title="Master Matakuliah Aktif"
      subtitle="Mata kuliah yang diaktifkan di sini menjadi pilihan mata kuliah saat BAAK menambah jadwal kuliah."
    />

    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="p-4 border-b border-outline-variant bg-surface-bright space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectInput
            v-model="jurusanId"
            label="Prodi"
            :options="jurusanOptions"
            :placeholder="prodiPlaceholder('-- Semua Prodi --')"
            :disabled="prodiLocked"
          />
          <SelectInput v-model="tahunKurikulum" label="Tahun Kurikulum" :options="tahunKurikulumOptions" placeholder="-- Semua Tahun --" />
          <SelectInput v-model="semesterKurikulum" label="Semester Kurikulum" :options="SEMESTER_OPTIONS" placeholder="-- Semua Semester --" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:items-end">
          <SelectInput v-model="tahunAjaranId" label="Aktif Tahun Akademik" required :options="tahunAjaranOptions" placeholder="-- Pilih Tahun Akademik --" />
          <SelectInput v-model="aktifSemester" label="Aktif Semester" required :options="aktifSemesterOptions" placeholder="-- Pilih Semester --" />
          <div>
            <AppButton icon="search" :disabled="loading" @click="handlePeriksa">Periksa</AppButton>
          </div>
        </div>
      </div>

      <div class="px-4 py-3 bg-primary text-on-primary text-label-md font-medium">
        Semua Data Master Matakuliah Aktif{{ applied ? ` — ${appliedLabel}` : '' }}
      </div>

      <div v-if="applied" class="px-4 py-3 border-b border-outline-variant">
        <p class="text-label-md text-on-surface-variant mb-2">Tahun kurikulum yang berjalan di tahun akademik ini</p>
        <div v-if="result.ringkasan.length" class="flex flex-wrap gap-2">
          <span
            v-for="r in result.ringkasan"
            :key="r.tahunKurikulum ?? 'none'"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-container text-on-primary-container text-label-md"
          >
            {{ r.tahunKurikulum ? `Kurikulum ${r.tahunKurikulum}` : 'Tanpa tahun kurikulum' }}
            <span class="font-semibold tabular-nums">{{ r.jumlah }} MK</span>
            <span class="text-label-sm opacity-80">smt {{ r.semesters.join(', ') }}</span>
          </span>
        </div>
        <p v-else class="text-body-sm text-on-surface-variant">Belum ada mata kuliah yang diaktifkan.</p>
      </div>

      <div class="p-4 border-b border-outline-variant flex flex-col lg:flex-row lg:items-center gap-3">
        <PageSizeSelect v-model="pageSize" />
        <div v-if="canUpdate && applied" class="flex flex-wrap items-center gap-2 lg:ml-4">
          <span class="text-body-sm text-on-surface-variant">{{ selected.size }} dipilih</span>
          <AppButton icon="check_circle" :disabled="saving || !selectedBelumAktif.length" @click="applyAktif(selectedBelumAktif, true)">
            Aktifkan ({{ selectedBelumAktif.length }})
          </AppButton>
          <AppButton variant="secondary" icon="block" :disabled="saving || !selectedAktif.length" @click="applyAktif(selectedAktif, false)">
            Nonaktifkan ({{ selectedAktif.length }})
          </AppButton>
        </div>
        <div class="lg:ml-auto">
          <SearchInput v-model="search" placeholder="Search..." />
        </div>
      </div>

      <div v-if="error" class="p-4 text-body-sm text-error bg-error-container">{{ error }}</div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-body-sm">
          <thead class="bg-[#F1F5F9] border-b border-outline-variant text-label-md text-primary font-semibold">
            <tr>
              <th v-if="canUpdate" class="p-4 w-10">
                <input type="checkbox" class="accent-primary w-4 h-4" :checked="allPageSelected" :disabled="!pageItems.length" @change="togglePage" />
              </th>
              <th class="p-4 text-center">No</th>
              <th class="p-4">Kode Matakuliah</th>
              <th class="p-4">Nama Matakuliah</th>
              <th class="p-4 text-center">SKS Teori</th>
              <th class="p-4 text-center">SKS Praktek</th>
              <th class="p-4 text-center">SKS Lab</th>
              <th class="p-4 text-center">SKS Total</th>
              <th class="p-4 text-center">Semester</th>
              <th class="p-4 text-center">Kurikulum</th>
              <th class="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant text-on-surface">
            <tr v-if="loading">
              <td colspan="11" class="p-8 text-center text-on-surface-variant">Memuat data...</td>
            </tr>
            <tr v-else-if="!applied">
              <td colspan="11" class="p-8 text-center text-on-surface-variant">
                Pilih filter, Aktif Tahun Akademik & Aktif Semester, lalu klik Periksa
              </td>
            </tr>
            <tr v-else-if="!pageItems.length">
              <td colspan="11" class="p-8 text-center text-on-surface-variant">Tidak ada mata kuliah kurikulum yang sesuai filter</td>
            </tr>
            <tr v-for="(item, index) in pageItems" v-else :key="item.id" class="hover:bg-surface-container transition-colors">
              <td v-if="canUpdate" class="p-4">
                <input type="checkbox" class="accent-primary w-4 h-4" :checked="selected.has(item.id)" @change="toggleRow(item.id)" />
              </td>
              <td class="p-4 text-center tabular-nums">{{ rowNo(index) }}</td>
              <td class="p-4 whitespace-nowrap">{{ item.kode }}</td>
              <td class="p-4">
                {{ item.mataKuliah }}
                <span v-if="otherSemesters(item).length" class="block text-label-sm text-on-surface-variant">
                  Juga aktif di semester {{ otherSemesters(item).join(', ') }}
                </span>
              </td>
              <td class="p-4 text-center tabular-nums">{{ item.sksTeori }}</td>
              <td class="p-4 text-center tabular-nums">{{ item.sksPraktek }}</td>
              <td class="p-4 text-center tabular-nums">{{ item.sksLab }}</td>
              <td class="p-4 text-center tabular-nums">{{ item.sksTotal }}</td>
              <td class="p-4 text-center tabular-nums">{{ item.semester ?? '-' }}</td>
              <td class="p-4 text-center tabular-nums">{{ item.tahunKurikulum ?? '-' }}</td>
              <td class="p-4 text-center">
                <template v-if="canUpdate">
                  <button
                    v-if="!item.aktif"
                    type="button"
                    class="px-4 py-1.5 rounded-md bg-[#059669] text-white text-label-md font-medium hover:opacity-90 disabled:opacity-50"
                    :disabled="saving"
                    title="Aktifkan untuk tahun akademik & semester ini"
                    @click="applyAktif([item], true)"
                  >
                    Aktifkan
                  </button>
                  <button
                    v-else
                    type="button"
                    class="px-3 py-1.5 rounded-md border border-error text-error text-label-md font-medium hover:bg-error-container disabled:opacity-50"
                    :disabled="saving || item.jumlahJadwal > 0"
                    :title="item.jumlahJadwal > 0 ? 'Sudah dijadwalkan, tidak bisa dinonaktifkan' : 'Nonaktifkan'"
                    @click="applyAktif([item], false)"
                  >
                    Nonaktifkan
                  </button>
                  <span v-if="item.aktif" class="block mt-1 text-label-sm text-[#059669]">
                    Status: Aktif{{ item.jumlahJadwal ? ` · ${item.jumlahJadwal} jadwal` : '' }}
                  </span>
                  <span v-else class="block mt-1 text-label-sm text-on-surface-variant">
                    Status: Belum aktif{{ item.jumlahJadwal ? ` · ${item.jumlahJadwal} jadwal` : '' }}
                  </span>
                </template>
                <span v-else class="text-label-md" :class="item.aktif ? 'text-[#059669]' : 'text-on-surface-variant'">
                  {{ item.aktif ? 'Aktif' : 'Belum aktif' }}
                </span>
                <RouterLink
                  :to="{ name: 'prodi-matakuliah-aktif-rps', params: { id: item.id }, query: { periode: applied?.tahunAjaranId } }"
                  class="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-primary text-primary text-label-md font-medium hover:bg-primary-container"
                  title="Pemetaan CPL & CPMK, Detail RPS, Rencana Pembelajaran & Evaluasi"
                >
                  <span class="material-symbols-outlined" style="font-size: 16px">menu_book</span>
                  RPS
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination v-if="applied && !loading && filtered.length" v-model="page" :meta="meta" />
    </section>
  </div>
</template>

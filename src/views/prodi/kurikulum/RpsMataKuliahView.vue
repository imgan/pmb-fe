<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppButton from '@/components/ui/AppButton.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import RpsDataMataKuliah from '@/components/rps/RpsDataMataKuliah.vue';
import RpsPemetaanCpl from '@/components/rps/RpsPemetaanCpl.vue';
import RpsPemetaanCpmk from '@/components/rps/RpsPemetaanCpmk.vue';
import RpsDetailForm from '@/components/rps/RpsDetailForm.vue';
import RpsRencanaPembelajaran from '@/components/rps/RpsRencanaPembelajaran.vue';
import RpsRencanaEvaluasi from '@/components/rps/RpsRencanaEvaluasi.vue';
import { dosenRpsApi, rpsApi as prodiRpsApi, RPS_API, type RpsDetail, type RpsMkOption, type RpsPeriode } from '@/api/rps';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import type { TahunAjaran } from '@/types/entities';
import { formatTahunAjaran } from '@/utils/tahunAjaranOptions';

/**
 * RPS satu mata kuliah (dibuka dari Matakuliah Aktif): menu samping Data Mata Kuliah / Pemetaan CPL /
 * Pemetaan CPMK / Detail RPS / Rencana Pembelajaran / Rencana Evaluasi, bar atas (cari mata kuliah,
 * Kembali ke Daftar + tombol aksi menu aktif yang di-teleport ke #rps-aksi) dan kotak info mata kuliah.
 * Detail RPS, rencana pembelajaran & evaluasi disimpan per periode ("Berlaku Sejak Periode").
 */
const props = defineProps<{ id: string }>();
const route = useRoute();
const router = useRouter();
// Halaman ini dibuka dari Matakuliah Aktif maupun Perkuliahan → Mata Kuliah: hak akses, nama route & tujuan
// "Kembali ke Daftar" mengikuti route asalnya (meta.menuCode / meta.backRoute).
const izinProdi = usePermission((route.meta.menuCode as string | undefined) ?? MENU.PRODI_MATAKULIAH_AKTIF_MANAGEMENT);
// Portal Dosen (meta.portal = 'dosen'): klien API dosen & hak ubah dari backend (koordinator + Setting Prodi).
const portalDosen = route.meta.portal === 'dosen';
const rpsApi = portalDosen ? dosenRpsApi : prodiRpsApi;
provide(RPS_API, rpsApi);
const bisaUbahDosen = computed(() => !!detail.value?.aksesDosen?.bisaUbah);
const canCreate = computed(() => (portalDosen ? bisaUbahDosen.value : izinProdi.canCreate.value));
const canUpdate = computed(() => (portalDosen ? bisaUbahDosen.value : izinProdi.canUpdate.value));
const canDelete = computed(() => (portalDosen ? bisaUbahDosen.value : izinProdi.canDelete.value));
const namaRoute = (route.name as string | undefined) ?? 'prodi-matakuliah-aktif-rps';
const ruteDaftar = (route.meta.backRoute as string | undefined) ?? 'prodi-matakuliah-aktif';

const MENU_SAMPING = [
  { key: 'data', label: 'Data Mata Kuliah' },
  { key: 'cpl', label: 'Pemetaan CPL' },
  { key: 'cpmk', label: 'Pemetaan CPMK' },
  { key: 'rps', label: 'Detail RPS' },
  { key: 'pembelajaran', label: 'Rencana Pembelajaran' },
  { key: 'evaluasi', label: 'Rencana Evaluasi' },
] as const;
type MenuKey = (typeof MENU_SAMPING)[number]['key'];
const menuAwal = MENU_SAMPING.find((m) => m.key === route.query.menu)?.key ?? 'data';
const menu = ref<MenuKey>(menuAwal);
const judulMenu = computed(() => MENU_SAMPING.find((m) => m.key === menu.value)?.label ?? '');
/** Menu yang datanya per periode. */
const menuPeriode = computed(() => menu.value === 'rps' || menu.value === 'pembelajaran' || menu.value === 'evaluasi');
watch(menu, (m) => router.replace({ query: { ...route.query, menu: m } }));

const mkId = computed(() => Number(props.id));
const detail = ref<RpsDetail | null>(null);
const error = ref<string | null>(null);

// ---- Periode ("Berlaku Sejak Periode") ----
const tahunAjaranList = ref<TahunAjaran[]>([]);
const periodeId = ref<number | ''>('');
const periode = ref<RpsPeriode | null>(null);
const periodeLoading = ref(false);
const urutTa = (t: TahunAjaran) => t.tahunMulai * 10 + (t.jenisSemester === 'GENAP' ? 2 : 1);
const tahunAjaranOptions = computed<SelectOption[]>(() =>
  [...tahunAjaranList.value]
    .sort((a, b) => urutTa(b) - urutTa(a))
    .map((t) => ({ value: t.id, label: `${formatTahunAjaran(t)}${detail.value?.periodeIds.includes(t.id) ? ' • ada data' : ''}` })),
);
/** Periode awal: dari query (?periode=), periode terbaru yang sudah berisi data, lalu tahun ajaran aktif. */
const pilihPeriodeAwal = () => {
  const dariQuery = Number(route.query.periode);
  if (dariQuery && tahunAjaranList.value.some((t) => t.id === dariQuery)) return dariQuery;
  const berisi = tahunAjaranList.value.filter((t) => detail.value?.periodeIds.includes(t.id)).sort((a, b) => urutTa(b) - urutTa(a));
  return berisi[0]?.id ?? tahunAjaranList.value.find((t) => t.isActive)?.id ?? tahunAjaranList.value[0]?.id ?? '';
};
const loadPeriode = async () => {
  if (!periodeId.value) return (periode.value = null);
  periodeLoading.value = true;
  try {
    periode.value = await rpsApi.periode(mkId.value, Number(periodeId.value));
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data periode');
  } finally {
    periodeLoading.value = false;
  }
};
watch(periodeId, (v) => {
  router.replace({ query: { ...route.query, periode: v || undefined } });
  loadPeriode();
});

const loadDetail = async () => {
  error.value = null;
  try {
    detail.value = await rpsApi.detail(mkId.value);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat data mata kuliah');
  }
};
/** Muat ulang setelah data periode berubah (periode baru bisa jadi "ada data"). */
const reloadPeriode = async () => {
  await Promise.all([loadPeriode(), loadDetail()]);
};

// ---- Cari mata kuliah lain (pindah halaman) ----
const mkList = ref<RpsMkOption[]>([]);
const mkOptions = computed<SelectOption[]>(() =>
  mkList.value.map((m) => ({ value: m.id, label: `${m.kode} — ${m.mataKuliah}${m.tahunKurikulum ? ` (Kur. ${m.tahunKurikulum})` : ''}` })),
);
const pindahKe = ref<string | number | null>(Number(props.id));
watch(pindahKe, (v) => {
  if (v && Number(v) !== mkId.value) router.push({ name: namaRoute, params: { id: Number(v) }, query: { menu: menu.value } });
});
const init = async () => {
  await loadDetail();
  const awal = pilihPeriodeAwal();
  if (awal === periodeId.value) await loadPeriode();
  else periodeId.value = awal;
};
watch(
  () => props.id,
  () => {
    pindahKe.value = Number(props.id);
    periode.value = null;
    init();
  },
);

onMounted(async () => {
  try {
    tahunAjaranList.value = await rpsApi.tahunAjaranList();
  } catch {
    tahunAjaranList.value = [];
  }
  init();
  try {
    mkList.value = await rpsApi.mataKuliahOptions();
  } catch {
    mkList.value = [];
  }
});

// Menu yang punya form sendiri (mis. Rencana Pembelajaran) menangani "Kembali ke Daftar" lebih dulu.
const menuRef = ref<{ kembali?: () => boolean } | null>(null);
const kembali = () => {
  if (menuRef.value?.kembali?.()) return;
  router.push({ name: ruteDaftar });
};

const JENIS_MK: Record<string, string> = { TEORI: 'Teori', PRAKTIK: 'Praktik', TEORI_PRAKTIK: 'Teori + Praktik' };
const namaPeriode = computed(() => {
  const ta = tahunAjaranList.value.find((t) => t.id === periodeId.value);
  return ta ? formatTahunAjaran(ta) : '-';
});
</script>

<template>
  <div>
    <header class="mb-4">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">{{ judulMenu }}</h1>
      <p class="text-body-sm text-on-surface-variant">{{ (route.meta.breadcrumb as string | undefined) ?? 'Prodi / Kurikulum / Matakuliah Aktif' }} / {{ judulMenu }}</p>
    </header>

    <!-- Bar atas: cari mata kuliah + aksi -->
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 mb-4 flex flex-col lg:flex-row lg:items-center gap-3">
      <div class="flex-1 min-w-0 lg:max-w-md">
        <SearchableSelect v-model="pindahKe" placeholder="Cari Mata Kuliah" search-placeholder="Ketik kode atau nama mata kuliah..." :options="mkOptions" />
      </div>
      <div class="flex flex-wrap gap-2 lg:ml-auto">
        <AppButton variant="secondary" icon="arrow_back" @click="kembali">Kembali ke Daftar</AppButton>
        <!-- Tombol aksi menu aktif (Tambah / Salin Data / Upload Excel / Simpan) -->
        <div id="rps-aksi" class="contents" />
      </div>
    </section>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div
      v-if="portalDosen && detail?.aksesDosen && !detail.aksesDosen.bisaUbah"
      class="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-md border border-outline-variant bg-surface-container text-body-sm"
    >
      <span class="material-symbols-outlined text-on-surface-variant" style="font-size: 20px">lock</span>
      Mode lihat saja — {{ detail.aksesDosen.alasan }}.
    </div>

    <div class="flex flex-col md:flex-row gap-4 items-start">
      <!-- Menu samping -->
      <nav class="w-full md:w-52 shrink-0 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <button
          v-for="m in MENU_SAMPING"
          :key="m.key"
          type="button"
          class="w-full text-left px-4 py-3 text-body-sm border-b border-outline-variant last:border-b-0 transition-colors"
          :class="
            menu === m.key
              ? 'bg-primary-container text-on-primary-container font-semibold border-l-4 border-l-primary'
              : 'text-on-surface hover:bg-surface-container'
          "
          @click="menu = m.key"
        >
          {{ m.label }}
        </button>
      </nav>

      <div class="flex-1 min-w-0 w-full">
        <template v-if="detail">
          <!-- Kotak info mata kuliah -->
          <section
            class="bg-primary-container/40 border border-outline-variant rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-body-sm"
          >
            <dl class="grid grid-cols-[9rem_1fr] gap-y-1">
              <dt class="font-semibold text-primary">Kode Mata Kuliah</dt>
              <dd>{{ detail.mataKuliah.kode }}</dd>
              <dt class="font-semibold text-primary">Mata Kuliah</dt>
              <dd>{{ detail.mataKuliah.mataKuliah }}</dd>
              <dt class="font-semibold text-primary">Tahun Kurikulum</dt>
              <dd>{{ detail.mataKuliah.tahunKurikulum ?? '-' }}</dd>
              <dt class="font-semibold text-primary">Jenis Kurikulum</dt>
              <dd>
                <span
                  class="inline-flex px-2 py-0.5 rounded text-label-sm font-medium"
                  :class="detail.mataKuliah.isObe ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'"
                >
                  {{ detail.mataKuliah.isObe ? 'OBE' : 'Non OBE' }}
                </span>
              </dd>
            </dl>
            <dl class="grid grid-cols-[9rem_1fr] gap-y-1">
              <dt class="font-semibold text-primary">SKS</dt>
              <dd>{{ detail.mataKuliah.sksTotal }}</dd>
              <dt class="font-semibold text-primary">Jenis Mata Kuliah</dt>
              <dd>{{ detail.mataKuliah.jenisMataKuliah ? JENIS_MK[detail.mataKuliah.jenisMataKuliah] : '-' }}</dd>
              <dt class="font-semibold text-primary">Unit Pengampu</dt>
              <dd>{{ [detail.mataKuliah.jenjang, detail.mataKuliah.prodi].filter(Boolean).join(' - ') || '-' }}</dd>
            </dl>
          </section>

          <!-- Berlaku Sejak Periode (Detail RPS, Rencana Pembelajaran & Evaluasi) -->
          <section v-if="menuPeriode" class="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span class="text-body-sm font-semibold text-primary">Berlaku Sejak Periode</span>
            <div class="w-full sm:w-64">
              <SelectInput v-model="periodeId" :options="tahunAjaranOptions" :clearable="false" placeholder="-- Pilih Periode --" />
            </div>
          </section>

          <RpsDataMataKuliah v-if="menu === 'data'" :detail="detail" />
          <RpsPemetaanCpl v-else-if="menu === 'cpl'" :mk-id="mkId" :detail="detail" :can-update="canUpdate" @reload="loadDetail" />
          <RpsPemetaanCpmk
            v-else-if="menu === 'cpmk'"
            :mk-id="mkId"
            :detail="detail"
            :mk-options="mkOptions"
            :can-create="canCreate"
            :can-update="canUpdate"
            :can-delete="canDelete"
            @reload="loadDetail"
          />
          <template v-else-if="!periodeId">
            <div class="p-8 text-center text-body-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-lg">
              Pilih periode terlebih dahulu.
            </div>
          </template>
          <div v-else-if="periodeLoading && !periode" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
          <template v-else-if="periode">
            <RpsDetailForm
              v-if="menu === 'rps'"
              :mk-id="mkId"
              :tahun-ajaran-id="Number(periodeId)"
              :periode="periode"
              :can-update="canUpdate"
              @reload="reloadPeriode"
            />
            <RpsRencanaPembelajaran
              v-else-if="menu === 'pembelajaran'"
              ref="menuRef"
              :mk-id="mkId"
              :detail="detail"
              :tahun-ajaran-id="Number(periodeId)"
              :nama-periode="namaPeriode"
              :periode="periode"
              :mk-options="mkOptions"
              :tahun-ajaran-options="tahunAjaranOptions"
              :can-create="canCreate"
              :can-update="canUpdate"
              :can-delete="canDelete"
              @reload="reloadPeriode"
            />
            <RpsRencanaEvaluasi
              v-else
              :mk-id="mkId"
              :detail="detail"
              :tahun-ajaran-id="Number(periodeId)"
              :periode="periode"
              :mk-options="mkOptions"
              :tahun-ajaran-options="tahunAjaranOptions"
              :can-create="canCreate"
              :can-update="canUpdate"
              :can-delete="canDelete"
              @reload="reloadPeriode"
            />
          </template>
        </template>
        <div v-else-if="!error" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      </div>
    </div>
  </div>
</template>

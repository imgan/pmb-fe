<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { pesertaApi, type DashboardJumlah, type DashboardPmb, type DashboardPencapaian } from '@/api/peserta';
import { extractErrorMessage } from '@/api/http';
import SelectInput from '@/components/ui/SelectInput.vue';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import LineChart from '@/components/charts/LineChart.vue';
import HorizontalBarChart from '@/components/charts/HorizontalBarChart.vue';
import DonutChart, { type DonutDatum } from '@/components/charts/DonutChart.vue';
import { toastError, toastSuccess } from '@/utils/swal';

const loading = ref(true);
const error = ref<string | null>(null);
const data = ref<DashboardPmb | null>(null);
/** '' = tahun PMB aktif. */
const tahunPilihan = ref<number | 'semua' | ''>('');

const tahunOptions = computed(() => [
  ...(data.value?.tahunList ?? []).map((t) => ({ value: t.id, label: t.isActive ? `${t.label} (aktif)` : t.label })),
  { value: 'semua', label: 'Semua Tahun' },
]);

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    data.value = await pesertaApi.dashboard(tahunPilihan.value || undefined);
    if (!tahunPilihan.value) tahunPilihan.value = data.value.tahunPmb?.id ?? 'semua';
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat dashboard PMB');
  } finally {
    loading.value = false;
  }
};

const tiles = computed(() => {
  const r = data.value?.ringkasan;
  return [
    { label: 'Pendaftar', value: r?.pendaftar ?? 0, icon: 'description', bg: 'bg-[#fde4e7]', dot: 'bg-[#e5484d]' },
    { label: 'Siap Tes Seleksi', value: r?.siapTes ?? 0, icon: 'edit_document', bg: 'bg-[#fdeedd]', dot: 'bg-[#f5b324]' },
    { label: 'Lulus Seleksi', value: r?.lulusSeleksi ?? 0, icon: 'task', bg: 'bg-[#dcf8e6]', dot: 'bg-[#1baf7a]' },
    { label: 'Diterima', value: r?.diterima ?? 0, icon: 'school', bg: 'bg-[#e1ecfb]', dot: 'bg-[#2a78d6]' },
  ];
});

const trend = computed(() => (data.value?.trend ?? []).map((t) => ({ label: t.label, value: t.jumlah })));
const keDonut = (rows: DashboardJumlah[]): DonutDatum[] => rows.map((r) => ({ label: r.label, value: r.jumlah }));
const kosong = (rows: DashboardJumlah[] = []) => rows.every((r) => r.jumlah === 0);
const wilayah = computed(() => (data.value?.wilayah ?? []).map((w) => ({ label: w.label, value: w.jumlah })));

// ---- Pencapaian vs target ----
const persen = (p: DashboardPencapaian) => (p.target ? Math.round((p.diterima / p.target) * 100) : null);
const warna = (pct: number | null) => {
  if (pct === null) return { bar: 'bg-[#b1913f]', badge: 'border-outline-variant text-on-surface-variant' };
  if (pct >= 75) return { bar: 'bg-[#1baf7a]', badge: 'border-[#1baf7a] text-[#0f7a54]' };
  if (pct >= 40) return { bar: 'bg-[#f5b324]', badge: 'border-[#f5b324] text-[#a87700]' };
  return { bar: 'bg-[#e5484d]', badge: 'border-[#e5484d] text-[#c62a2f]' };
};
/** Tanpa target: lebar bar relatif terhadap prodi dengan diterima terbanyak. */
const skalaTanpaTarget = computed(() => Math.max(1, ...(data.value?.pencapaian ?? []).map((p) => p.diterima)));
const lebarBar = (p: DashboardPencapaian) =>
  `${Math.min(100, p.target ? (p.diterima / p.target) * 100 : (p.diterima / skalaTanpaTarget.value) * 100)}%`;

const targetModal = ref(false);
const targetForm = reactive<Record<string, number | string | null>>({});
const targetSaving = ref(false);
const bukaTarget = () => {
  Object.keys(targetForm).forEach((k) => delete targetForm[k]);
  (data.value?.pencapaian ?? []).forEach((p) => (targetForm[p.kodeProdi] = p.target ?? ''));
  targetModal.value = true;
};
const simpanTarget = async () => {
  const tahun = data.value?.tahunPmb;
  if (!tahun) return;
  targetSaving.value = true;
  try {
    const items = Object.entries(targetForm).map(([kodeProdi, v]) => ({ kodeProdi, target: v === '' || v === null ? null : Number(v) }));
    await pesertaApi.saveTarget(tahun.id, items);
    toastSuccess('Target mahasiswa baru disimpan');
    targetModal.value = false;
    await load();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan target'));
  } finally {
    targetSaving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div>
    <header class="mb-6 flex flex-col md:flex-row md:items-end gap-4">
      <div class="md:mr-auto">
        <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">Dashboard PMB</h1>
        <p class="text-body-md text-on-surface-variant mt-1">Pendaftaran mahasiswa baru per tahun ajaran PMB.</p>
      </div>
      <div class="w-full md:w-64">
        <SelectInput v-model="tahunPilihan" label="Tahun Ajaran PMB" :options="tahunOptions" :clearable="false" @change="load" />
      </div>
    </header>

    <div v-if="error" class="mb-6 px-4 py-3 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <div v-if="loading && !data" class="p-12 text-center text-body-sm text-on-surface-variant">Memuat dashboard...</div>

    <div v-else-if="data" class="space-y-6" :class="loading ? 'opacity-60 pointer-events-none' : ''">
      <!-- Ringkasan + tren -->
      <section class="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div class="xl:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <h2 class="font-semibold text-body-lg text-on-surface">Pendaftaran Mahasiswa Baru</h2>
          <p class="text-body-sm text-on-surface-variant mb-4">Progress {{ data.tahunPmb?.label ?? 'semua tahun' }}</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="t in tiles" :key="t.label" class="rounded-lg p-4 min-h-[120px] flex flex-col" :class="t.bg">
              <span class="w-9 h-9 rounded-full flex items-center justify-center text-white mb-3" :class="t.dot">
                <span class="material-symbols-outlined filled" style="font-size: 18px">{{ t.icon }}</span>
              </span>
              <span class="font-bold text-headline-md text-[#1f2937] tabular-nums">{{ t.value }}</span>
              <span class="text-body-sm font-medium text-[#374151]">{{ t.label }}</span>
            </div>
          </div>
        </div>

        <div class="xl:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <h2 class="font-semibold text-body-lg text-on-surface mb-3">Trend Pendaftaran</h2>
          <div v-if="!trend.length" class="h-[200px] flex items-center justify-center text-body-sm text-on-surface-variant">
            Belum ada pendaftar
          </div>
          <LineChart v-else :data="trend" color="#2bb5b0" />
        </div>
      </section>

      <!-- Pencapaian per prodi -->
      <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <div class="p-5 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-outline-variant">
          <div class="sm:mr-auto">
            <h2 class="font-semibold text-body-lg text-on-surface">Pencapaian Mahasiswa Baru</h2>
            <p class="text-body-sm text-on-surface-variant">Progres = peserta berstatus <b>diterima</b> dibandingkan target prodi.</p>
          </div>
          <AppButton v-if="data.tahunPmb" variant="secondary" icon="flag" @click="bukaTarget">Atur Target</AppButton>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-body-sm min-w-[640px]">
            <thead class="text-label-md text-on-surface-variant">
              <tr class="border-b border-outline-variant">
                <th class="px-5 py-3 w-12">#</th>
                <th class="px-5 py-3">Program Studi</th>
                <th class="px-5 py-3 w-24 text-right">Pendaftar</th>
                <th class="px-5 py-3 w-[40%]">Progres</th>
                <th class="px-5 py-3 w-24 text-center">Target</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in data.pencapaian" :key="p.kodeProdi" class="border-b border-outline-variant last:border-0">
                <td class="px-5 py-3 text-on-surface-variant">{{ i + 1 }}</td>
                <td class="px-5 py-3 text-on-surface">{{ p.nama }}</td>
                <td class="px-5 py-3 text-right tabular-nums text-on-surface">{{ p.pendaftar }}</td>
                <td class="px-5 py-3">
                  <div class="flex justify-between text-label-sm text-on-surface-variant mb-1 tabular-nums">
                    <span class="font-semibold">{{ p.diterima }}</span>
                    <span>{{ p.target ?? '–' }}</span>
                  </div>
                  <div class="h-2.5 rounded-full bg-surface-container-high overflow-hidden">
                    <div class="h-full rounded-full transition-all" :class="warna(persen(p)).bar" :style="{ width: lebarBar(p) }" />
                  </div>
                </td>
                <td class="px-5 py-3 text-center">
                  <span class="inline-block min-w-[52px] px-2 py-1 rounded-md border text-label-md tabular-nums" :class="warna(persen(p)).badge">
                    {{ persen(p) === null ? '–' : `${persen(p)}%` }}
                  </span>
                </td>
              </tr>
              <tr v-if="!data.pencapaian.length">
                <td colspan="5" class="px-5 py-8 text-center text-on-surface-variant">Belum ada prodi berkode prodi.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="data.tahunPmb && data.pencapaian.every((p) => p.target === null)" class="px-5 py-3 text-label-sm text-on-surface-variant border-t border-outline-variant">
          Target belum diatur untuk {{ data.tahunPmb.label }} — klik <b>Atur Target</b>.
        </p>
      </section>

      <!-- Jalur & sumber informasi -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <h2 class="font-semibold text-body-lg text-on-surface mb-4">Minat Jalur Pendaftaran</h2>
          <div v-if="kosong(data.jalur)" class="h-[200px] flex items-center justify-center text-body-sm text-on-surface-variant">Belum ada data</div>
          <DonutChart v-else :data="keDonut(data.jalur)" />
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <h2 class="font-semibold text-body-lg text-on-surface mb-4">Sumber Informasi Pendaftar</h2>
          <div v-if="kosong(data.sumberInformasi)" class="h-[200px] flex items-center justify-center text-body-sm text-on-surface-variant">
            Belum ada pendaftar yang mengisi sumber informasi
          </div>
          <DonutChart v-else :data="keDonut(data.sumberInformasi.filter((s) => s.jumlah > 0))" />
          <p v-if="data.belumIsiSumber" class="mt-3 text-label-sm text-on-surface-variant">
            {{ data.belumIsiSumber }} pendaftar belum mengisi sumber informasi.
          </p>
        </div>
      </section>

      <!-- Sekolah, wilayah, gender -->
      <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
          <h2 class="font-semibold text-body-lg text-on-surface p-5 pb-3">Top 6 Sekolah Pendaftar Terbanyak</h2>
          <table class="w-full text-left text-body-sm">
            <thead class="text-label-md text-on-surface-variant">
              <tr class="border-y border-outline-variant">
                <th class="px-5 py-2.5 w-12">#</th>
                <th class="px-5 py-2.5">Asal Sekolah</th>
                <th class="px-5 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in data.topSekolah" :key="s.label" class="border-b border-outline-variant last:border-0">
                <td class="px-5 py-2.5 text-on-surface-variant">{{ i + 1 }}</td>
                <td class="px-5 py-2.5 text-on-surface">{{ s.label }}</td>
                <td class="px-5 py-2.5 text-right tabular-nums text-on-surface">{{ s.jumlah }}</td>
              </tr>
              <tr v-if="!data.topSekolah.length">
                <td colspan="3" class="px-5 py-8 text-center text-on-surface-variant">Belum ada data</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <h2 class="font-semibold text-body-lg text-on-surface mb-4">Pendaftaran Berdasarkan Wilayah</h2>
          <div v-if="!wilayah.length" class="h-[200px] flex items-center justify-center text-body-sm text-on-surface-variant">Belum ada data biodata</div>
          <HorizontalBarChart v-else :data="wilayah" color="#e5484d" />
        </div>

        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <h2 class="font-semibold text-body-lg text-on-surface mb-4">Pendaftaran Berdasarkan Gender</h2>
          <div v-if="kosong(data.gender)" class="h-[200px] flex items-center justify-center text-body-sm text-on-surface-variant">Belum ada data biodata</div>
          <DonutChart v-else :data="keDonut(data.gender).map((g, i) => ({ ...g, color: i === 0 ? '#2a78d6' : '#e87ba4' }))" />
        </div>
      </section>
      <p v-if="data.belumIsiBiodata" class="text-label-sm text-on-surface-variant">
        Wilayah & gender diambil dari biodata — {{ data.belumIsiBiodata }} dari {{ data.ringkasan.pendaftar }} pendaftar belum mengisi biodata.
      </p>
    </div>

    <Modal v-model="targetModal" title="Target Mahasiswa Baru" :subtitle="data?.tahunPmb?.label" size="lg">
      <p class="text-body-sm text-on-surface-variant mb-4">Kosongkan untuk menghapus target prodi.</p>
      <div class="space-y-3">
        <div v-for="p in data?.pencapaian ?? []" :key="p.kodeProdi" class="flex items-center gap-4">
          <span class="flex-1 text-body-sm text-on-surface">{{ p.nama }}</span>
          <input
            v-model="targetForm[p.kodeProdi]"
            type="number"
            min="0"
            class="w-28 px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-sm text-right tabular-nums focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="targetModal = false">Batal</AppButton>
        <AppButton :disabled="targetSaving" @click="simpanTarget">{{ targetSaving ? 'Menyimpan...' : 'Simpan' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>

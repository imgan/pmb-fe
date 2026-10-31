<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppButton from '@/components/ui/AppButton.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import type { SelectOption } from '@/components/ui/SelectInput.vue';
import ComingSoonPanel from '@/components/layout/ComingSoonPanel.vue';
import KomposisiNilaiKelas from '@/components/kelas/KomposisiNilaiKelas.vue';
import JadwalPerkuliahanKelas from '@/components/kelas/JadwalPerkuliahanKelas.vue';
import JadwalUjianKelas from '@/components/kelas/JadwalUjianKelas.vue';
import PresensiKelas from '@/components/kelas/PresensiKelas.vue';
import RekapKuesionerKelas from '@/components/kelas/RekapKuesionerKelas.vue';
import { KELAS_KULIAH_API, dosenKelasKuliahApi, kelasKuliahApi as prodiKelasKuliahApi, type KelasKuliahDetail, type KelasKuliahRow } from '@/api/kelasKuliah';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

/**
 * Detail kelas kuliah (Prodi → Perkuliahan → Kelas Kuliah): menu samping Detail Kelas, Dosen Pengajar,
 * Peserta Kelas, ..., Nilai Perkuliahan (Komposisi Nilai Kelas, berelasi ke CPMK/RPS), RPS; bar atas
 * (cari kelas pada periode yang sama, kembali, tombol aksi menu aktif di #kelas-aksi) & kotak info kelas.
 */
const props = defineProps<{ id: string }>();
const route = useRoute();
const router = useRouter();
// Dipakai juga portal Dosen (meta.portal = 'dosen'): klien API dosen, komposisi nilai lihat saja, RPS versi dosen.
const portalDosen = route.meta.portal === 'dosen';
const kelasKuliahApi = portalDosen ? dosenKelasKuliahApi : prodiKelasKuliahApi;
provide(KELAS_KULIAH_API, kelasKuliahApi);
const izinProdi = usePermission(MENU.PRODI_KELAS_KULIAH_MANAGEMENT);
const canUpdate = computed(() => !portalDosen && izinProdi.canUpdate.value);
const canDelete = computed(() => !portalDosen && izinProdi.canDelete.value);
const izinRps = usePermission(MENU.PRODI_PERKULIAHAN_MATA_KULIAH_MANAGEMENT);
const bisaRps = computed(() => portalDosen || izinRps.canRead.value);
// Jadwal Ujian: dosen pengampu boleh mengisi (sama dengan menu Jadwal Ujian dosen); prodi = hak ubah Kelas Kuliah / Jadwal Ujian.
const izinUjian = usePermission(MENU.PRODI_JADWAL_UJIAN_MANAGEMENT);
const bisaUbahUjian = computed(() => portalDosen || izinProdi.canUpdate.value || izinUjian.canUpdate.value);
const ruteDetail = portalDosen ? 'dosen-kelas-kuliah-detail' : 'prodi-kelas-kuliah-detail';
const ruteDaftar = (route.meta.backRoute as string | undefined) ?? 'prodi-kelas-kuliah';
const breadcrumb = portalDosen ? 'Dosen / Perkuliahan / Kelas Kuliah' : 'Perkuliahan / Kelas Kuliah';

const MENU_SAMPING = [
  { key: 'detail', label: 'Detail Kelas' },
  { key: 'dosen', label: 'Dosen Pengajar' },
  { key: 'peserta', label: 'Peserta Kelas' },
  { key: 'kontrak', label: 'Kontrak Kuliah' },
  { key: 'jadwal', label: 'Jadwal Perkuliahan' },
  { key: 'presensi', label: 'Presensi Kelas' },
  { key: 'ujian', label: 'Jadwal Ujian' },
  { key: 'nilai', label: 'Nilai Perkuliahan' },
  { key: 'capaian', label: 'Capaian Pembelajaran' },
  { key: 'kuesioner', label: 'Rekap Kuesioner' },
  { key: 'rps', label: 'RPS' },
  { key: 'tugas', label: 'Tugas Kuliah' },
] as const;
type MenuKey = (typeof MENU_SAMPING)[number]['key'];
const SEGERA: MenuKey[] = ['kontrak', 'capaian', 'tugas'];
const menu = ref<MenuKey>(MENU_SAMPING.find((m) => m.key === route.query.menu)?.key ?? 'nilai');
watch(menu, (m) => router.replace({ query: { ...route.query, menu: m } }));
const judul = computed(() => (menu.value === 'nilai' ? 'Komposisi Nilai Kelas' : MENU_SAMPING.find((m) => m.key === menu.value)?.label ?? ''));

const data = ref<KelasKuliahDetail | null>(null);
const error = ref<string | null>(null);
const load = async () => {
  error.value = null;
  try {
    data.value = await kelasKuliahApi.detail(props.id);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kelas kuliah');
  }
};

// ---- Cari kelas lain pada periode yang sama ----
const kelasList = ref<KelasKuliahRow[]>([]);
const kelasOptions = computed<SelectOption[]>(() =>
  kelasList.value.map((k) => ({ value: k.id, label: `${k.kodeMataKuliah} — ${k.namaMataKuliah} · ${k.kelas}` })),
);
const pindahKe = ref<string | number | null>(Number(props.id));
watch(pindahKe, (v) => {
  if (v && Number(v) !== Number(props.id)) router.push({ name: ruteDetail, params: { id: Number(v) }, query: { menu: menu.value } });
});
const muatKelasList = async () => {
  if (!data.value?.kelas.tahunAjaranId) return;
  try {
    kelasList.value = await kelasKuliahApi.list({ tahunAjaranId: data.value.kelas.tahunAjaranId });
  } catch {
    kelasList.value = [];
  }
};
watch(
  () => props.id,
  async () => {
    pindahKe.value = Number(props.id);
    await load();
  },
);
onMounted(async () => {
  await load();
  muatKelasList();
});

const hari = computed(() => {
  const h = data.value?.kelas.hari;
  return Array.isArray(h) ? h.join(', ') : (h ?? '-');
});
const STATUS_KRS: Record<string, string> = { DRAFT: 'Draft', DIAJUKAN: 'Diajukan', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak' };
const bukaRps = () => {
  if (!data.value?.kelas.mataKuliahId) return;
  router.push({
    name: portalDosen ? 'dosen-mata-kuliah-rps' : 'prodi-perkuliahan-mata-kuliah-rps',
    params: { id: data.value.kelas.mataKuliahId },
    query: { periode: data.value.kelas.tahunAjaranId ?? undefined },
  });
};
</script>

<template>
  <div>
    <header class="mb-4">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">{{ judul }}</h1>
      <p class="text-body-sm text-on-surface-variant">{{ breadcrumb }} / {{ judul }}</p>
    </header>

    <!-- Bar atas -->
    <section class="bg-surface-container-lowest border border-outline-variant border-t-2 border-t-primary rounded-lg p-3 mb-4 flex flex-col lg:flex-row lg:items-center gap-3">
      <div class="flex-1 min-w-0 lg:max-w-md">
        <SearchableSelect v-model="pindahKe" placeholder="Cari Kelas" search-placeholder="Ketik kode/nama MK atau kelas..." :options="kelasOptions" />
      </div>
      <div class="flex flex-wrap gap-2 lg:ml-auto">
        <AppButton variant="secondary" icon="arrow_back" @click="router.push({ name: ruteDaftar })">Kembali ke Daftar Kelas</AppButton>
        <div id="kelas-aksi" class="contents" />
      </div>
    </section>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <div class="flex flex-col md:flex-row gap-4 items-start">
      <nav class="w-full md:w-52 shrink-0 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <button
          v-for="m in MENU_SAMPING"
          :key="m.key"
          type="button"
          class="w-full text-left px-4 py-2.5 text-body-sm border-b border-outline-variant last:border-b-0 transition-colors"
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
        <template v-if="data">
          <!-- Kotak info kelas -->
          <section
            class="bg-primary-container/40 border border-outline-variant border-l-4 border-l-primary rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-body-sm"
          >
            <dl class="grid grid-cols-[8.5rem_1fr] gap-y-1">
              <dt class="font-semibold text-primary">Program Studi</dt>
              <dd>{{ data.kelas.prodi ?? '-' }}{{ data.kelas.isObe ? ' (OBE)' : '' }}</dd>
              <dt class="font-semibold text-primary">Mata Kuliah</dt>
              <dd>{{ data.kelas.kodeMataKuliah }} - {{ data.kelas.namaMataKuliah }} - {{ data.kelas.sks ?? 0 }} SKS</dd>
              <dt class="font-semibold text-primary">Kurikulum</dt>
              <dd>{{ data.kelas.kurikulum ?? '-' }}</dd>
              <dt class="font-semibold text-primary">Kapasitas</dt>
              <dd>{{ data.kelas.kapasitas ?? '-' }}</dd>
            </dl>
            <dl class="grid grid-cols-[8.5rem_1fr] gap-y-1">
              <dt class="font-semibold text-primary">Periode</dt>
              <dd>{{ data.kelas.periode }}</dd>
              <dt class="font-semibold text-primary">Nama Kelas</dt>
              <dd>{{ data.kelas.kelas }}</dd>
              <dt class="font-semibold text-primary">Sistem Kuliah</dt>
              <dd>{{ data.kelas.sistemKuliah ?? '-' }}</dd>
              <dt class="font-semibold text-primary">Peserta</dt>
              <dd>{{ data.kelas.peserta }}</dd>
            </dl>
          </section>

          <!-- Nilai Perkuliahan → Komposisi Nilai Kelas -->
          <KomposisiNilaiKelas
            v-if="menu === 'nilai'"
            :detail="data"
            :can-update="canUpdate"
            :can-delete="canDelete"
            :input-nilai-to="portalDosen ? { name: 'dosen-periodik', query: { kelas: String(data.kelas.id) } } : undefined"
            @reload="load"
          />

          <!-- Jadwal Perkuliahan: rencana RPS vs realisasi mengajar -->
          <JadwalPerkuliahanKelas v-else-if="menu === 'jadwal'" :kelas-id="data.kelas.id" :info="data" />
          <PresensiKelas v-else-if="menu === 'presensi'" :kelas-id="data.kelas.id" />
          <JadwalUjianKelas v-else-if="menu === 'ujian'" :kelas-id="data.kelas.id" :can-update="bisaUbahUjian" />
          <RekapKuesionerKelas v-else-if="menu === 'kuesioner'" :kelas-id="data.kelas.id" />

          <!-- Detail Kelas -->
          <section v-else-if="menu === 'detail'" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <h2 class="px-4 py-3 border-b border-outline-variant font-semibold text-primary">Detail Kelas</h2>
            <dl class="divide-y divide-outline-variant text-body-sm">
              <div
                v-for="[label, nilai] in [
                  ['Kode / Mata Kuliah', `${data.kelas.kodeMataKuliah} — ${data.kelas.namaMataKuliah}`],
                  ['Nama Kelas', data.kelas.kelas],
                  ['Semester', data.kelas.semester ?? '-'],
                  ['SKS (Teori / Praktik / Lab)', `${data.kelas.sks ?? 0} (${data.kelas.sksTeori} / ${data.kelas.sksPraktik} / ${data.kelas.sksLab})`],
                  ['Hari', hari],
                  ['Jam Ke-', data.kelas.jam ?? '-'],
                  ['Ruangan', data.kelas.ruangan ?? '-'],
                  ['Google Classroom', data.kelas.gcr || '-'],
                ] as [string, string | number][]"
                :key="label"
                class="grid grid-cols-1 sm:grid-cols-[14rem_1fr] gap-1 px-4 py-2.5"
              >
                <dt class="font-medium text-primary">{{ label }}</dt>
                <dd class="break-all">{{ nilai }}</dd>
              </div>
            </dl>
          </section>

          <!-- Dosen Pengajar -->
          <section v-else-if="menu === 'dosen'" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-x-auto">
            <table class="w-full text-body-sm border-collapse">
              <thead class="bg-primary text-on-primary">
                <tr>
                  <th class="p-3 text-left w-12">No</th>
                  <th class="p-3 text-left">NIDN</th>
                  <th class="p-3 text-left">Nama Dosen</th>
                  <th class="p-3 text-left">Peran</th>
                  <th class="p-3 text-center">SKS</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                <tr v-if="data.dosenKoordinator">
                  <td class="p-3">1</td>
                  <td class="p-3">{{ data.dosenKoordinator.nidn }}</td>
                  <td class="p-3">{{ data.dosenKoordinator.nama }}</td>
                  <td class="p-3">Koordinator</td>
                  <td class="p-3 text-center">-</td>
                </tr>
                <tr v-for="(d, i) in data.dosenPengampu" :key="d.id">
                  <td class="p-3">{{ i + (data.dosenKoordinator ? 2 : 1) }}</td>
                  <td class="p-3">{{ d.nidn }}</td>
                  <td class="p-3">{{ d.nama }}</td>
                  <td class="p-3">Pengampu</td>
                  <td class="p-3 text-center">{{ d.sks ?? '-' }}</td>
                </tr>
                <tr v-if="!data.dosenKoordinator && !data.dosenPengampu.length">
                  <td colspan="5" class="p-6 text-center text-on-surface-variant">Belum ada dosen pengajar</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- Peserta Kelas -->
          <section v-else-if="menu === 'peserta'" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-x-auto">
            <table class="w-full text-body-sm border-collapse">
              <thead class="bg-primary text-on-primary">
                <tr>
                  <th class="p-3 text-left w-12">No</th>
                  <th class="p-3 text-left">NIM</th>
                  <th class="p-3 text-left">Nama Mahasiswa</th>
                  <th class="p-3 text-left">Sistem Kuliah</th>
                  <th class="p-3 text-center">Semester</th>
                  <th class="p-3 text-center">Status KRS</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                <tr v-if="!data.peserta.length">
                  <td colspan="6" class="p-6 text-center text-on-surface-variant">Belum ada peserta kelas</td>
                </tr>
                <tr v-for="(p, i) in data.peserta" :key="p.mahasiswaId">
                  <td class="p-3">{{ i + 1 }}</td>
                  <td class="p-3 whitespace-nowrap">{{ p.nim }}</td>
                  <td class="p-3">{{ p.nama }}</td>
                  <td class="p-3">{{ p.golongan ?? '-' }}</td>
                  <td class="p-3 text-center">{{ p.semester }}</td>
                  <td class="p-3 text-center">
                    <span
                      class="inline-flex px-2 py-0.5 rounded-full text-label-sm"
                      :class="p.statusKrs === 'DISETUJUI' ? 'bg-[#059669]/15 text-[#05603a]' : 'bg-surface-container text-on-surface-variant'"
                    >
                      {{ STATUS_KRS[p.statusKrs] ?? p.statusKrs }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- RPS -->
          <section v-else-if="menu === 'rps'" class="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 text-body-sm space-y-3">
            <p>
              RPS (Pemetaan CPL & CPMK, Detail RPS, Rencana Pembelajaran & Rencana Evaluasi) dikelola per mata kuliah
              <strong>{{ data.kelas.kodeMataKuliah }} — {{ data.kelas.namaMataKuliah }}</strong>.
            </p>
            <p v-if="!data.kelas.mataKuliahId" class="text-on-surface-variant">Kelas ini belum terhubung ke mata kuliah kurikulum.</p>
            <AppButton v-else-if="bisaRps" icon="menu_book" @click="bukaRps">Buka RPS Mata Kuliah</AppButton>
            <p v-else class="text-on-surface-variant">Anda belum punya akses menu Perkuliahan → Mata Kuliah untuk membuka RPS.</p>
          </section>

          <ComingSoonPanel v-else-if="SEGERA.includes(menu)" icon="construction" message="Menu ini sedang dalam pengembangan dan akan segera hadir." />
        </template>
        <div v-else-if="!error" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      </div>
    </div>
  </div>
</template>

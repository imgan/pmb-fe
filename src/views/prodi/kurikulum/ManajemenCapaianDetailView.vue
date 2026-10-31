<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppButton from '@/components/ui/AppButton.vue';
import Modal from '@/components/ui/Modal.vue';
import SelectInput, { type SelectOption } from '@/components/ui/SelectInput.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import {
  capaianApi,
  type AspekCpl,
  type CapaianDetail,
  type CapaianRow,
  type Cpl,
  type LevelPemetaan,
  type MetodeBobot,
  type ProfilLulusan,
} from '@/api/capaian';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { confirmAction, toastError, toastSuccess, toastWarning } from '@/utils/swal';

/**
 * Kelola capaian satu kurikulum (tata letak mengikuti SIAKAD acuan): menu samping Manajemen PL /
 * Manajemen CPL / Pemetaan PL → CPL / Pemetaan CPL → MK, bar atas (cari kurikulum, Kembali ke Daftar,
 * Tambah Data, Salin Data) dan kotak info kurikulum.
 */
const props = defineProps<{ id: string }>();
const router = useRouter();
const route = useRoute();
const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_MANAJEMEN_CAPAIAN_MANAGEMENT);

const ASPEK_LABEL: Record<AspekCpl, string> = {
  SIKAP: 'Sikap',
  PENGETAHUAN: 'Pengetahuan',
  KETERAMPILAN_UMUM: 'Keterampilan Umum',
  KETERAMPILAN_KHUSUS: 'Keterampilan Khusus',
};
const ASPEK_OPTIONS: SelectOption[] = Object.entries(ASPEK_LABEL).map(([value, label]) => ({ value, label }));
const MENU_SAMPING = [
  { key: 'pl', label: 'Manajemen PL' },
  { key: 'cpl', label: 'Manajemen CPL' },
  { key: 'pl-cpl', label: 'Pemetaan PL → CPL' },
  { key: 'cpl-mk', label: 'Pemetaan CPL → MK' },
] as const;
type MenuKey = (typeof MENU_SAMPING)[number]['key'];
// Tab awal bisa dipilih lewat ?menu= (mis. dari RPS → Pemetaan CPL: "Kelola CPL").
const menu = ref<MenuKey>(MENU_SAMPING.find((m) => m.key === route.query.menu)?.key ?? 'pl');
const judulMenu = computed(() => MENU_SAMPING.find((m) => m.key === menu.value)?.label ?? '');
/** Menu PL / CPL = kelola data (Tambah & Salin aktif). */
const menuData = computed<'pl' | 'cpl' | null>(() => (menu.value === 'pl' || menu.value === 'cpl' ? menu.value : null));

const data = ref<CapaianDetail | null>(null);
const error = ref<string | null>(null);
const kurikulumId = computed(() => Number(props.id));

// Matriks pemetaan (draft sebelum disimpan). PL → CPL: "plId|cplId" → bobot (teks isian; OTOMATIS: ada = dicentang).
// CPL → MK: set "cplId|mkId" yang dicentang (cplId = CPL induk / IK sesuai level).
const plCplBobot = ref<Record<string, string>>({});
const metodeBobot = ref<MetodeBobot>('OTOMATIS');
const cplMkSet = ref(new Set<string>());
const levelCplMk = ref<LevelPemetaan>('CPL');
const dirtyPlCpl = ref(false);
const dirtyCplMk = ref(false);

/** Kembalikan draft pemetaan ke data tersimpan. */
const resetPemetaan = () => {
  if (!data.value) return;
  plCplBobot.value = Object.fromEntries(data.value.plCpl.map((p) => [`${p.profilLulusanId}|${p.cplId}`, p.bobot.toFixed(2)]));
  metodeBobot.value = data.value.kurikulum.metodeBobotPlCpl ?? 'OTOMATIS';
  cplMkSet.value = new Set(data.value.cplMk.map((p) => `${p.cplId}|${p.mataKuliahId}`));
  levelCplMk.value = data.value.kurikulum.levelPemetaanCplMk ?? 'CPL';
  dirtyPlCpl.value = false;
  dirtyCplMk.value = false;
};

const load = async () => {
  error.value = null;
  try {
    data.value = await capaianApi.detail(props.id);
    resetPemetaan();
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat capaian');
  }
};

// ---- Cari kurikulum lain (pindah halaman) & sumber Salin Data ----
const kurikulumList = ref<CapaianRow[]>([]);
const kurikulumOptions = computed(() =>
  kurikulumList.value.map((k) => ({
    value: k.id,
    label: `${k.tahunKurikulum ?? '-'} · ${k.prodi ?? '-'} — ${k.nama}`,
  })),
);
const pindahKe = ref<string | number | null>(props.id ? Number(props.id) : '');
watch(pindahKe, (v) => {
  if (v && Number(v) !== kurikulumId.value)
    router.push({
      name: 'prodi-manajemen-capaian-detail',
      params: { id: Number(v) },
    });
});
watch(
  () => props.id,
  () => {
    pindahKe.value = Number(props.id);
    load();
  },
);

onMounted(async () => {
  load();
  try {
    kurikulumList.value = await capaianApi.list();
  } catch {
    kurikulumList.value = [];
  }
});

const hapus = async (jenis: 'pl' | 'cpl', item: ProfilLulusan | Cpl) => {
  const ok = await confirmAction({
    title: `Hapus ${item.kode}?`,
    text: 'Pemetaan yang terkait ikut terhapus.',
    confirmLabel: 'Ya, hapus',
  });
  if (!ok) return;
  try {
    await capaianApi.removeItem(jenis, kurikulumId.value, item.id);
    toastSuccess(`${item.kode} dihapus`);
    await load();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menghapus'));
  }
};

// ---- Tambah / ubah PL langsung di tabel (baris isian) ----
interface PlDraft {
  kode: string;
  nama: string;
  deskripsi: string;
  deskripsiEn: string;
  profesi: string;
}
const plKosong = (): PlDraft => ({
  kode: '',
  nama: '',
  deskripsi: '',
  deskripsiEn: '',
  profesi: '',
});
/** null = tidak ada baris isian; 'new' = tambah; angka = id PL yang diubah. */
const plEditing = ref<number | 'new' | null>(null);
const plDraft = reactive<PlDraft>(plKosong());
const plAsal = ref<PlDraft>(plKosong());
const plSaving = ref(false);
const plError = ref<string | null>(null);

const mulaiPl = (p: ProfilLulusan | null) => {
  const nilai: PlDraft = p
    ? {
        kode: p.kode,
        nama: p.nama ?? '',
        deskripsi: p.deskripsi,
        deskripsiEn: p.deskripsiEn ?? '',
        profesi: p.profesi ?? '',
      }
    : plKosong();
  plAsal.value = { ...nilai };
  Object.assign(plDraft, nilai);
  plError.value = null;
  plEditing.value = p ? p.id : 'new';
};
/** Reset: kembalikan isian ke nilai awal (kosong untuk tambah, data tersimpan untuk ubah). */
const resetPl = () => {
  Object.assign(plDraft, plAsal.value);
  plError.value = null;
};
const batalPl = () => {
  plEditing.value = null;
  plError.value = null;
};
const simpanPl = async () => {
  if (!plDraft.kode.trim()) return (plError.value = 'Kode PL wajib diisi');
  if (!plDraft.nama.trim()) return (plError.value = 'Profil lulusan wajib diisi');
  if (!plDraft.deskripsi.trim()) return (plError.value = 'Deskripsi Bahasa Indonesia wajib diisi');
  plSaving.value = true;
  plError.value = null;
  try {
    await capaianApi.saveItem(
      'pl',
      kurikulumId.value,
      {
        kode: plDraft.kode.trim(),
        nama: plDraft.nama.trim(),
        deskripsi: plDraft.deskripsi.trim(),
        deskripsiEn: plDraft.deskripsiEn.trim() || null,
        profesi: plDraft.profesi.trim() || null,
      },
      typeof plEditing.value === 'number' ? plEditing.value : undefined,
    );
    toastSuccess(plEditing.value === 'new' ? 'Profil lulusan ditambahkan' : 'Profil lulusan diperbarui');
    plEditing.value = null;
    await load();
  } catch (err) {
    plError.value = extractErrorMessage(err, 'Gagal menyimpan profil lulusan');
  } finally {
    plSaving.value = false;
  }
};
// ---- Tambah / ubah CPL & Indikator Kinerja (IK) langsung di tabel ----
interface CplDraft {
  kode: string;
  deskripsi: string;
  deskripsiEn: string;
  aspek: string | number | null;
}
const cplKosong = (): CplDraft => ({
  kode: '',
  deskripsi: '',
  deskripsiEn: '',
  aspek: '',
});
/**
 * null = tidak ada baris isian; 'new' = tambah CPL; { indukId } = tambah IK di bawah CPL tsb;
 * angka = id CPL/IK yang diubah.
 */
const cplEditing = ref<number | 'new' | { indukId: number } | null>(null);
const cplDraft = reactive<CplDraft>(cplKosong());
const cplAsal = ref<CplDraft>(cplKosong());
const cplSaving = ref(false);
const cplError = ref<string | null>(null);

/** CPL induk beserta indikatornya, urut kode. */
const cplInduk = computed(() => (data.value?.cpl ?? []).filter((c) => !c.parentId));
const indikatorOf = (indukId: number) => (data.value?.cpl ?? []).filter((c) => c.parentId === indukId);
const isTambahIk = (indukId: number) => typeof cplEditing.value === 'object' && cplEditing.value !== null && cplEditing.value.indukId === indukId;
const cplSedangIk = computed(() => {
  const e = cplEditing.value;
  if (typeof e === 'object' && e !== null) return true;
  if (typeof e === 'number') return !!data.value?.cpl.find((c) => c.id === e)?.parentId;
  return false;
});

const mulaiCpl = (target: Cpl | 'new' | { indukId: number }) => {
  const c = typeof target === 'object' && 'id' in target ? target : null;
  const nilai: CplDraft = c
    ? {
        kode: c.kode,
        deskripsi: c.deskripsi,
        deskripsiEn: c.deskripsiEn ?? '',
        aspek: c.aspek ?? '',
      }
    : cplKosong();
  cplAsal.value = { ...nilai };
  Object.assign(cplDraft, nilai);
  cplError.value = null;
  cplEditing.value = c ? c.id : (target as 'new' | { indukId: number });
};
const resetCpl = () => {
  Object.assign(cplDraft, cplAsal.value);
  cplError.value = null;
};
const batalCpl = () => {
  cplEditing.value = null;
  cplError.value = null;
};
const simpanCpl = async () => {
  if (!cplDraft.kode.trim()) return (cplError.value = 'Kode CPL wajib diisi');
  if (!cplDraft.deskripsi.trim()) return (cplError.value = 'Deskripsi Bahasa Indonesia wajib diisi');
  const e = cplEditing.value;
  cplSaving.value = true;
  cplError.value = null;
  try {
    await capaianApi.saveItem(
      'cpl',
      kurikulumId.value,
      {
        kode: cplDraft.kode.trim(),
        deskripsi: cplDraft.deskripsi.trim(),
        deskripsiEn: cplDraft.deskripsiEn.trim() || null,
        aspek: (cplDraft.aspek || null) as AspekCpl | null,
        parentId: typeof e === 'object' && e !== null ? e.indukId : undefined,
      },
      typeof e === 'number' ? e : undefined,
    );
    toastSuccess(typeof e === 'number' ? 'Data diperbarui' : cplSedangIk.value ? 'Indikator ditambahkan' : 'CPL ditambahkan');
    cplEditing.value = null;
    await load();
  } catch (err) {
    cplError.value = extractErrorMessage(err, 'Gagal menyimpan CPL');
  } finally {
    cplSaving.value = false;
  }
};

/** Tombol "Tambah Data": baris isian di tabel (PL atau CPL). */
const tambahData = () => {
  if (menuData.value === 'pl') mulaiPl(null);
  else if (menuData.value === 'cpl') mulaiCpl('new');
};
watch(menu, () => {
  plEditing.value = null;
  cplEditing.value = null;
});

const inputCls =
  'w-full px-2 py-1.5 border border-outline-variant rounded text-body-sm bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none';

// ---- Salin Data ----
const salinOpen = ref(false);
const salinDari = ref<string | number | null>('');
const salinOptions = computed(() => kurikulumOptions.value.filter((o) => o.value !== kurikulumId.value));
const menyalin = ref(false);
const salin = async () => {
  if (!menuData.value || !salinDari.value) return;
  menyalin.value = true;
  try {
    toastSuccess(await capaianApi.salin(menuData.value, kurikulumId.value, Number(salinDari.value)));
    salinOpen.value = false;
    salinDari.value = '';
    await load();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyalin data'));
  } finally {
    menyalin.value = false;
  }
};

// ---- Pemetaan ----
const METODE_OPTIONS: SelectOption[] = [
  { value: 'MANUAL', label: 'Isi Manual' },
  { value: 'OTOMATIS', label: 'Isi Otomatis' },
];
/** Bobot rata satu PL: 100 ÷ jumlah CPL (2 desimal), sisa pembulatan ke CPL terakhir (sama dengan backend). */
const bobotRata = (keys: string[]) => {
  const rata = Math.floor(10000 / keys.length) / 100;
  const sisa = Math.round((100 - rata * (keys.length - 1)) * 100) / 100;
  return keys.map((k, i) => [k, (i === keys.length - 1 ? sisa : rata).toFixed(2)] as const);
};
/** Urutan kolom CPL — dipakai agar sisa pembulatan rata selalu jatuh ke CPL paling kanan (sama dengan backend). */
const urutanCpl = (key: string) => cplInduk.value.findIndex((c) => c.id === Number(key.split('|')[1]));
/** Hitung ulang bobot rata semua PL dari key yang dicentang: 1 centang = 100%, 2 = 50%, 3 = 33,33%, dst. */
const rataUlang = (keys: string[]) => {
  const perPl = new Map<string, string[]>();
  for (const k of [...keys].sort((a, b) => urutanCpl(a) - urutanCpl(b))) perPl.set(k.split('|')[0], [...(perPl.get(k.split('|')[0]) ?? []), k]);
  return Object.fromEntries([...perPl.values()].flatMap(bobotRata));
};
/** Ganti metode: ke Manual → bobot diisi rata dari CPL yang dicentang; ke Otomatis → CPL berbobot > 0 dicentang & dirata. */
const gantiMetode = (v: string | number | null) => {
  const metode = (v || 'OTOMATIS') as MetodeBobot;
  if (metode === metodeBobot.value) return;
  const keys = Object.keys(plCplBobot.value).filter((k) => metode === 'MANUAL' || Number(plCplBobot.value[k]) > 0);
  plCplBobot.value = rataUlang(keys);
  metodeBobot.value = metode;
  dirtyPlCpl.value = true;
};
/** Centang / hapus centang (Otomatis): bobot baris PL langsung dibagi rata ulang. */
const togglePlCpl = (plId: number, cplId: number) => {
  if (!canUpdate.value) return;
  const key = `${plId}|${cplId}`;
  const keys = Object.keys(plCplBobot.value);
  plCplBobot.value = rataUlang(keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]);
  dirtyPlCpl.value = true;
};
/** Teks bobot satu sel, mis. "50%" / "33,33%". */
const labelBobot = (key: string) => `${Number(plCplBobot.value[key] ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;
/** Isi bobot (persen) satu sel: dibatasi 0 s.d. sisa kuota PL agar total baris tidak lebih dari 100%. */
const isiBobot = (plId: number, cplId: number, el: HTMLInputElement) => {
  const key = `${plId}|${cplId}`;
  let nilai = el.value;
  if (nilai !== '') {
    const sisa = Math.max(Math.round((100 - totalBobot(plId) + (Number(plCplBobot.value[key]) || 0)) * 100) / 100, 0);
    const angka = Math.min(Math.max(Number(nilai) || 0, 0), sisa);
    if ((Number(nilai) || 0) > sisa) toastWarning(`Total bobot satu PL maksimal 100%. Sisa bobot yang bisa diisi: ${sisa}%`);
    if (angka !== Number(nilai)) {
      nilai = String(angka);
      el.value = nilai;
    }
  }
  plCplBobot.value = { ...plCplBobot.value, [key]: nilai };
  dirtyPlCpl.value = true;
};
/** Total bobot manual satu PL. */
const totalBobot = (plId: number) =>
  Math.round(
    Object.entries(plCplBobot.value)
      .filter(([k]) => k.startsWith(`${plId}|`))
      .reduce((s, [, v]) => s + (Number(v) || 0), 0) * 100,
  ) / 100;
const toggleCplMk = (cplId: number, mkId: number) => {
  if (!canUpdate.value) return;
  const key = `${cplId}|${mkId}`;
  const next = new Set(cplMkSet.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  cplMkSet.value = next;
  dirtyCplMk.value = true;
};

const LEVEL_OPTIONS: SelectOption[] = [
  { value: 'CPL', label: 'CPL' },
  { value: 'IK', label: 'IK' },
];
/** Kolom matriks CPL → MK: level CPL = CPL induk; level IK = IK tiap CPL (CPL tanpa IK tetap satu kolom). */
const kolomCplMk = computed(() =>
  levelCplMk.value === 'CPL' ? cplInduk.value : cplInduk.value.flatMap((c) => (indikatorOf(c.id).length ? indikatorOf(c.id) : [c])),
);
/**
 * Ganti level: CPL → IK = MK yang dicentang di CPL ikut dicentang di semua IK-nya;
 * IK → CPL = CPL dicentang bila salah satu IK-nya dicentang.
 */
const gantiLevel = (v: string | number | null) => {
  const level = (v || 'CPL') as LevelPemetaan;
  if (level === levelCplMk.value) return;
  const next = new Set<string>();
  for (const key of cplMkSet.value) {
    const [cplId, mkId] = key.split('|').map(Number);
    const c = data.value?.cpl.find((x) => x.id === cplId);
    if (!c) continue;
    if (level === 'CPL') next.add(`${c.parentId ?? c.id}|${mkId}`);
    else {
      const ik = indikatorOf(c.id);
      for (const t of ik.length ? ik : [c]) next.add(`${t.id}|${mkId}`);
    }
  }
  cplMkSet.value = next;
  levelCplMk.value = level;
  dirtyCplMk.value = true;
};

const savingMap = ref(false);
const simpanPemetaan = async () => {
  if (menu.value === 'pl-cpl' && metodeBobot.value === 'MANUAL') {
    const salah = (data.value?.profilLulusan ?? []).filter((p) => {
      const t = totalBobot(p.id);
      return t > 0 && Math.abs(t - 100) > 0.01;
    });
    if (salah.length) return toastError(`Total bobot harus 100% untuk ${salah.map((p) => p.kode).join(', ')}`);
  }
  savingMap.value = true;
  try {
    if (menu.value === 'pl-cpl') {
      const pairs = Object.entries(plCplBobot.value)
        .sort(([a], [b]) => urutanCpl(a) - urutanCpl(b))
        .map(([k, v]) => {
          const [profilLulusanId, cplId] = k.split('|').map(Number);
          return { profilLulusanId, cplId, bobot: v === '' ? null : Number(v) };
        });
      await capaianApi.savePlCpl(kurikulumId.value, metodeBobot.value, pairs);
      toastSuccess('Pemetaan PL → CPL disimpan');
    } else {
      const pairs = [...cplMkSet.value].map((k) => {
        const [cplId, mataKuliahId] = k.split('|').map(Number);
        return { cplId, mataKuliahId };
      });
      await capaianApi.saveCplMk(kurikulumId.value, levelCplMk.value, pairs);
      toastSuccess('Pemetaan CPL → MK disimpan');
    }
    await load();
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan pemetaan'));
  } finally {
    savingMap.value = false;
  }
};
const dirtyPemetaan = computed(() => (menu.value === 'pl-cpl' ? dirtyPlCpl.value : dirtyCplMk.value));

const mkOnlyObe = ref(false);
const mkTampil = computed(() => (data.value?.mataKuliah ?? []).filter((m) => !mkOnlyObe.value || m.isObe));

const btnAksi = 'inline-flex items-center justify-center w-7 h-7 rounded text-white hover:opacity-90';
</script>

<template>
  <div>
    <header class="mb-4">
      <h1 class="font-semibold text-headline-lg-mobile md:text-headline-lg text-primary">
        {{ judulMenu }}
      </h1>
      <p class="text-body-sm text-on-surface-variant">Prodi / Kurikulum / Manajemen Capaian / {{ judulMenu }}</p>
    </header>

    <!-- Bar atas: cari kurikulum + aksi -->
    <section class="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 mb-4 flex flex-col lg:flex-row lg:items-center gap-3">
      <div class="flex-1 min-w-0 lg:max-w-md">
        <SearchableSelect
          v-model="pindahKe"
          placeholder="Cari Kurikulum Program Studi"
          search-placeholder="Ketik tahun, prodi, atau nama kurikulum..."
          :options="kurikulumOptions"
        />
      </div>
      <div class="flex flex-wrap gap-2 lg:ml-auto">
        <AppButton variant="secondary" icon="arrow_back" @click="router.push({ name: 'prodi-manajemen-capaian' })">Kembali ke Daftar</AppButton>
        <template v-if="menuData">
          <AppButton
            v-if="canCreate"
            icon="add"
            :disabled="(menuData === 'pl' && plEditing === 'new') || (menuData === 'cpl' && cplEditing === 'new')"
            @click="tambahData"
          >
            Tambah Data
          </AppButton>
          <AppButton v-if="canCreate" variant="secondary" icon="content_copy" @click="salinOpen = true">Salin Data</AppButton>
        </template>
        <template v-else-if="canUpdate">
          <AppButton icon="save" :disabled="savingMap || !dirtyPemetaan" @click="simpanPemetaan">
            {{ savingMap ? 'Menyimpan...' : 'Simpan Data' }}
          </AppButton>
          <AppButton variant="secondary" icon="refresh" :disabled="savingMap || !dirtyPemetaan" @click="resetPemetaan">Batalkan</AppButton>
        </template>
      </div>
    </section>

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
      {{ error }}
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
        <template v-if="data">
          <!-- Kotak info kurikulum -->
          <section
            class="bg-primary-container/40 border border-outline-variant rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-body-sm"
          >
            <dl class="grid grid-cols-[8rem_1fr] gap-y-1">
              <dt class="font-semibold text-primary">Kode Prodi</dt>
              <dd>{{ data.kurikulum.kodeProdi ?? '-' }}</dd>
              <dt class="font-semibold text-primary">Program Studi</dt>
              <dd>{{ data.kurikulum.prodi ?? '-' }}</dd>
            </dl>
            <dl class="grid grid-cols-[8rem_1fr] gap-y-1">
              <dt class="font-semibold text-primary">Tahun Kurikulum</dt>
              <dd>{{ data.kurikulum.tahunKurikulum ?? '-' }}</dd>
              <dt class="font-semibold text-primary">Jenis Kurikulum</dt>
              <dd>
                <span
                  class="inline-flex px-2 py-0.5 rounded text-label-sm font-medium"
                  :class="data.kurikulum.isObe ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'"
                >
                  {{ data.kurikulum.isObe ? 'OBE' : 'Non OBE' }}
                </span>
              </dd>
            </dl>
          </section>

          <!-- Manajemen PL -->
          <section v-if="menu === 'pl'" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-x-auto">
            <table class="w-full text-body-sm border-collapse">
              <thead class="bg-primary text-on-primary">
                <tr>
                  <th class="p-3 text-left w-24">Kode PL</th>
                  <th class="p-3 text-left w-48">Profil Lulusan</th>
                  <th class="p-3 text-left">Deskripsi Profil Lulusan</th>
                  <th class="p-3 text-left w-56">Profesi Lulusan</th>
                  <th class="p-3 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant align-top">
                <tr v-if="plError">
                  <td colspan="5" class="px-3 py-2 bg-error-container text-on-error-container text-body-sm">
                    {{ plError }}
                  </td>
                </tr>
                <!-- Baris isian tambah -->
                <tr v-if="plEditing === 'new'" class="bg-primary-container/20">
                  <td class="p-2">
                    <input v-model="plDraft.kode" :class="inputCls" placeholder="KODE PL" maxlength="20" />
                  </td>
                  <td class="p-2">
                    <textarea v-model="plDraft.nama" :class="inputCls" rows="4" placeholder="Profil Lulusan" />
                  </td>
                  <td class="p-2 space-y-2">
                    <textarea v-model="plDraft.deskripsi" :class="inputCls" rows="3" placeholder="Bahasa Indonesia (Wajib)" />
                    <textarea v-model="plDraft.deskripsiEn" :class="inputCls" rows="3" placeholder="Bahasa Inggris (Optional)" />
                  </td>
                  <td class="p-2">
                    <textarea v-model="plDraft.profesi" :class="inputCls" rows="4" placeholder="Profesi Lulusan" />
                  </td>
                  <td class="p-2">
                    <div class="flex justify-center gap-1">
                      <button type="button" :class="[btnAksi, 'bg-[#2e7d5b]']" title="Simpan" :disabled="plSaving" @click="simpanPl">
                        <span class="material-symbols-outlined" style="font-size: 16px">save</span>
                      </button>
                      <button type="button" :class="[btnAksi, 'bg-[#eda100]']" title="Reset isian" @click="resetPl">
                        <span class="material-symbols-outlined" style="font-size: 16px">refresh</span>
                      </button>
                      <button type="button" :class="[btnAksi, 'bg-[#5b6472]']" title="Batal" @click="batalPl">
                        <span class="material-symbols-outlined" style="font-size: 16px">close</span>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!data.profilLulusan.length && plEditing !== 'new'">
                  <td colspan="5" class="p-6 text-center text-on-surface-variant">Belum ada profil lulusan. Klik Tambah Data atau Salin Data.</td>
                </tr>
                <template v-for="p in data.profilLulusan" :key="p.id">
                  <!-- Baris isian ubah -->
                  <tr v-if="plEditing === p.id" class="bg-primary-container/20">
                    <td class="p-2">
                      <input v-model="plDraft.kode" :class="inputCls" placeholder="KODE PL" maxlength="20" />
                    </td>
                    <td class="p-2">
                      <textarea v-model="plDraft.nama" :class="inputCls" rows="4" placeholder="Profil Lulusan" />
                    </td>
                    <td class="p-2 space-y-2">
                      <textarea v-model="plDraft.deskripsi" :class="inputCls" rows="3" placeholder="Bahasa Indonesia (Wajib)" />
                      <textarea v-model="plDraft.deskripsiEn" :class="inputCls" rows="3" placeholder="Bahasa Inggris (Optional)" />
                    </td>
                    <td class="p-2">
                      <textarea v-model="plDraft.profesi" :class="inputCls" rows="4" placeholder="Profesi Lulusan" />
                    </td>
                    <td class="p-2">
                      <div class="flex justify-center gap-1">
                        <button type="button" :class="[btnAksi, 'bg-[#2e7d5b]']" title="Simpan" :disabled="plSaving" @click="simpanPl">
                          <span class="material-symbols-outlined" style="font-size: 16px">save</span>
                        </button>
                        <button type="button" :class="[btnAksi, 'bg-[#eda100]']" title="Reset isian" @click="resetPl">
                          <span class="material-symbols-outlined" style="font-size: 16px">refresh</span>
                        </button>
                        <button type="button" :class="[btnAksi, 'bg-[#5b6472]']" title="Batal" @click="batalPl">
                          <span class="material-symbols-outlined" style="font-size: 16px">close</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-else>
                    <td class="p-3 font-medium whitespace-nowrap">
                      {{ p.kode }}
                    </td>
                    <td class="p-3">{{ p.nama || '-' }}</td>
                    <td class="p-3">
                      <div class="whitespace-pre-line">{{ p.deskripsi }}</div>
                      <div v-if="p.deskripsiEn" class="mt-1 whitespace-pre-line italic text-on-surface-variant">
                        {{ p.deskripsiEn }}
                      </div>
                    </td>
                    <td class="p-3 whitespace-pre-line">
                      {{ p.profesi || '-' }}
                    </td>
                    <td class="p-3">
                      <div class="flex justify-center gap-1">
                        <button v-if="canUpdate" type="button" :class="[btnAksi, 'bg-[#eda100]']" title="Ubah" @click="mulaiPl(p)">
                          <span class="material-symbols-outlined" style="font-size: 16px">edit</span>
                        </button>
                        <button v-if="canDelete" type="button" :class="[btnAksi, 'bg-[#d83b3b]']" title="Hapus" @click="hapus('pl', p)">
                          <span class="material-symbols-outlined" style="font-size: 16px">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </section>

          <!-- Manajemen CPL (CPL induk + Indikator Kinerja di bawahnya) -->
          <section v-else-if="menu === 'cpl'" class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-x-auto">
            <table class="w-full text-body-sm border-collapse">
              <thead class="bg-primary text-on-primary">
                <tr>
                  <th class="p-3 text-left w-36">Kode CPL</th>
                  <th class="p-3 text-left">Deskripsi CPL</th>
                  <th class="p-3 text-left w-56">Kategori</th>
                  <th class="p-3 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant align-top">
                <tr v-if="cplError">
                  <td colspan="4" class="px-3 py-2 bg-error-container text-on-error-container text-body-sm">
                    {{ cplError }}
                  </td>
                </tr>
                <tr v-if="cplEditing === 'new'" class="bg-primary-container/20">
                  <td class="p-2">
                    <div class="flex items-start gap-1">
                      <input v-model="cplDraft.kode" :class="inputCls" :placeholder="'Kode CPL'" maxlength="20" />
                    </div>
                  </td>
                  <td class="p-2 space-y-2">
                    <textarea v-model="cplDraft.deskripsi" :class="inputCls" rows="3" placeholder="Bahasa Indonesia (Wajib)" />
                    <textarea v-model="cplDraft.deskripsiEn" :class="inputCls" rows="3" placeholder="Bahasa Inggris (Optional)" />
                  </td>
                  <td class="p-2">
                    <SelectInput v-model="cplDraft.aspek" placeholder="-- Pilih Kategori --" :options="ASPEK_OPTIONS" />
                  </td>
                  <td class="p-2">
                    <div class="flex justify-center gap-1">
                      <button type="button" :class="[btnAksi, 'bg-[#2e7d5b]']" title="Simpan" :disabled="cplSaving" @click="simpanCpl">
                        <span class="material-symbols-outlined" style="font-size: 16px">save</span>
                      </button>
                      <button type="button" :class="[btnAksi, 'bg-[#eda100]']" title="Reset isian" @click="resetCpl">
                        <span class="material-symbols-outlined" style="font-size: 16px">refresh</span>
                      </button>
                      <button type="button" :class="[btnAksi, 'bg-[#5b6472]']" title="Batal" @click="batalCpl">
                        <span class="material-symbols-outlined" style="font-size: 16px">close</span>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!cplInduk.length && cplEditing !== 'new'">
                  <td colspan="4" class="p-6 text-center text-on-surface-variant">Belum ada CPL. Klik Tambah Data atau Salin Data.</td>
                </tr>
                <template v-for="c in cplInduk" :key="c.id">
                  <tr v-if="cplEditing === c.id" class="bg-primary-container/20">
                    <td class="p-2">
                      <div class="flex items-start gap-1">
                        <input v-model="cplDraft.kode" :class="inputCls" :placeholder="'Kode CPL'" maxlength="20" />
                      </div>
                    </td>
                    <td class="p-2 space-y-2">
                      <textarea v-model="cplDraft.deskripsi" :class="inputCls" rows="3" placeholder="Bahasa Indonesia (Wajib)" />
                      <textarea v-model="cplDraft.deskripsiEn" :class="inputCls" rows="3" placeholder="Bahasa Inggris (Optional)" />
                    </td>
                    <td class="p-2">
                      <SelectInput v-model="cplDraft.aspek" placeholder="-- Pilih Kategori --" :options="ASPEK_OPTIONS" />
                    </td>
                    <td class="p-2">
                      <div class="flex justify-center gap-1">
                        <button type="button" :class="[btnAksi, 'bg-[#2e7d5b]']" title="Simpan" :disabled="cplSaving" @click="simpanCpl">
                          <span class="material-symbols-outlined" style="font-size: 16px">save</span>
                        </button>
                        <button type="button" :class="[btnAksi, 'bg-[#eda100]']" title="Reset isian" @click="resetCpl">
                          <span class="material-symbols-outlined" style="font-size: 16px">refresh</span>
                        </button>
                        <button type="button" :class="[btnAksi, 'bg-[#5b6472]']" title="Batal" @click="batalCpl">
                          <span class="material-symbols-outlined" style="font-size: 16px">close</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-else class="bg-surface-container-low/60">
                    <td class="p-3 font-medium whitespace-nowrap">
                      {{ c.kode }}
                    </td>
                    <td class="p-3">
                      <div class="whitespace-pre-line">{{ c.deskripsi }}</div>
                      <div v-if="c.deskripsiEn" class="mt-1 whitespace-pre-line italic text-on-surface-variant">
                        {{ c.deskripsiEn }}
                      </div>
                    </td>
                    <td class="p-3">
                      {{ c.aspek ? ASPEK_LABEL[c.aspek] : '' }}
                    </td>
                    <td class="p-3">
                      <div class="flex justify-center gap-1">
                        <button v-if="canUpdate" type="button" :class="[btnAksi, 'bg-[#eda100]']" title="Ubah" @click="mulaiCpl(c)">
                          <span class="material-symbols-outlined" style="font-size: 16px">edit</span>
                        </button>
                        <button
                          v-if="canCreate"
                          type="button"
                          :class="[btnAksi, 'bg-[#2e7d5b]']"
                          title="Tambah indikator kinerja"
                          @click="mulaiCpl({ indukId: c.id })"
                        >
                          <span class="material-symbols-outlined" style="font-size: 16px">add</span>
                        </button>
                        <button
                          v-if="canDelete"
                          type="button"
                          :class="[btnAksi, 'bg-[#d83b3b]']"
                          title="Hapus (indikator ikut terhapus)"
                          @click="hapus('cpl', c)"
                        >
                          <span class="material-symbols-outlined" style="font-size: 16px">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <template v-for="ik in indikatorOf(c.id)" :key="ik.id">
                    <tr v-if="cplEditing === ik.id" class="bg-primary-container/20">
                      <td class="p-2">
                        <div class="flex items-start gap-1">
                          <span class="material-symbols-outlined text-on-surface-variant mt-1" style="font-size: 16px">subdirectory_arrow_right</span>
                          <input v-model="cplDraft.kode" :class="inputCls" :placeholder="'Kode IK'" maxlength="20" />
                        </div>
                      </td>
                      <td class="p-2 space-y-2">
                        <textarea v-model="cplDraft.deskripsi" :class="inputCls" rows="3" placeholder="Bahasa Indonesia (Wajib)" />
                        <textarea v-model="cplDraft.deskripsiEn" :class="inputCls" rows="3" placeholder="Bahasa Inggris (Optional)" />
                      </td>
                      <td class="p-2">
                        <SelectInput v-model="cplDraft.aspek" placeholder="-- Pilih Kategori --" :options="ASPEK_OPTIONS" />
                      </td>
                      <td class="p-2">
                        <div class="flex justify-center gap-1">
                          <button type="button" :class="[btnAksi, 'bg-[#2e7d5b]']" title="Simpan" :disabled="cplSaving" @click="simpanCpl">
                            <span class="material-symbols-outlined" style="font-size: 16px">save</span>
                          </button>
                          <button type="button" :class="[btnAksi, 'bg-[#eda100]']" title="Reset isian" @click="resetCpl">
                            <span class="material-symbols-outlined" style="font-size: 16px">refresh</span>
                          </button>
                          <button type="button" :class="[btnAksi, 'bg-[#5b6472]']" title="Batal" @click="batalCpl">
                            <span class="material-symbols-outlined" style="font-size: 16px">close</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-else>
                      <td class="p-3 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1 pl-3">
                          <span class="material-symbols-outlined text-on-surface-variant" style="font-size: 16px">subdirectory_arrow_right</span>
                          {{ ik.kode }}
                        </span>
                      </td>
                      <td class="p-3">
                        <div class="whitespace-pre-line">
                          {{ ik.deskripsi }}
                        </div>
                        <div v-if="ik.deskripsiEn" class="mt-1 whitespace-pre-line italic text-on-surface-variant">
                          {{ ik.deskripsiEn }}
                        </div>
                      </td>
                      <td class="p-3">
                        {{ ik.aspek ? ASPEK_LABEL[ik.aspek] : '' }}
                      </td>
                      <td class="p-3">
                        <div class="flex justify-center gap-1">
                          <button v-if="canUpdate" type="button" :class="[btnAksi, 'bg-[#eda100]']" title="Ubah" @click="mulaiCpl(ik)">
                            <span class="material-symbols-outlined" style="font-size: 16px">edit</span>
                          </button>
                          <button v-if="canDelete" type="button" :class="[btnAksi, 'bg-[#d83b3b]']" title="Hapus" @click="hapus('cpl', ik)">
                            <span class="material-symbols-outlined" style="font-size: 16px">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </template>
                  <tr v-if="isTambahIk(c.id)" class="bg-primary-container/20">
                    <td class="p-2">
                      <div class="flex items-start gap-1">
                        <span class="material-symbols-outlined text-on-surface-variant mt-1" style="font-size: 16px">subdirectory_arrow_right</span>
                        <input v-model="cplDraft.kode" :class="inputCls" :placeholder="'Kode IK'" maxlength="20" />
                      </div>
                    </td>
                    <td class="p-2 space-y-2">
                      <textarea v-model="cplDraft.deskripsi" :class="inputCls" rows="3" placeholder="Bahasa Indonesia (Wajib)" />
                      <textarea v-model="cplDraft.deskripsiEn" :class="inputCls" rows="3" placeholder="Bahasa Inggris (Optional)" />
                    </td>
                    <td class="p-2">
                      <SelectInput v-model="cplDraft.aspek" placeholder="-- Pilih Kategori --" :options="ASPEK_OPTIONS" />
                    </td>
                    <td class="p-2">
                      <div class="flex justify-center gap-1">
                        <button type="button" :class="[btnAksi, 'bg-[#2e7d5b]']" title="Simpan" :disabled="cplSaving" @click="simpanCpl">
                          <span class="material-symbols-outlined" style="font-size: 16px">save</span>
                        </button>
                        <button type="button" :class="[btnAksi, 'bg-[#eda100]']" title="Reset isian" @click="resetCpl">
                          <span class="material-symbols-outlined" style="font-size: 16px">refresh</span>
                        </button>
                        <button type="button" :class="[btnAksi, 'bg-[#5b6472]']" title="Batal" @click="batalCpl">
                          <span class="material-symbols-outlined" style="font-size: 16px">close</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </section>

          <!-- Pemetaan PL → CPL -->
          <section v-else-if="menu === 'pl-cpl'" class="space-y-4">
            <!-- Metode pembobotan -->
            <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div class="flex-1 text-body-sm">
                <p class="font-medium mb-1">Pilih Metode Pembobotan</p>
                <ul class="list-disc pl-5 text-on-surface-variant">
                  <li>
                    <span class="font-medium text-on-surface">Manual:</span>
                    Tentukan bobot secara mandiri pada kolom yang tersedia.
                  </li>
                  <li>
                    <span class="font-medium text-on-surface">Otomatis (Rata):</span>
                    Cukup centang, bobot akan dibagi rata otomatis ke setiap CPL.
                  </li>
                </ul>
              </div>
              <div class="w-full sm:w-52">
                <SelectInput :model-value="metodeBobot" :options="METODE_OPTIONS" :clearable="false" :disabled="!canUpdate" @update:model-value="gantiMetode" />
              </div>
            </div>

            <div class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
              <div v-if="!data.profilLulusan.length || !cplInduk.length" class="p-6 text-center text-body-sm text-on-surface-variant">
                Isi Profil Lulusan dan CPL terlebih dahulu.
              </div>
              <div v-else class="overflow-auto max-h-[65vh]">
                <table class="w-full text-body-sm border-collapse">
                  <thead class="bg-primary text-on-primary sticky top-0 z-10">
                    <tr>
                      <th rowspan="2" class="p-3 text-left w-24 sticky left-0 bg-primary">Kode PL</th>
                      <th rowspan="2" class="p-3 text-left min-w-56">Profil Lulusan</th>
                      <th :colspan="cplInduk.length" class="p-2 text-center border-l border-on-primary/30">Pemetaan PL → CPL</th>
                      <th rowspan="2" class="p-3 text-center w-20 border-l border-on-primary/30">Total</th>
                    </tr>
                    <tr>
                      <th v-for="c in cplInduk" :key="c.id" class="p-2 text-center min-w-20 border-l border-t border-on-primary/30" :title="c.deskripsi">
                        {{ c.kode }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-outline-variant">
                    <tr v-for="p in data.profilLulusan" :key="p.id">
                      <td class="p-3 sticky left-0 bg-surface-container-lowest">
                        {{ p.kode }}
                      </td>
                      <td class="p-3" :title="p.deskripsi">{{ p.nama }}</td>
                      <td v-for="c in cplInduk" :key="c.id" class="p-2 text-center border-l border-outline-variant">
                        <div v-if="metodeBobot === 'MANUAL'" class="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            class="w-20 px-2 py-1 border border-outline-variant rounded text-right bg-surface-container-lowest"
                            :value="plCplBobot[`${p.id}|${c.id}`] ?? ''"
                            :disabled="!canUpdate"
                            @input="isiBobot(p.id, c.id, $event.target as HTMLInputElement)"
                          />
                          <span class="text-on-surface-variant">%</span>
                        </div>
                        <label v-else class="inline-flex flex-col items-center gap-0.5 cursor-pointer">
                          <input
                            type="checkbox"
                            class="h-4 w-4"
                            :checked="`${p.id}|${c.id}` in plCplBobot"
                            :disabled="!canUpdate"
                            @change="togglePlCpl(p.id, c.id)"
                          />
                          <span v-if="`${p.id}|${c.id}` in plCplBobot" class="text-label-sm text-on-surface-variant">{{ labelBobot(`${p.id}|${c.id}`) }}</span>
                        </label>
                      </td>
                      <td
                        class="p-3 text-center font-medium border-l border-outline-variant"
                        :class="totalBobot(p.id) === 100 ? 'text-[#2e7d5b]' : totalBobot(p.id) > 0 ? 'text-error' : 'text-on-surface-variant'"
                      >
                        {{ totalBobot(p.id) }}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- Pemetaan CPL → MK -->
          <section v-else class="space-y-4">
            <!-- Level pemetaan -->
            <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div class="flex-1 text-body-sm">
                <p class="font-medium mb-1">Pilih Level Pemetaan</p>
                <ul class="list-disc pl-5 text-on-surface-variant">
                  <li>
                    <span class="font-medium text-on-surface">Capaian Pembelajaran Lulusan (CPL):</span>
                    Anda bisa melakukan pemetaan sampai level CPL saja.
                  </li>
                  <li>
                    <span class="font-medium text-on-surface">Indikator Kinerja (IK):</span>
                    Anda bisa melakukan pemetaan sampai level Indikator Kinerja.
                  </li>
                </ul>
              </div>
              <div class="w-full sm:w-52">
                <SelectInput :model-value="levelCplMk" :options="LEVEL_OPTIONS" :clearable="false" :disabled="!canUpdate" @update:model-value="gantiLevel" />
              </div>
            </div>

            <div class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
              <div class="px-4 py-3 border-b border-outline-variant flex flex-wrap items-center gap-4 text-body-sm text-on-surface-variant">
                <span>Terisi {{ data.kurikulum.cplMkPersen }}% CPL.</span>
                <label class="flex items-center gap-2 cursor-pointer text-on-surface">
                  <input v-model="mkOnlyObe" type="checkbox" class="h-4 w-4" />
                  Hanya MK OBE
                </label>
              </div>
              <div v-if="!cplInduk.length" class="p-6 text-center text-body-sm text-on-surface-variant">Isi CPL terlebih dahulu.</div>
              <div v-else class="overflow-auto max-h-[65vh]">
                <table class="w-full text-body-sm border-collapse">
                  <thead class="bg-primary text-on-primary sticky top-0 z-10">
                    <tr>
                      <th :rowspan="levelCplMk === 'IK' ? 3 : 2" class="p-3 text-left w-28 sticky left-0 bg-primary">Kode MK</th>
                      <th :rowspan="levelCplMk === 'IK' ? 3 : 2" class="p-3 text-left min-w-56">Mata Kuliah</th>
                      <th :colspan="kolomCplMk.length" class="p-2 text-center border-l border-on-primary/30">Pemetaan CPL → MK</th>
                    </tr>
                    <!-- Level CPL: satu baris kode CPL. Level IK: CPL (colspan jumlah IK) lalu baris kode IK. -->
                    <tr>
                      <th
                        v-for="c in cplInduk"
                        :key="c.id"
                        :colspan="levelCplMk === 'IK' ? Math.max(indikatorOf(c.id).length, 1) : 1"
                        :rowspan="levelCplMk === 'IK' && !indikatorOf(c.id).length ? 2 : 1"
                        class="p-2 text-center min-w-16 border-l border-t border-on-primary/30"
                        :title="c.deskripsi"
                      >
                        {{ c.kode }}
                      </th>
                    </tr>
                    <tr v-if="levelCplMk === 'IK'">
                      <template v-for="c in cplInduk" :key="c.id">
                        <th
                          v-for="ik in indikatorOf(c.id)"
                          :key="ik.id"
                          class="p-2 text-center min-w-16 border-l border-t border-on-primary/30 text-label-sm"
                          :title="ik.deskripsi"
                        >
                          {{ ik.kode }}
                        </th>
                      </template>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-outline-variant">
                    <tr v-if="!mkTampil.length">
                      <td :colspan="kolomCplMk.length + 2" class="p-6 text-center text-on-surface-variant">Tidak ada mata kuliah</td>
                    </tr>
                    <tr v-for="m in mkTampil" :key="m.id">
                      <td class="p-3 sticky left-0 bg-surface-container-lowest">{{ m.kode }}</td>
                      <td class="p-3">
                        {{ m.mataKuliah }}
                        <span v-if="m.isObe" class="ml-1 text-label-sm text-primary">(OBE)</span>
                      </td>
                      <td v-for="k in kolomCplMk" :key="k.id" class="p-2 text-center border-l border-outline-variant">
                        <input
                          type="checkbox"
                          class="h-4 w-4"
                          :checked="cplMkSet.has(`${k.id}|${m.id}`)"
                          :disabled="!canUpdate"
                          @change="toggleCplMk(k.id, m.id)"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </template>
        <div v-else-if="!error" class="p-8 text-center text-body-sm text-on-surface-variant">Memuat data...</div>
      </div>
    </div>

    <!-- Salin data -->
    <Modal v-model="salinOpen" :title="`Salin ${menuData === 'cpl' ? 'CPL' : 'Profil Lulusan'}`" size="md">
      <div class="space-y-3">
        <p class="text-body-sm text-on-surface-variant">
          Salin {{ menuData === 'cpl' ? 'CPL' : 'profil lulusan' }} dari kurikulum lain ke
          <strong>{{ data?.kurikulum.nama }}</strong>
          . Kode yang sudah ada dilewati; pemetaan tidak ikut disalin.
        </p>
        <SearchableSelect v-model="salinDari" label="Salin dari kurikulum" placeholder="-- Pilih kurikulum sumber --" :options="salinOptions" />
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="salinOpen = false">Batal</AppButton>
        <AppButton :disabled="menyalin || !salinDari" @click="salin">{{ menyalin ? 'Menyalin...' : 'Salin' }}</AppButton>
      </template>
    </Modal>
  </div>
</template>

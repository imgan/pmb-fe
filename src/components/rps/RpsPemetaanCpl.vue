<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import { useRpsApi, type RpsCpl, type RpsDetail } from '@/api/rps';
import { extractErrorMessage } from '@/api/http';
import { toastError, toastSuccess } from '@/utils/swal';
import { useRoute } from 'vue-router';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';

// Klien RPS sesuai portal (Prodi / Dosen) dari halaman RPS.
const rpsApi = useRpsApi();

/**
 * Menu "Pemetaan CPL": CPL kurikulum yang dibebankan ke mata kuliah ini (tabel cpl_mata_kuliah yang sama
 * dengan Manajemen Capaian → Pemetaan CPL → MK). Level IK: centang per Indikator Kinerja; CPL tanpa IK
 * dicentang langsung.
 */
const props = defineProps<{ mkId: number; detail: RpsDetail; canUpdate: boolean }>();
// Master CPL (tambah / ubah / hapus, kategori, IK) milik kurikulum — dikelola di Prodi → Manajemen Capaian.
const route = useRoute();
const portalDosen = route.meta.portal === 'dosen';
const { canRead: bisaKelolaCpl } = usePermission(MENU.PRODI_MANAJEMEN_CAPAIAN_MANAGEMENT);
const kelolaCpl = computed(() =>
  !portalDosen && bisaKelolaCpl.value && props.detail.mataKuliah.kurikulumId
    ? { name: 'prodi-manajemen-capaian-detail', params: { id: props.detail.mataKuliah.kurikulumId }, query: { menu: 'cpl' } }
    : null,
);
const emit = defineEmits<{ reload: [] }>();

const ASPEK_LABEL: Record<string, string> = {
  SIKAP: 'Sikap',
  PENGETAHUAN: 'Pengetahuan',
  KETERAMPILAN_UMUM: 'Keterampilan Umum',
  KETERAMPILAN_KHUSUS: 'Keterampilan Khusus',
};
const levelIk = computed(() => props.detail.mataKuliah.levelPemetaanCplMk === 'IK');
const cplInduk = computed(() => props.detail.cpl.filter((c) => !c.parentId));
const ikOf = (id: number) => props.detail.cpl.filter((c) => c.parentId === id);
/** CPL induk bisa dicentang langsung bila level CPL atau CPL tsb tidak punya IK. */
const indukBisaDicentang = (c: RpsCpl) => !levelIk.value || !ikOf(c.id).length;

const draft = ref(new Set<number>());
const dirty = ref(false);
const reset = () => {
  draft.value = new Set(props.detail.cplIds);
  dirty.value = false;
};
watch(() => props.detail, reset, { immediate: true });

const toggle = (id: number) => {
  const next = new Set(draft.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  draft.value = next;
  dirty.value = true;
};

const saving = ref(false);
const simpan = async () => {
  saving.value = true;
  try {
    await rpsApi.saveCpl(props.mkId, [...draft.value]);
    toastSuccess('Pemetaan CPL disimpan');
    emit('reload');
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal menyimpan pemetaan CPL'));
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Teleport v-if="canUpdate" defer to="#rps-aksi">
    <AppButton icon="save" :disabled="saving || !dirty" @click="simpan">{{ saving ? 'Menyimpan...' : 'Simpan Data' }}</AppButton>
    <AppButton variant="secondary" icon="refresh" :disabled="saving || !dirty" @click="reset">Batalkan</AppButton>
  </Teleport>

  <section class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
    <div class="px-4 py-3 border-b border-outline-variant flex flex-col md:flex-row md:items-center gap-3 text-body-sm text-on-surface-variant">
      <p class="flex-1">
        Centang {{ levelIk ? 'Indikator Kinerja (IK) / CPL' : 'CPL' }} yang dibebankan ke mata kuliah ini, lalu klik Simpan Data.
        <span v-if="levelIk">Level pemetaan kurikulum ini: Indikator Kinerja.</span>
        <span class="block mt-1">
          Daftar CPL milik <strong>kurikulum</strong> (dipakai semua mata kuliahnya), jadi tambah / ubah / hapus CPL &amp; kategorinya dilakukan di
          <strong>Prodi → Kurikulum → Manajemen Capaian → Manajemen CPL</strong>.
          <template v-if="portalDosen">Hubungi prodi bila perlu menambah atau mengubah CPL.</template>
        </span>
      </p>
      <RouterLink
        v-if="kelolaCpl"
        :to="kelolaCpl"
        class="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-primary text-primary text-label-md font-medium hover:bg-primary-container"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">edit_note</span>
        Kelola CPL (Tambah / Ubah)
      </RouterLink>
    </div>
    <div v-if="!cplInduk.length" class="p-6 text-center text-body-sm text-on-surface-variant">
      Kurikulum ini belum memiliki CPL.<template v-if="kelolaCpl"> Klik <strong>Kelola CPL</strong> untuk menambahkan.</template>
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-body-sm border-collapse">
        <thead class="bg-primary text-on-primary">
          <tr>
            <th class="p-3 w-12 text-center">Pilih</th>
            <th class="p-3 text-left w-28">Kode CPL</th>
            <th class="p-3 text-left">Deskripsi CPL</th>
            <th class="p-3 text-left w-48">Kategori</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          <template v-for="c in cplInduk" :key="c.id">
            <tr :class="indukBisaDicentang(c) ? '' : 'bg-surface-container-low/60'">
              <td class="p-3 text-center">
                <input
                  v-if="indukBisaDicentang(c)"
                  type="checkbox"
                  class="h-4 w-4"
                  :checked="draft.has(c.id)"
                  :disabled="!canUpdate"
                  @change="toggle(c.id)"
                />
              </td>
              <td class="p-3 font-medium whitespace-nowrap">{{ c.kode }}</td>
              <td class="p-3 whitespace-pre-line">{{ c.deskripsi }}</td>
              <td class="p-3">{{ c.aspek ? ASPEK_LABEL[c.aspek] : '' }}</td>
            </tr>
            <template v-if="levelIk">
              <tr v-for="ik in ikOf(c.id)" :key="ik.id">
                <td class="p-3 text-center">
                  <input type="checkbox" class="h-4 w-4" :checked="draft.has(ik.id)" :disabled="!canUpdate" @change="toggle(ik.id)" />
                </td>
                <td class="p-3 whitespace-nowrap">
                  <span class="inline-flex items-center gap-1 pl-3">
                    <span class="material-symbols-outlined text-on-surface-variant" style="font-size: 16px">subdirectory_arrow_right</span>
                    {{ ik.kode }}
                  </span>
                </td>
                <td class="p-3 whitespace-pre-line">{{ ik.deskripsi }}</td>
                <td class="p-3">{{ ik.aspek ? ASPEK_LABEL[ik.aspek] : '' }}</td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>

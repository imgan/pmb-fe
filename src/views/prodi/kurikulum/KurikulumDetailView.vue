<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import MataKuliahPanel from '@/components/kurikulum/MataKuliahPanel.vue';
import { kurikulumApi } from '@/api/kurikulum';
import { extractErrorMessage } from '@/api/http';
import { usePermission } from '@/composables/usePermission';
import { MENU } from '@/constants/menuCodes';
import { formatDate } from '@/utils/format';
import type { Kurikulum } from '@/types/entities';

/** Detail satu kurikulum: info header + daftar & CRUD mata kuliahnya. */
const props = defineProps<{ id: string }>();
const { canCreate, canUpdate, canDelete } = usePermission(MENU.PRODI_KURIKULUM_MANAGEMENT);

const kurikulum = ref<Kurikulum | null>(null);
const error = ref<string | null>(null);

const load = async () => {
  try {
    kurikulum.value = await kurikulumApi.get(props.id);
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat kurikulum');
  }
};
onMounted(load);
</script>

<template>
  <div>
    <PageHeader
      :title="kurikulum?.nama ?? 'Detail Kurikulum'"
      subtitle="Mata kuliah yang termasuk dalam kurikulum ini."
      :back-to="{ name: 'prodi-kurikulum' }"
      back-label="Kembali ke Master Kurikulum"
    />

    <div v-if="error" class="mb-4 px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>

    <template v-if="kurikulum">
      <section class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
          <p class="text-label-sm text-on-surface-variant">Prodi</p>
          <p class="font-semibold text-on-surface">{{ kurikulum.jurusan?.namaJurusan ?? '-' }}</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
          <p class="text-label-sm text-on-surface-variant">Tahun Kurikulum</p>
          <p class="font-semibold text-on-surface">{{ kurikulum.tahunKurikulum ?? '-' }}</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
          <p class="text-label-sm text-on-surface-variant">Masa Efektif</p>
          <p class="font-semibold text-on-surface text-body-sm">
            {{ kurikulum.tanggalMulaiEfektif ? formatDate(kurikulum.tanggalMulaiEfektif) : '-' }} –
            {{ kurikulum.tanggalAkhirEfektif ? formatDate(kurikulum.tanggalAkhirEfektif) : 'sekarang' }}
          </p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
          <p class="text-label-sm text-on-surface-variant">Mata Kuliah / SKS</p>
          <p class="font-semibold text-on-surface">{{ kurikulum.jumlahMataKuliah ?? 0 }} MK · {{ kurikulum.totalSks ?? 0 }} SKS</p>
          <p class="text-label-sm text-on-surface-variant">OBE {{ kurikulum.jumlahObe ?? 0 }} · Non OBE {{ kurikulum.jumlahNonObe ?? 0 }}</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
          <p class="text-label-sm text-on-surface-variant">Status</p>
          <StatusBadge :label="kurikulum.isActive ? 'Aktif' : 'Nonaktif'" :variant="kurikulum.isActive ? 'success' : 'neutral'" />
        </div>
      </section>

      <MataKuliahPanel :kurikulum="kurikulum" :can-create="canCreate" :can-update="canUpdate" :can-delete="canDelete" @changed="load" />
    </template>
  </div>
</template>

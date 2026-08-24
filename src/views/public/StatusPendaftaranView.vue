<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import PublicHeader from '@/components/public/PublicHeader.vue';
import PublicFooter from '@/components/public/PublicFooter.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import StepProgress, { type ProgressStep } from '@/components/ui/StepProgress.vue';
import { usePesertaAuthStore } from '@/stores/pesertaAuth';
import { pesertaAuthApi } from '@/api/pesertaAuth';
import { extractErrorMessage } from '@/api/http';
import type { PesertaDokumenStatus } from '@/types/entities';

const pesertaAuthStore = usePesertaAuthStore();
const router = useRouter();

const loading = ref(true);
const loadError = ref<string | null>(null);
const dokumenList = ref<PesertaDokumenStatus[]>([]);

const load = async () => {
  loading.value = true;
  loadError.value = null;
  try {
    await pesertaAuthStore.refreshProfile();
    dokumenList.value = await pesertaAuthApi.listMyDokumen();
  } catch (err) {
    loadError.value = extractErrorMessage(err, 'Gagal memuat status pendaftaran');
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const dokumenWajib = computed(() => dokumenList.value.filter((d) => d.isWajib));
const dokumenWajibTerupload = computed(() => dokumenWajib.value.filter((d) => d.upload));
const kelengkapanDone = computed(
  () => dokumenWajib.value.length > 0 && dokumenWajibTerupload.value.length === dokumenWajib.value.length
);

const steps = computed<ProgressStep[]>(() => {
  const peserta = pesertaAuthStore.peserta;

  const kelengkapanState: ProgressStep['state'] = kelengkapanDone.value ? 'done' : 'active';

  const ujianState: ProgressStep['state'] =
    peserta?.statusUjian === 'lulus' ? 'done' : peserta?.statusUjian === 'tidak_lulus' ? 'danger' : 'active';

  const pengumumanState: ProgressStep['state'] =
    peserta?.statusKelulusan === 'diterima' ? 'success' : peserta?.statusKelulusan === 'ditolak' ? 'danger' : 'active';

  return [
    { key: 'pendaftaran', label: 'Pendaftaran', state: 'done', icon: 'check' },
    {
      key: 'kelengkapan',
      label: 'Kelengkapan Dokumen',
      state: kelengkapanState,
      icon: kelengkapanState === 'done' ? 'check' : 'more_horiz',
      hint: `${dokumenWajibTerupload.value.length}/${dokumenWajib.value.length} wajib`,
    },
    {
      key: 'ujian',
      label: 'Ujian',
      state: ujianState,
      icon: ujianState === 'done' ? 'check' : ujianState === 'danger' ? 'close' : 'hourglass_empty',
    },
    {
      key: 'pengumuman',
      label: 'Pengumuman Kelulusan',
      state: pengumumanState,
      icon: pengumumanState === 'success' ? 'check' : pengumumanState === 'danger' ? 'close' : 'hourglass_empty',
    },
  ];
});

const summary = computed(() => {
  const peserta = pesertaAuthStore.peserta;
  if (peserta?.statusKelulusan === 'diterima') return { label: 'Lulus', variant: 'success' as const };
  if (peserta?.statusKelulusan === 'ditolak') return { label: 'Ditolak', variant: 'danger' as const };
  return { label: 'Sedang Proses', variant: 'warning' as const };
});

const handleLogout = () => {
  pesertaAuthStore.logout();
  router.push('/');
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <PublicHeader />

    <main class="flex-1 w-full max-w-3xl mx-auto px-4 md:px-12 py-12 md:py-16">
      <div class="text-center mb-10">
        <h1 class="text-headline-lg-mobile md:text-headline-lg font-semibold text-primary mb-3">Status Pendaftaran</h1>
        <p class="text-body-md text-on-surface-variant max-w-xl mx-auto">
          Pantau progres pendaftaran PMB Anda dari tahap ke tahap.
        </p>
      </div>

      <div v-if="loading" class="text-center py-16 text-on-surface-variant">Memuat data...</div>
      <div v-else-if="loadError" class="px-3 py-2 rounded-md bg-error-container text-on-error-container text-body-sm">
        {{ loadError }}
      </div>

      <div v-else class="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8">
        <div class="flex items-center justify-between mb-6">
          <p class="text-label-sm text-on-surface-variant">Progress Pendaftaran</p>
          <StatusBadge :label="summary.label" :variant="summary.variant" />
        </div>

        <StepProgress :steps="steps" />

        <div v-if="!kelengkapanDone" class="mt-8 px-4 py-3 rounded-lg bg-warning-container text-on-warning-container text-body-sm">
          Lengkapi dokumen wajib Anda untuk melanjutkan proses seleksi.
          <RouterLink to="/pendaftaran/dokumen" class="font-semibold underline hover:no-underline">Upload sekarang</RouterLink>
        </div>
      </div>

      <p class="text-center mt-8">
        <button type="button" class="text-body-sm text-on-surface-variant hover:text-error transition-colors" @click="handleLogout">
          Keluar dari akun
        </button>
      </p>
    </main>

    <PublicFooter />
  </div>
</template>

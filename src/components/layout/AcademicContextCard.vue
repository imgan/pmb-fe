<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import AppButton from '@/components/ui/AppButton.vue';
import SelectInput from '@/components/ui/SelectInput.vue';
import { authApi } from '@/api/auth';
import { extractErrorMessage } from '@/api/http';
import { useAuthStore, PRODI_ALL_ROLES } from '@/stores/auth';
import { toastError } from '@/utils/swal';
import type { ProdiOption, TahunAkademikOption } from '@/types/entities';

// Kartu konteks sesi di sidebar: tahun akademik acuan (dipilih saat login) dan — di modul Prodi —
// prodi yang sedang dibuka. Bisa diganti tanpa login ulang untuk melihat data tahun lalu.
const props = withDefaults(defineProps<{ showProdi?: boolean }>(), { showProdi: false });

const authStore = useAuthStore();
const context = computed(() => authStore.context);
const canChangeProdi = computed(
  () => props.showProdi && !authStore.isProdiScoped && PRODI_ALL_ROLES.includes(authStore.user?.role?.code ?? '')
);

const open = ref(false);
const loading = ref(false);
const tahunOptions = ref<TahunAkademikOption[]>([]);
const prodiOptions = ref<ProdiOption[]>([]);
const tahunAjaranId = ref<number | ''>('');
const kodeProdi = ref('');

const openSwitcher = async () => {
  open.value = true;
  tahunAjaranId.value = context.value.tahunAkademik?.id ?? '';
  kodeProdi.value = context.value.prodi?.kodeProdi ?? '';
  if (tahunOptions.value.length) return;
  loading.value = true;
  try {
    const options = await authApi.loginOptions();
    tahunOptions.value = options.tahunAkademik;
    prodiOptions.value = options.prodi;
  } catch (err) {
    toastError(extractErrorMessage(err, 'Gagal memuat pilihan tahun akademik'));
  } finally {
    loading.value = false;
  }
};

const apply = () => {
  const tahunAkademik = tahunOptions.value.find((t) => t.id === tahunAjaranId.value) ?? null;
  const prodi = canChangeProdi.value
    ? (prodiOptions.value.find((p) => p.kodeProdi === kodeProdi.value) ?? null)
    : context.value.prodi;
  authStore.setContext({ tahunAkademik, prodi });
  // Muat ulang supaya semua halaman & filter memakai konteks baru.
  window.location.reload();
};
</script>

<template>
  <div class="mb-3 p-3 rounded-lg bg-surface-container border border-outline-variant text-label-sm">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 space-y-1">
        <p class="text-on-surface-variant">Tahun Akademik</p>
        <p class="font-semibold text-on-surface truncate">{{ context.tahunAkademik?.label ?? 'Belum dipilih' }}</p>
        <template v-if="showProdi">
          <p class="text-on-surface-variant pt-1">Prodi</p>
          <p class="font-semibold text-on-surface truncate">{{ context.prodi?.nama ?? 'Semua Prodi' }}</p>
        </template>
      </div>
      <button
        type="button"
        class="shrink-0 text-primary hover:opacity-80"
        title="Ganti tahun akademik"
        @click="openSwitcher"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">swap_horiz</span>
      </button>
    </div>

    <Modal v-model="open" title="Ganti Konteks" subtitle="Pilih tahun akademik acuan untuk melihat data tahun tersebut.">
      <div v-if="loading" class="py-6 text-center text-body-sm text-on-surface-variant">Memuat...</div>
      <div v-else class="space-y-4">
        <SelectInput
          v-model="tahunAjaranId"
          label="Tahun Akademik"
          placeholder="-- Pilih Tahun --"
          :options="tahunOptions.map((t) => ({ value: t.id, label: `${t.label}${t.isActive ? ' (aktif)' : ''}` }))"
        />
        <SelectInput
          v-if="canChangeProdi"
          v-model="kodeProdi"
          label="Prodi"
          placeholder="Semua Prodi"
          :options="prodiOptions.map((p) => ({ value: p.kodeProdi, label: p.nama }))"
        />
        <p v-else-if="showProdi" class="text-body-sm text-on-surface-variant">
          Akun Anda terkunci ke prodi {{ context.prodi?.nama ?? '-' }}.
        </p>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="open = false">Batal</AppButton>
        <AppButton :disabled="loading || !tahunAjaranId" @click="apply">Terapkan</AppButton>
      </template>
    </Modal>
  </div>
</template>

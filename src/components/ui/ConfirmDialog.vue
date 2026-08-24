<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    loading?: boolean;
  }>(),
  { confirmLabel: 'Hapus', loading: false }
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-inverse-surface/50" @click="emit('cancel')" />
        <div
          class="relative z-10 w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0px_8px_24px_rgba(27,54,93,0.15)] p-6"
        >
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-error shrink-0" style="font-size: 28px">warning</span>
            <div>
              <h3 class="font-semibold text-headline-md text-on-surface">{{ title }}</h3>
              <p class="mt-2 text-body-sm text-on-surface-variant">{{ message }}</p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              class="px-4 py-2 rounded-md border border-primary text-primary font-medium text-label-md hover:bg-surface-container transition-colors disabled:opacity-60"
              :disabled="loading"
              @click="emit('cancel')"
            >
              Batal
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md bg-error text-on-error font-medium text-label-md hover:opacity-90 transition-opacity disabled:opacity-60"
              :disabled="loading"
              @click="emit('confirm')"
            >
              {{ loading ? 'Menghapus...' : confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>

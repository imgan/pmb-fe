<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    size?: 'md' | 'lg' | 'xl' | '2xl';
  }>(),
  { size: 'md' }
);

const maxWidthClass = computed(() =>
  props.size === '2xl' ? 'max-w-[1400px]' : props.size === 'xl' ? 'max-w-6xl' : props.size === 'lg' ? 'max-w-3xl' : 'max-w-lg'
);

const open = defineModel<boolean>({ default: false });

const emit = defineEmits<{ close: [] }>();

const close = () => {
  open.value = false;
  emit('close');
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
        <div class="fixed inset-0 bg-inverse-surface/50" @click="close" />
        <div
          class="relative z-10 w-full bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0px_8px_24px_rgba(27,54,93,0.15)] my-auto"
          :class="maxWidthClass"
        >
          <div class="flex items-start justify-between gap-4 p-6 border-b border-outline-variant">
            <div>
              <h3 class="font-semibold text-headline-md text-on-surface">{{ title }}</h3>
              <p v-if="subtitle" class="mt-1 text-body-sm text-on-surface-variant">{{ subtitle }}</p>
            </div>
            <button
              type="button"
              class="text-outline hover:text-on-surface transition-colors shrink-0"
              @click="close"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="p-6 max-h-[65vh] overflow-y-auto">
            <slot />
          </div>

          <div v-if="$slots.footer" class="flex items-center justify-end gap-3 p-6 border-t border-outline-variant">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>

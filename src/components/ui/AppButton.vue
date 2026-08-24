<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    type?: 'button' | 'submit';
    disabled?: boolean;
    icon?: string;
  }>(),
  { variant: 'primary', type: 'button', disabled: false }
);

defineEmits<{ click: [MouseEvent] }>();

const classes = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return 'bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container';
    case 'ghost':
      return 'bg-transparent text-primary hover:bg-surface-container';
    case 'danger':
      return 'bg-error text-on-error hover:opacity-90';
    default:
      return 'bg-primary text-on-primary hover:opacity-90';
  }
});
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-label-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    :class="classes"
    @click="$emit('click', $event)"
  >
    <span v-if="icon" class="material-symbols-outlined" style="font-size: 18px">{{ icon }}</span>
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'success' | 'warning' | 'danger' | 'neutral';
    label: string;
  }>(),
  { variant: 'neutral' }
);

const classes = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'bg-success-container text-on-success-container';
    case 'warning':
      return 'bg-warning-container text-on-warning-container';
    case 'danger':
      return 'bg-danger-container text-on-danger-container';
    default:
      return 'bg-surface-container text-on-surface-variant';
  }
});
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-label-sm whitespace-nowrap"
    :class="classes"
  >
    {{ label }}
  </span>
</template>

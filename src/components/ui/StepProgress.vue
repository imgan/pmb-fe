<script setup lang="ts">
export interface ProgressStep {
  key: string;
  label: string;
  state: 'done' | 'active' | 'pending' | 'success' | 'danger';
  icon: string;
  hint?: string;
}

defineProps<{ steps: ProgressStep[] }>();
</script>

<template>
  <div class="flex items-start">
    <template v-for="(step, idx) in steps" :key="step.key">
      <div class="flex flex-col items-center flex-1 min-w-0">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors"
          :class="{
            'bg-success border-success text-white': step.state === 'done' || step.state === 'success',
            'bg-danger border-danger text-white': step.state === 'danger',
            'bg-primary-container border-primary text-primary': step.state === 'active',
            'bg-surface-container border-outline-variant text-on-surface-variant': step.state === 'pending',
          }"
        >
          <span class="material-symbols-outlined" style="font-size: 20px">{{ step.icon }}</span>
        </div>
        <p class="text-label-sm text-on-surface text-center mt-2 px-1 leading-tight">{{ step.label }}</p>
        <p v-if="step.hint" class="text-label-sm text-on-surface-variant text-center px-1 leading-tight">{{ step.hint }}</p>
      </div>
      <div
        v-if="idx < steps.length - 1"
        class="flex-1 h-0.5 mt-5 mx-1 transition-colors"
        :class="step.state === 'done' ? 'bg-success' : 'bg-outline-variant'"
      ></div>
    </template>
  </div>
</template>

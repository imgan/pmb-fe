<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string;
    message?: string;
  }>(),
  {
    icon: 'construction',
    message: 'Laporan ini sedang dalam pengembangan dan akan segera hadir.',
  }
);
</script>

<template>
  <section
    class="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col items-center justify-center text-center py-20 px-6"
  >
    <span class="material-symbols-outlined text-primary" style="font-size: 48px">{{ icon }}</span>
    <p class="mt-4 text-headline-md text-on-surface font-semibold">Segera Hadir</p>
    <p class="mt-1 text-body-md text-on-surface-variant max-w-md">{{ message }}</p>
  </section>
</template>

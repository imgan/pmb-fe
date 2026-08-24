<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4 text-center">
    <span class="material-symbols-outlined text-error" style="font-size: 56px">block</span>
    <h1 class="mt-4 font-semibold text-headline-lg text-primary">Akses Ditolak</h1>
    <p class="mt-2 text-body-md text-on-surface-variant">Anda tidak memiliki hak akses untuk membuka halaman ini.</p>
    <RouterLink
      to="/admin/dashboard"
      class="mt-6 px-4 py-2 rounded-md bg-primary text-on-primary font-medium text-label-md hover:opacity-90 transition-opacity"
    >
      Kembali ke Dashboard
    </RouterLink>
  </div>
</template>

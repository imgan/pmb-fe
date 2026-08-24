<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-surface px-4 text-center">
    <span class="material-symbols-outlined text-primary" style="font-size: 56px">search_off</span>
    <h1 class="mt-4 font-semibold text-headline-lg text-primary">Halaman Tidak Ditemukan</h1>
    <p class="mt-2 text-body-md text-on-surface-variant">Halaman yang Anda cari tidak tersedia.</p>
    <RouterLink
      to="/"
      class="mt-6 px-4 py-2 rounded-md bg-primary text-on-primary font-medium text-label-md hover:opacity-90 transition-opacity"
    >
      Kembali ke Beranda
    </RouterLink>
  </div>
</template>

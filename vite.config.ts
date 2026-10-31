import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    watch: {
      // Arsip zip & hasil build di root project tidak perlu dipantau; file zip yang sedang
      // ditulis/dikunci (EBUSY) membuat dev server crash di Windows.
      ignored: ['**/*.zip', '**/dist/**'],
    },
  },
});

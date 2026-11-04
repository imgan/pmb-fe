import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import { useMenuStore } from './stores/menu';
import { usePesertaAuthStore } from './stores/pesertaAuth';
import { useDosenAuthStore } from './stores/dosenAuth';
import { useMahasiswaAuthStore } from './stores/mahasiswaAuth';
import { toastInfo } from './utils/swal';
import { registerUnauthorizedHandler, STAFF_TOKEN_KEY } from './api/http';
import { registerPesertaUnauthorizedHandler } from './api/pesertaHttp';
import { registerDosenUnauthorizedHandler } from './api/dosenHttp';
import { registerMahasiswaUnauthorizedHandler } from './api/mahasiswaHttp';
import './style.css';

async function bootstrap() {
  const app = createApp(App);
  app.use(createPinia());

  const authStore = useAuthStore();
  const menuStore = useMenuStore();
  const pesertaAuthStore = usePesertaAuthStore();
  const dosenAuthStore = useDosenAuthStore();
  const mahasiswaAuthStore = useMahasiswaAuthStore();

  // Tombol Back bisa memulihkan halaman lama dari cache browser tanpa melewati router guard (mis. PMB setelah login
  // Keuangan, atau halaman staf setelah logout): muat ulang supaya sesi & modul dicek lagi.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) window.location.reload();
  });

  // Sesi habis (token tidak valid & refresh gagal): kembali ke login, lalu lanjut ke halaman terakhir setelah masuk.
  registerUnauthorizedHandler(() => {
    authStore.logout();
    menuStore.reset();
    const sekarang = router.currentRoute.value;
    if (sekarang.meta.public) return;
    toastInfo('Sesi Anda sudah berakhir. Silakan login kembali.');
    if (sekarang.path.startsWith('/lms')) router.replace({ name: 'lms-login' });
    else router.replace({ name: 'login', query: { redirect: sekarang.fullPath } });
  });

  registerPesertaUnauthorizedHandler(() => {
    pesertaAuthStore.logout();
    if (router.currentRoute.value.name !== 'pendaftaran-masuk') {
      router.push({ name: 'pendaftaran-masuk' });
    }
  });

  registerDosenUnauthorizedHandler(() => {
    dosenAuthStore.logout();
    if (router.currentRoute.value.name !== 'dosen-login') {
      router.push({ name: 'dosen-login' });
    }
  });

  registerMahasiswaUnauthorizedHandler(() => {
    mahasiswaAuthStore.logout();
    if (router.currentRoute.value.name !== 'mahasiswa-login') {
      router.push({ name: 'mahasiswa-login' });
    }
  });

  // Sesi staff dipakai bersama semua tab (localStorage). Bila tab lain login akun/modul lain atau
  // logout, tab ini ikut menyesuaikan supaya menu & hak akses akun lama tidak "nyangkut".
  window.addEventListener('storage', (event) => {
    if (event.key !== STAFF_TOKEN_KEY || event.oldValue === event.newValue || !authStore.user) return;
    if (!event.newValue) {
      authStore.logout();
      router.push({ name: 'login' });
    } else {
      window.location.reload();
    }
  });

  await Promise.all([authStore.bootstrap(), pesertaAuthStore.bootstrap()]);

  app.use(router);
  app.mount('#app');
}

bootstrap();

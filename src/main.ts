import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import { useMenuStore } from './stores/menu';
import { usePesertaAuthStore } from './stores/pesertaAuth';
import { registerUnauthorizedHandler } from './api/http';
import { registerPesertaUnauthorizedHandler } from './api/pesertaHttp';
import './style.css';

async function bootstrap() {
  const app = createApp(App);
  app.use(createPinia());

  const authStore = useAuthStore();
  const menuStore = useMenuStore();
  const pesertaAuthStore = usePesertaAuthStore();

  registerUnauthorizedHandler(() => {
    authStore.logout();
    menuStore.reset();
    if (router.currentRoute.value.name !== 'login') {
      router.push({ name: 'login' });
    }
  });

  registerPesertaUnauthorizedHandler(() => {
    pesertaAuthStore.logout();
    if (router.currentRoute.value.name !== 'pendaftaran-masuk') {
      router.push({ name: 'pendaftaran-masuk' });
    }
  });

  await Promise.all([authStore.bootstrap(), pesertaAuthStore.bootstrap()]);

  app.use(router);
  app.mount('#app');
}

bootstrap();

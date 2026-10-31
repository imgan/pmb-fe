<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useMenuStore } from '@/stores/menu';
import { materialIcon } from '@/utils/icons';
import { MENU } from '@/constants/menuCodes';
import ProfileSettingsModal from '@/components/layout/ProfileSettingsModal.vue';
import SidebarBrand from '@/components/layout/SidebarBrand.vue';
import AcademicContextCard from '@/components/layout/AcademicContextCard.vue';
import type { MenuTreeNode } from '@/types/entities';

const authStore = useAuthStore();
const menuStore = useMenuStore();
const route = useRoute();

const mobileOpen = ref(false);
const isProfileOpen = ref(false);
const expandedGroups = reactive(new Set<number>());

onMounted(() => {
  if (!menuStore.loaded) menuStore.load();
});

const prodiPath = (path: string) => `/prodi${path}`;
const isActive = (path: string | null) => {
  if (!path) return false;
  const target = prodiPath(path);
  return route.path === target || route.path.startsWith(`${target}/`);
};
const hasActiveChild = (item: MenuTreeNode) => item.children.some((child) => isActive(child.path));

// Setting Prodi dibuka dari tombol pojok kanan atas, tidak tampil di sidebar.
const sidebarTree = computed(() => menuStore.treeFor('prodi').filter((m) => m.code !== MENU.PRODI_SETTING_MANAGEMENT));
const bisaSetting = computed(() => authStore.permissionsFor(MENU.PRODI_SETTING_MANAGEMENT).canRead);
const settingAktif = computed(() => route.path === '/prodi/setting' || route.path.startsWith('/prodi/setting/'));

watch(
  sidebarTree,
  (tree) => {
    tree.forEach((item) => {
      if (item.children.length && hasActiveChild(item)) expandedGroups.add(item.id);
    });
  },
  { immediate: true }
);

const toggleGroup = (id: number) => {
  if (expandedGroups.has(id)) expandedGroups.delete(id);
  else expandedGroups.add(id);
};

const handleLogout = () => {
  authStore.logout();
  menuStore.reset();
  window.location.href = '/admin/login';
};
</script>

<template>
  <div class="min-h-screen flex bg-surface">
    <!-- Mobile topbar -->
    <div
      class="md:hidden fixed top-0 left-0 right-0 h-14 bg-surface-container-lowest border-b border-outline-variant flex items-center px-4 z-30"
    >
      <button type="button" class="text-on-surface" @click="mobileOpen = true">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <span class="ml-3 font-semibold text-headline-md text-primary">Program Studi</span>
      <RouterLink
        v-if="bisaSetting"
        to="/prodi/setting"
        class="ml-auto inline-flex items-center justify-center w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container-highest"
        :class="{ 'bg-primary-container text-on-primary-container': settingAktif }"
        title="Setting Prodi"
      >
        <span class="material-symbols-outlined">settings</span>
      </RouterLink>
    </div>

    <div v-if="mobileOpen" class="fixed inset-0 bg-inverse-surface/50 z-40 md:hidden" @click="mobileOpen = false" />

    <!-- SideNavBar -->
    <aside
      class="flex flex-col bg-surface-container-low shadow-sm h-full w-64 fixed left-0 top-0 p-4 z-50 transition-transform overflow-y-auto"
      :class="mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
    >
      <SidebarBrand label="Program Studi" icon="auto_stories" @close="mobileOpen = false" />

      <nav class="flex-1 space-y-1">
        <template v-for="item in sidebarTree" :key="item.id">
          <div v-if="item.children.length">
            <button
              type="button"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-label-md"
              :class="
                hasActiveChild(item)
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-highest'
              "
              @click="toggleGroup(item.id)"
            >
              <span class="material-symbols-outlined">{{ materialIcon(item.icon) }}</span>
              <span class="flex-1 text-left">{{ item.name }}</span>
              <span
                class="material-symbols-outlined transition-transform"
                style="font-size: 18px"
                :class="{ 'rotate-180': expandedGroups.has(item.id) }"
              >
                expand_more
              </span>
            </button>
            <div v-if="expandedGroups.has(item.id)" class="mt-1 ml-4 pl-4 border-l border-outline-variant space-y-1">
              <RouterLink
                v-for="child in item.children"
                :key="child.id"
                :to="prodiPath(child.path ?? '')"
                class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-label-md"
                :class="
                  isActive(child.path)
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-highest'
                "
                @click="mobileOpen = false"
              >
                <span class="material-symbols-outlined" style="font-size: 18px" :class="{ filled: isActive(child.path) }">
                  {{ materialIcon(child.icon) }}
                </span>
                <span>{{ child.name }}</span>
              </RouterLink>
            </div>
          </div>
          <RouterLink
            v-else-if="item.path"
            :to="prodiPath(item.path)"
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-label-md"
            :class="
              isActive(item.path)
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:bg-surface-container-highest'
            "
            @click="mobileOpen = false"
          >
            <span class="material-symbols-outlined" :class="{ filled: isActive(item.path) }">
              {{ materialIcon(item.icon) }}
            </span>
            <span>{{ item.name }}</span>
          </RouterLink>
        </template>
      </nav>

      <div class="mt-4 pt-4 border-t border-outline-variant">
        <AcademicContextCard show-prodi />
        <button
          type="button"
          class="w-full flex items-center gap-3 mb-3 p-1 -m-1 rounded-md hover:bg-surface-container-highest transition-colors text-left"
          title="Profil Saya"
          @click="isProfileOpen = true"
        >
          <div
            v-if="authStore.user?.photo"
            class="w-10 h-10 rounded-full bg-cover bg-center shrink-0"
            :style="{ backgroundImage: `url(${authStore.user.photo})` }"
          />
          <div v-else class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-semibold shrink-0">
            {{ authStore.user?.name?.charAt(0)?.toUpperCase() ?? '?' }}
          </div>
          <div class="min-w-0">
            <p class="text-label-md text-on-surface truncate">{{ authStore.user?.name }}</p>
            <p class="text-body-sm text-on-surface-variant truncate">{{ authStore.user?.role?.name }}</p>
          </div>
        </button>
        <button
          type="button"
          class="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest transition-colors text-label-md"
          @click="handleLogout"
        >
          <span class="material-symbols-outlined" style="font-size: 18px">logout</span>
          Keluar
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 md:ml-64 mt-14 md:mt-0 bg-surface min-h-screen flex flex-col">
      <div class="flex-1 p-4 md:p-12">
        <!-- Pojok kanan atas: Setting Prodi -->
        <div v-if="bisaSetting" class="hidden md:flex justify-end -mt-8 mb-2">
          <RouterLink
            to="/prodi/setting"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-label-md transition-colors"
            :class="
              settingAktif
                ? 'bg-primary-container text-on-primary-container border-primary'
                : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-highest'
            "
            title="Setting Program Studi"
          >
            <span class="material-symbols-outlined" style="font-size: 18px">settings</span>
            Setting Prodi
          </RouterLink>
        </div>
        <RouterView />
      </div>

    </main>

    <ProfileSettingsModal v-model="isProfileOpen" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import AppButton from '@/components/ui/AppButton.vue';
import { rolesApi } from '@/api/roles';
import { menusApi } from '@/api/menus';
import { permissionsApi, type PermissionAssignment } from '@/api/permissions';
import { extractErrorMessage } from '@/api/http';
import type { Menu, ModuleCode, Role } from '@/types/entities';

const MODULE_ORDER: ModuleCode[] = ['pmb', 'baak', 'sdi', 'prodi'];
const MODULE_LABELS: Record<ModuleCode, string> = {
  pmb: 'PMB',
  baak: 'BAAK',
  sdi: 'SDI',
  prodi: 'Prodi',
};

const props = defineProps<{ id: string }>();

const role = ref<Role | null>(null);
const menus = ref<Menu[]>([]);
const matrix = reactive<Record<number, PermissionAssignment>>({});

const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const emptyRow = (menuId: number): PermissionAssignment => ({
  menuId,
  canCreate: false,
  canRead: false,
  canUpdate: false,
  canDelete: false,
});

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    const [roleResult, menuResult, permissionResult] = await Promise.all([
      rolesApi.get(props.id),
      menusApi.list({ limit: 200 }),
      permissionsApi.getByRole(props.id),
    ]);

    role.value = roleResult;
    menus.value = menuResult.data.sort((a, b) => a.orderNumber - b.orderNumber);

    for (const menu of menus.value) {
      matrix[menu.id] = emptyRow(menu.id);
    }
    for (const perm of permissionResult) {
      matrix[perm.menuId] = {
        menuId: perm.menuId,
        canCreate: perm.canCreate,
        canRead: perm.canRead,
        canUpdate: perm.canUpdate,
        canDelete: perm.canDelete,
      };
    }
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal memuat hak akses role');
  } finally {
    loading.value = false;
  }
};

const groupedMenus = computed(() => {
  const groups = MODULE_ORDER.map((module) => ({
    module,
    label: MODULE_LABELS[module],
    menus: menus.value.filter((menu) => menu.module === module),
  })).filter((group) => group.menus.length > 0);

  const knownModules = new Set(MODULE_ORDER);
  const otherMenus = menus.value.filter((menu) => !knownModules.has(menu.module));
  if (otherMenus.length > 0) {
    groups.push({ module: otherMenus[0].module, label: otherMenus[0].module.toUpperCase(), menus: otherMenus });
  }

  return groups;
});

const toggleAllForMenu = (menuId: number, checked: boolean) => {
  matrix[menuId] = { menuId, canCreate: checked, canRead: checked, canUpdate: checked, canDelete: checked };
};

const save = async () => {
  saving.value = true;
  error.value = null;
  successMessage.value = null;
  try {
    await permissionsApi.assign(props.id, Object.values(matrix));
    successMessage.value = 'Hak akses berhasil disimpan';
  } catch (err) {
    error.value = extractErrorMessage(err, 'Gagal menyimpan hak akses');
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div>
    <PageHeader
      :back-to="{ name: 'roles' }"
      back-label="Kembali ke Daftar Role"
      :title="`Hak Akses: ${role?.name ?? ''}`"
      subtitle="Atur hak akses create/read/update/delete per menu untuk role ini."
    >
      <template #actions>
        <AppButton :disabled="saving || loading" @click="save">{{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}</AppButton>
      </template>
    </PageHeader>

    <div v-if="error" class="mb-4 px-4 py-3 rounded-md bg-error-container text-on-error-container text-body-sm">{{ error }}</div>
    <div v-if="successMessage" class="mb-4 px-4 py-3 rounded-md bg-success-container text-on-success-container text-body-sm">
      {{ successMessage }}
    </div>

    <div v-if="loading" class="text-center py-16 text-on-surface-variant">Memuat data...</div>

    <section v-else class="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead class="bg-[#F1F5F9] border-b border-outline-variant">
            <tr>
              <th class="p-4 font-semibold text-label-md text-primary">Menu</th>
              <th class="p-4 font-semibold text-label-md text-primary text-center">Semua</th>
              <th class="p-4 font-semibold text-label-md text-primary text-center">Create</th>
              <th class="p-4 font-semibold text-label-md text-primary text-center">Read</th>
              <th class="p-4 font-semibold text-label-md text-primary text-center">Update</th>
              <th class="p-4 font-semibold text-label-md text-primary text-center">Delete</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant text-body-sm text-on-surface">
            <template v-for="group in groupedMenus" :key="group.module">
              <tr>
                <td colspan="6" class="px-4 py-2.5 bg-primary text-on-primary text-label-md font-semibold">
                  {{ group.label }}
                </td>
              </tr>
              <tr v-for="menu in group.menus" :key="menu.id" class="hover:bg-surface-container transition-colors">
                <td class="p-4 font-medium">{{ menu.name }}</td>
                <td class="p-4 text-center">
                  <input
                    type="checkbox"
                    class="w-4 h-4 accent-primary cursor-pointer"
                    :checked="matrix[menu.id].canCreate && matrix[menu.id].canRead && matrix[menu.id].canUpdate && matrix[menu.id].canDelete"
                    @change="toggleAllForMenu(menu.id, ($event.target as HTMLInputElement).checked)"
                  />
                </td>
                <td class="p-4 text-center">
                  <input v-model="matrix[menu.id].canCreate" type="checkbox" class="w-4 h-4 accent-primary cursor-pointer" />
                </td>
                <td class="p-4 text-center">
                  <input v-model="matrix[menu.id].canRead" type="checkbox" class="w-4 h-4 accent-primary cursor-pointer" />
                </td>
                <td class="p-4 text-center">
                  <input v-model="matrix[menu.id].canUpdate" type="checkbox" class="w-4 h-4 accent-primary cursor-pointer" />
                </td>
                <td class="p-4 text-center">
                  <input v-model="matrix[menu.id].canDelete" type="checkbox" class="w-4 h-4 accent-primary cursor-pointer" />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

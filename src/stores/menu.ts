import { defineStore } from 'pinia';
import { menusApi } from '@/api/menus';
import { useAuthStore } from '@/stores/auth';
import type { MenuTreeNode, ModuleCode } from '@/types/entities';

interface MenuState {
  tree: MenuTreeNode[];
  loaded: boolean;
}

const filterVisible = (
  nodes: MenuTreeNode[],
  module: ModuleCode,
  canRead: (code: string) => boolean
): MenuTreeNode[] =>
  nodes
    .filter((node) => node.module === module && node.isActive && canRead(node.code))
    .map((node) => ({ ...node, children: filterVisible(node.children ?? [], module, canRead) }));

export const useMenuStore = defineStore('menu', {
  state: (): MenuState => ({
    tree: [],
    loaded: false,
  }),

  getters: {
    treeFor(state) {
      return (module: ModuleCode): MenuTreeNode[] => {
        const authStore = useAuthStore();
        return filterVisible(state.tree, module, (code) => authStore.permissionsFor(code).canRead);
      };
    },
  },

  actions: {
    async load() {
      try {
        this.tree = await menusApi.tree();
      } catch {
        this.tree = [];
      } finally {
        this.loaded = true;
      }
    },
    reset() {
      this.tree = [];
      this.loaded = false;
    },
  },
});

import { http } from './http';
import { createCrudApi } from './crudFactory';
import type { ApiResponse } from '@/types/common';
import type { Menu, MenuTreeNode } from '@/types/entities';

export interface MenuPayload {
  parentId?: number | null;
  name: string;
  code: string;
  path?: string | null;
  icon?: string | null;
  orderNumber?: number;
  isActive?: boolean;
  isPublic?: boolean;
}

export const menusApi = {
  ...createCrudApi<Menu, MenuPayload, Partial<MenuPayload>>('menus'),
  async tree(): Promise<MenuTreeNode[]> {
    const { data } = await http.get<ApiResponse<MenuTreeNode[]>>('/menus/tree');
    return data.data;
  },
};

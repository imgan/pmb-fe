import { http } from './http';
import type { ApiResponse, ListQuery, ListResult, PagingMeta } from '@/types/common';

interface ApiListResponse<T> extends ApiResponse<T[]> {
  meta: PagingMeta;
}

export interface CrudApi<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list(query?: ListQuery): Promise<ListResult<T>>;
  get(id: number | string): Promise<T>;
  create(payload: TCreate): Promise<T>;
  update(id: number | string, payload: TUpdate): Promise<T>;
  remove(id: number | string): Promise<void>;
}

export function createCrudApi<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  resource: string
): CrudApi<T, TCreate, TUpdate> {
  return {
    async list(query = {}) {
      const { data } = await http.get<ApiListResponse<T>>(`/${resource}`, { params: query });
      return { data: data.data, meta: data.meta };
    },
    async get(id) {
      const { data } = await http.get<ApiResponse<T>>(`/${resource}/${id}`);
      return data.data;
    },
    async create(payload) {
      const { data } = await http.post<ApiResponse<T>>(`/${resource}`, payload);
      return data.data;
    },
    async update(id, payload) {
      const { data } = await http.put<ApiResponse<T>>(`/${resource}/${id}`, payload);
      return data.data;
    },
    async remove(id) {
      await http.delete(`/${resource}/${id}`);
    },
  };
}

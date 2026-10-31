import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { SelectOption } from '@/components/ui/SelectInput.vue';
import { filenameFromDisposition, type NamedBlob } from '@/utils/download';

export interface FeederColumn {
  key: string;
  header: string;
}

export interface FeederField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'lookup';
  required?: boolean;
  options?: SelectOption[];
  lookup?: string;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
}

export interface FeederMeta {
  key: string;
  title: string;
  group: string;
  source: string | null;
  columns: FeederColumn[];
  editable: boolean;
  fields: FeederField[];
  actions: { key: string; label: string; confirm?: string }[];
  /** Filter tambahan per entitas (mis. Feeder Mahasiswa: prodi & angkatan). */
  filters?: { key: string; label: string; options: { value: string; label: string }[] }[];
}

export type FeederRow = Record<string, string | number | null> & { id: string | number };

export interface FeederRecord {
  id: number;
  values: Record<string, string | number | null>;
  lookupLabels: Record<string, string>;
}

export const simFeederApi = {
  async meta(entity: string): Promise<FeederMeta> {
    const { data } = await http.get<ApiResponse<FeederMeta>>(`/sim/feeder/${entity}/meta`);
    return data.data;
  },
  async list(entity: string, query: ListQuery & Record<string, string | number | undefined>): Promise<ListResult<FeederRow>> {
    const { data } = await http.get<ApiResponse<FeederRow[]> & { meta: ListResult<FeederRow>['meta'] }>(`/sim/feeder/${entity}`, {
      params: query,
    });
    return { data: data.data, meta: data.meta };
  },
  async get(entity: string, id: number | string): Promise<FeederRecord> {
    const { data } = await http.get<ApiResponse<FeederRecord>>(`/sim/feeder/${entity}/${id}`);
    return data.data;
  },
  async create(entity: string, payload: Record<string, unknown>): Promise<FeederRecord> {
    const { data } = await http.post<ApiResponse<FeederRecord>>(`/sim/feeder/${entity}`, payload);
    return data.data;
  },
  async update(entity: string, id: number | string, payload: Record<string, unknown>): Promise<FeederRecord> {
    const { data } = await http.put<ApiResponse<FeederRecord>>(`/sim/feeder/${entity}/${id}`, payload);
    return data.data;
  },
  async remove(entity: string, id: number | string): Promise<void> {
    await http.delete(`/sim/feeder/${entity}/${id}`);
  },
  async runAction(entity: string, action: string): Promise<{ message: string }> {
    const { data } = await http.post<ApiResponse<{ message: string }>>(`/sim/feeder/${entity}/actions/${action}`);
    return data.data;
  },
  async exportExcel(entity: string, filters: Record<string, string> = {}): Promise<NamedBlob> {
    const { data, headers } = await http.get(`/sim/feeder/${entity}/export`, { params: filters, responseType: 'blob' });
    return { blob: data, filename: filenameFromDisposition(headers['content-disposition'], `FEEDER_${entity}.xlsx`) };
  },
  async lookup(type: string, search: string): Promise<SelectOption[]> {
    const { data } = await http.get<ApiResponse<SelectOption[]>>(`/sim/feeder/lookup/${type}`, { params: { search } });
    return data.data;
  },
};

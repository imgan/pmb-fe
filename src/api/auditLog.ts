import { http } from './http';
import type { ApiResponse, ListQuery, ListResult } from '@/types/common';
import type { AuditLog } from '@/types/entities';

export const auditLogApi = {
  async list(query: ListQuery = {}): Promise<ListResult<AuditLog>> {
    const { data } = await http.get<ApiResponse<AuditLog[]> & { meta: ListResult<AuditLog>['meta'] }>('/audit-logs', {
      params: query,
    });
    return { data: data.data, meta: data.meta };
  },
  async modules(): Promise<string[]> {
    const { data } = await http.get<ApiResponse<string[]>>('/audit-logs/modules');
    return data.data;
  },
};

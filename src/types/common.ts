export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PagingMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListResult<T> {
  data: T[];
  meta: PagingMeta;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportResult {
  successCount: number;
  errorCount: number;
  errors: ImportError[];
}

import { ref, watch, type Ref } from 'vue';
import type { ListQuery, ListResult, PagingMeta } from '@/types/common';
import { extractErrorMessage } from '@/api/http';
import { toastSuccess, toastError } from '@/utils/swal';

export interface UseCrudPageOptions<T> {
  fetchList: (query: ListQuery) => Promise<ListResult<T>>;
  remove: (id: number | string) => Promise<void>;
  pageSize?: number;
  /** Reactive getter for extra filter query params (e.g. golonganKelasId, isBeasiswa). */
  extraQuery?: () => Record<string, string | number | boolean | undefined>;
}

const emptyMeta: PagingMeta = { total: 0, page: 1, limit: 10, totalPages: 1 };

export function useCrudPage<T extends { id: number }>(options: UseCrudPageOptions<T>) {
  const items = ref([]) as Ref<T[]>;
  const meta = ref<PagingMeta>({ ...emptyMeta });
  const page = ref(1);
  const search = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);

  const sortBy = ref<string | null>(null);
  const sortDir = ref<'asc' | 'desc'>('asc');

  const deleteTarget = ref<T | null>(null);
  const deleting = ref(false);

  const isFormOpen = ref(false);
  const editingItem = ref<T | null>(null);

  const fetchItems = async () => {
    loading.value = true;
    error.value = null;
    try {
      const query: ListQuery = {
        page: page.value,
        limit: options.pageSize ?? 10,
        search: search.value || undefined,
        sortBy: sortBy.value || undefined,
        sortDir: sortBy.value ? sortDir.value : undefined,
        ...(options.extraQuery ? options.extraQuery() : {}),
      };
      const result = await options.fetchList(query);
      items.value = result.data;
      meta.value = result.meta;
    } catch (err) {
      error.value = extractErrorMessage(err, 'Gagal memuat data');
    } finally {
      loading.value = false;
    }
  };

  let searchDebounce: ReturnType<typeof setTimeout> | undefined;
  watch(search, () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      page.value = 1;
      fetchItems();
    }, 350);
  });

  watch(page, () => {
    fetchItems();
  });

  const handleSort = (key: string) => {
    if (sortBy.value === key) {
      sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy.value = key;
      sortDir.value = 'asc';
    }
    page.value = 1;
    fetchItems();
  };

  const openCreate = () => {
    editingItem.value = null;
    isFormOpen.value = true;
  };

  const openEdit = (item: T) => {
    editingItem.value = item;
    isFormOpen.value = true;
  };

  const closeForm = () => {
    isFormOpen.value = false;
    editingItem.value = null;
  };

  const onSaved = () => {
    closeForm();
    toastSuccess('Data berhasil disimpan');
    fetchItems();
  };

  const requestDelete = (item: T) => {
    deleteTarget.value = item;
  };

  const cancelDelete = () => {
    deleteTarget.value = null;
  };

  const confirmDelete = async () => {
    if (!deleteTarget.value) return;
    deleting.value = true;
    error.value = null;
    try {
      await options.remove(deleteTarget.value.id);
      deleteTarget.value = null;
      toastSuccess('Data berhasil dihapus');
      if (items.value.length === 1 && page.value > 1) {
        page.value -= 1;
      } else {
        await fetchItems();
      }
    } catch (err) {
      const message = extractErrorMessage(err, 'Gagal menghapus data');
      error.value = message;
      toastError(message);
    } finally {
      deleting.value = false;
    }
  };

  return {
    items,
    meta,
    page,
    search,
    loading,
    error,
    sortBy,
    sortDir,
    handleSort,
    deleteTarget,
    deleting,
    isFormOpen,
    editingItem,
    fetchItems,
    openCreate,
    openEdit,
    closeForm,
    onSaved,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}

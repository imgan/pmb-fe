export const formatDate = (value: string | null | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date);
};

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const formatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(date);
  return `${formatted} WIB`;
};

export const toDateInputValue = (value: string | null | undefined): string => {
  if (!value) return '';
  return value.slice(0, 10);
};

/** Formats a number as thousand-separated digits using Indonesian grouping (e.g. 500000 -> "500.000"). */
export const formatRupiahNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return value.toLocaleString('id-ID');
};

/** Strips non-digit characters from a formatted currency input string, returning a plain number (or null if empty). */
export const parseRupiahInput = (value: string): number | null => {
  const digitsOnly = value.replace(/[^0-9]/g, '');
  if (!digitsOnly) return null;
  return Number(digitsOnly);
};

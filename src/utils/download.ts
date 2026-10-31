export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** Opens a blob (e.g. a PDF) inline in a new tab using the browser's native viewer, instead of forcing a download. */
export const openBlob = (blob: Blob) => {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/**
 * Converts a `data:...;base64,...` URI into a Blob. Browsers block navigating/embedding `data:` URLs
 * directly (e.g. iframe src or a new-tab link), so anything stored as a data URI must be converted to
 * a `blob:` object URL (via URL.createObjectURL) before it can be opened or previewed.
 */
export const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] ?? 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

/** Ambil nama file dari header Content-Disposition (`filename="..."`); fallback bila tidak ada. */
export const filenameFromDisposition = (disposition: string | undefined | null, fallback: string): string => {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
};

export interface NamedBlob {
  blob: Blob;
  filename: string;
}

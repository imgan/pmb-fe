/** Kelas & helper bersama komponen RPS mata kuliah. */
export const inputCls =
  'w-full px-2 py-1.5 border border-outline-variant rounded text-body-sm bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none';
export const btnAksi = 'inline-flex items-center justify-center w-7 h-7 rounded text-white hover:opacity-90 disabled:opacity-50';

/**
 * Isi editor (HTML) → teks polos untuk ditampilkan di tabel tanpa v-html: butir daftar diberi "• ",
 * paragraf/baris dipisah baris baru. DOMParser tidak menjalankan skrip.
 */
export const htmlKeTeks = (html: string | null | undefined): string => {
  if (!html) return '';
  if (!/[<>]/.test(html)) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('li').forEach((li) => li.prepend('• '));
  doc.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  doc.querySelectorAll('p, li, h1, h2, h3, h4, tr').forEach((el) => el.append('\n'));
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
};

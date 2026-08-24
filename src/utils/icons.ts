/**
 * Menus are seeded with short lucide-style icon keys (see pmb-be seeders).
 * Map them to Material Symbols Outlined ligature names used by the design system.
 */
const ICON_MAP: Record<string, string> = {
  home: 'dashboard',
  users: 'group',
  shield: 'shield',
  list: 'list_alt',
  layers: 'layers',
  book: 'school',
  shirt: 'checkroom',
  'credit-card': 'credit_card',
  'file-text': 'description',
  paperclip: 'attach_file',
  calendar: 'calendar_month',
  info: 'info',
};

export const materialIcon = (iconKey: string | null | undefined): string => {
  if (!iconKey) return 'circle';
  return ICON_MAP[iconKey] ?? iconKey;
};

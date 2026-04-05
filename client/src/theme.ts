/**
 * src/theme.ts
 * Velox Mail Design System — ported from web CSS tokens to React Native.
 *
 * Philosophy: Superhuman speed · Apple clarity · Linear polish
 */

/* ── Colors ── */
export const Colors = {
  /* Sidebar / Dark surfaces */
  darkBg:        '#0D0D12',
  darkHover:     'rgba(255,255,255,0.055)',
  darkActiveBg:  'rgba(99,102,241,0.18)',
  darkActiveText:'#818CF8',
  darkText:      'rgba(255,255,255,0.72)',
  darkTextDim:   'rgba(255,255,255,0.32)',
  darkBorder:    'rgba(255,255,255,0.07)',

  /* Surfaces */
  surface:        '#FFFFFF',
  surfaceSoft:    '#F8F8FC',
  surfaceHover:   '#F3F3F9',
  surfaceSelected:'#EEF2FF',
  surfaceThread:  '#FAFAFA',

  /* Borders */
  border:       '#E8E8EF',
  borderStrong: '#D0D0DE',

  /* Text */
  text1:  '#0D0D16',
  text2:  '#55556E',
  text3:  '#9898B2',
  textInv:'#FFFFFF',

  /* Accent — indigo family */
  accent:      '#4F46E5',
  accentHover: '#4338CA',
  accentSoft:  '#EEF2FF',
  accentText:  '#4F46E5',

  /* Semantic */
  unreadBar:  '#4F46E5',
  star:       '#F59E0B',
  starSoft:   '#FFFBEB',
  danger:     '#EF4444',
  dangerSoft: '#FEF2F2',
  success:    '#10B981',
  successSoft:'#ECFDF5',

  /* Badge accent */
  badgeBg:   'rgba(99,102,241,0.3)',
  badgeText: '#A5B4FC',
};

/* ── Category Colors ── */
export const CATEGORY_COLORS: Record<string, string> = {
  Work:       '#2563EB',
  Personal:   '#059669',
  Spam:       '#DC2626',
  Finance:    '#D97706',
  Promotions: '#EA580C',
  Social:     '#7C3AED',
};

/* ── Avatar Colors ── */
export const AVATAR_COLORS = [
  '#4F46E5','#2563EB','#059669','#D97706','#DC2626','#7C3AED',
  '#0891B2','#BE185D','#065F46','#92400E',
];

export function avatarColor(name: string | undefined | null): string {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function initials(addr: string | undefined | null): string {
  if (!addr) return '?';
  const name = addr.split('@')[0];
  return name.slice(0, 2).toUpperCase();
}

/* ── Time formatting (matching web) ── */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)    return 'just now';
  if (mins < 60)   return `${mins}m`;
  if (hours < 24)  return `${hours}h`;
  if (days === 1)  return 'Yesterday';
  if (days < 7)    return d.toLocaleDateString('en', { weekday: 'short' });
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export function formatFullTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ── Spacing ── */
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  base:16,
  lg:  20,
  xl:  24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

/* ── Radii ── */
export const Radii = {
  sm:   4,
  md:   6,
  lg:   10,
  xl:   14,
  full: 9999,
};

/* ── Shadows ── */
export const Shadows = {
  xs: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 48,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
} as const;

/* ── Typography ── */
export const Typography = {
  xs:   11,
  sm:   12,
  base: 13,
  md:   14,
  lg:   15,
  xl:   17,
  '2xl': 21,
  '3xl': 26,
};

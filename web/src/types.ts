export interface Message {
  id: number;
  from: string;
  to: string;
  subject: string;
  body?: string;
  received_at: string;
  category: string | null;
  is_read?: boolean;
  is_deleted?: boolean;
  is_starred?: boolean;
  has_attachments?: boolean;
  attachments?: { id: number; filename: string; content_type: string }[];
  raw_content?: string;
}

export interface Toast {
  id: string;
  text: string;
  type: 'default' | 'success' | 'error';
}

export type Mailbox = 'inbox' | 'sent' | 'starred' | 'spam' | 'trash';

export const CATEGORY_COLORS: Record<string, string> = {
  Work:       '#2563EB',
  Personal:   '#059669',
  Spam:       '#DC2626',
  Finance:    '#D97706',
  Promotions: '#EA580C',
  Social:     '#7C3AED',
};

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

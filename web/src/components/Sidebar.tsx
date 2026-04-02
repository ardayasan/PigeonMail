import React from 'react';
import { useMail } from '../store';
import type { Mailbox } from '../types';

const MAILBOXES: { id: Mailbox; label: string; icon: React.ReactNode }[] = [
  {
    id: 'inbox',
    label: 'Inbox',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M22 12h-6l-2 3H10l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
          </svg>,
  },
  {
    id: 'sent',
    label: 'Sent',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>,
  },
  {
    id: 'starred',
    label: 'Starred',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>,
  },
  {
    id: 'spam',
    label: 'Spam',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>,
  },
  {
    id: 'trash',
    label: 'Trash',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>,
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Work: '#2563EB', Personal: '#059669', Spam: '#DC2626',
  Finance: '#D97706', Promotions: '#EA580C', Social: '#7C3AED',
};

export default function Sidebar() {
  const { user, mailbox, category, categories, messages, inboxCount, setMailbox, setCategory, openCompose, logout } = useMail();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/pigeon-logo.png" style={{ width: 26, height: 26, objectFit: 'contain', borderRadius: 6 }} alt="Logo" />
        </div>
        <span className="sidebar-logo-name" style={{ marginLeft: 8 }}>Pigeon Mail</span>
      </div>

      {/* Compose */}
      <button className="sidebar-compose" onClick={() => openCompose()}>
        <svg className="sidebar-compose-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Compose
      </button>

      <div className="sidebar-section">
        {/* Mailboxes */}
        {MAILBOXES.map(mb => (
          <div
            key={mb.id}
            className={`sidebar-item${mailbox === mb.id && !category ? ' active' : ''}`}
            onClick={() => { setMailbox(mb.id); setCategory(null); }}
          >
            <span className="sidebar-item-icon">{mb.icon}</span>
            <span className="sidebar-item-label">{mb.label}</span>
            {mb.id === 'inbox' && inboxCount > 0 && (
              <span className="sidebar-badge">{inboxCount > 99 ? '99+' : inboxCount}</span>
            )}
          </div>
        ))}

        <div className="sidebar-divider" />

        {/* Categories */}
        {categories.length > 0 && (
          <>
            <div className="sidebar-label">Labels</div>
            {categories.map(cat => (
              <div
                key={cat}
                className={`sidebar-item${category === cat ? ' active' : ''}`}
                onClick={() => { setMailbox('inbox'); setCategory(cat); }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[cat] ?? '#888', flexShrink: 0 }} />
                <span className="sidebar-item-label">{cat}</span>
              </div>
            ))}
            <div className="sidebar-divider" />
          </>
        )}
      </div>

      {/* Footer / account */}
      <div className="sidebar-footer">
        <div className="sidebar-avatar">
          {(user?.username ?? '?')[0].toUpperCase()}
        </div>
        <div className="sidebar-user-info">
          <div className="sidebar-username">{user?.username}</div>
          <div className="sidebar-user-domain">{user?.username}@localhost</div>
        </div>
        <button className="sidebar-signout" onClick={logout} title="Sign out">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}

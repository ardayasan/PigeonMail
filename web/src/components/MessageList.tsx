import React, { useRef } from 'react';
import { useMail } from '../store';
import { avatarColor, CATEGORY_COLORS, formatTime, initials } from '../types';

const MAILBOX_LABELS: Record<string, string> = {
  inbox: 'Inbox', sent: 'Sent', starred: 'Starred', spam: 'Spam', trash: 'Trash',
};

export default function MessageList() {
  const {
    messages, selectedId, mailbox, category, categories,
    search, loadingMessages,
    selectMessage, deleteMessage, toggleStar,
    setCategory, setSearch, openCompose,
  } = useMail();

  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = messages.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.from.toLowerCase().includes(q) ||
      (m.subject ?? '').toLowerCase().includes(q) ||
      (m.body ?? '').toLowerCase().includes(q)
    );
  });

  const title = category ?? MAILBOX_LABELS[mailbox] ?? 'Inbox';
  const tabs = ['All', ...categories];

  return (
    <div className="list-pane">
      {/* Header */}
      <div className="list-header">
        <div className="list-header-top">
          <span className="list-title">{title}</span>
          {!loadingMessages && (
            <span className="list-count">{filtered.length}</span>
          )}
        </div>

        {/* Search */}
        <div className="list-search">
          <svg className="list-search-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={searchRef}
            placeholder="Search messages…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <div className="list-search-clear" onClick={() => setSearch('')}>×</div>
          )}
        </div>

        {/* Category tabs */}
        {categories.length > 0 && !category && (
          <div className="list-tabs">
            <div
              className={`list-tab${!category ? ' active' : ''}`}
              onClick={() => setCategory(null)}
            >All</div>
            {categories.map(cat => (
              <div
                key={cat}
                className={`list-tab${category === cat ? ' active' : ''}`}
                onClick={() => setCategory(cat)}
              >{cat}</div>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="list-body">
        {loadingMessages ? (
          <div className="loading-center" style={{ paddingTop: 60 }}>
            <div className="spinner" />
            <span>Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="list-empty">
            <svg className="list-empty-icon" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
              <path d="M22 12h-6l-2 3H10l-2-3H2"/>
              <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
            </svg>
            <div className="list-empty-title">
              {search ? 'No results found' : 'All clear'}
            </div>
            <div className="list-empty-sub">
              {search ? `No messages match "${search}"` : 'No messages in this mailbox'}
            </div>
          </div>
        ) : (
          filtered.map(msg => (
            <MessageRow
              key={msg.id}
              msg={msg}
              mailbox={mailbox}
              selected={msg.id === selectedId}
              onSelect={() => selectMessage(msg.id)}
              onDelete={() => deleteMessage(msg.id)}
              onToggleStar={() => toggleStar(msg.id)}
              onReply={() => openCompose({ to: msg.from, subject: `Re: ${msg.subject}` })}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ── Single Row ── */
interface RowProps {
  msg: { id: number; from: string; to: string; subject: string; body?: string; received_at: string; category: string | null; is_starred?: boolean; is_read?: boolean; has_attachments?: boolean; };
  mailbox: string;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  onReply: () => void;
}

function MessageRow({ msg, mailbox, selected, onSelect, onDelete, onToggleStar, onReply }: RowProps) {
  const color = avatarColor(msg.from);
  const catColor = msg.category ? (CATEGORY_COLORS[msg.category] ?? '#888') : null;

  return (
    <div
      className={`msg-row${!msg.is_read ? ' unread' : ''}${selected ? ' selected' : ''}`}
      onClick={onSelect}
    >
      {/* Unread bar */}
      <div className="msg-row-bar" />

      {/* Avatar */}
      <div className="msg-row-avatar" style={{ background: color }}>
        {initials(msg.from)}
      </div>

      {/* Content */}
      <div className="msg-row-body">
        <div className="msg-row-top">
          <span className="msg-row-from">
            {mailbox === 'sent' ? `To: ${msg.to ? msg.to.split('@')[0] : 'Unknown'}` : msg.from.split('@')[0]}
          </span>
          {msg.has_attachments && (
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginLeft: 6, color: '#666' }}>
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          )}
          <span className="msg-row-time" style={{ marginLeft: 'auto' }}>{formatTime(msg.received_at)}</span>
        </div>
        <div className="msg-row-subject">{msg.subject || '(no subject)'}</div>
        <div className="msg-row-preview">{(msg.body ?? '').slice(0, 80)}</div>
        {msg.category && (
          <div className="msg-row-meta">
            <span className={`msg-cat-badge cat-${msg.category}`}>{msg.category}</span>
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div className="msg-row-actions" onClick={e => e.stopPropagation()}>
        <button className="row-action-btn" title={msg.is_starred ? 'Unstar' : 'Star'} onClick={onToggleStar}>
          <svg width="13" height="13" fill={msg.is_starred ? '#EAB308' : 'none'} stroke={msg.is_starred ? '#EAB308' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
        <button className="row-action-btn" title="Reply" onClick={onReply}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
          </svg>
        </button>
        <button className="row-action-btn danger" title={mailbox === 'trash' ? "Permanently Delete" : "Delete"} onClick={onDelete}>
          {mailbox === 'trash' ? (
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

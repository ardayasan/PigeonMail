import React, { useEffect, useRef, useState } from 'react';
import { useMail } from '../store';
import { avatarColor, CATEGORY_COLORS, formatFullTime, initials } from '../types';

export default function ThreadView() {
  const { selectedId, selectedMessage, loadingMessage, deleteMessage, openCompose, sendMessage, toast } = useMail();
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Clear reply and raw toggle when message changes
  useEffect(() => { 
    setReplyText(''); 
    setShowRaw(false);
  }, [selectedId]);

  // Auto-scroll to bottom on load
  useEffect(() => {
    if (selectedMessage && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [selectedMessage]);

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm('Delete this message?')) return;
    await deleteMessage(selectedId);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    setSending(true);
    try {
      await sendMessage(
        selectedMessage.from,
        `Re: ${selectedMessage.subject ?? ''}`,
        replyText,
        []
      );
      setReplyText('');
    } catch (e: any) {
      toast(e.message ?? 'Send failed', 'error');
    } finally {
      setSending(false);
    }
  };

  /* Empty state */
  if (!selectedId) {
    return (
      <div className="thread-pane">
        <div className="thread-empty">
          <svg className="thread-empty-icon" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
            <path d="M22 12h-6l-2 3H10l-2-3H2"/>
            <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
          </svg>
          <div className="thread-empty-text">Select a message to read</div>
          <div className="thread-empty-hint">
            <span className="kbd">j</span> / <span className="kbd">k</span> to navigate &nbsp;
            <span className="kbd">c</span> to compose
          </div>
        </div>
      </div>
    );
  }

  /* Loading */
  if (loadingMessage || !selectedMessage) {
    return (
      <div className="thread-pane">
        <div className="loading-center">
          <div className="spinner" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  const msg = selectedMessage;
  // Detail endpoint may return from_addr / to_addr instead of from / to
  const fromAddr = (msg as any).from || (msg as any).from_addr || '';
  const toAddr   = (msg as any).to   || (msg as any).to_addr   || '';
  const avatarBg = avatarColor(fromAddr);
  const catColor = msg.category ? (CATEGORY_COLORS[msg.category] ?? '#888') : null;

  return (
    <div className="thread-pane">
      {/* Header */}
      <div className="thread-header">
        <div className="thread-subject">{msg.subject || '(no subject)'}</div>
        <div className="thread-header-meta">
          {msg.category && catColor && (
            <span
              className="thread-cat-pill"
              style={{
                color: catColor,
                background: catColor + '18',
                border: `1px solid ${catColor}30`,
              }}
            >{msg.category}</span>
          )}
          <div className="thread-header-actions">
            <button
              className="thread-action-btn primary"
              onClick={() => openCompose({ to: fromAddr, subject: `Re: ${msg.subject}` })}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
              </svg>
              Reply
            </button>
            <button className="thread-action-btn" onClick={() =>
              openCompose({ to: '', subject: `Fwd: ${msg.subject}` })
            }>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 014-4h12"/>
              </svg>
              Forward
            </button>
            <button className="thread-action-btn danger" onClick={handleDelete}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              </svg>
              Delete
            </button>
            {msg.raw_content && (
              <button className={`thread-action-btn${showRaw ? ' primary' : ''}`} onClick={() => setShowRaw(!showRaw)}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                {showRaw ? 'Hide Original' : 'View Original'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scroll area */}
      <div className="thread-scroll" ref={scrollRef}>
        {/* Message bubble */}
        <div className="thread-message">
          <div className="thread-msg-header">
            <div className="thread-msg-avatar" style={{ background: avatarBg }}>
              {initials(fromAddr)}
            </div>
            <div className="thread-msg-sender-block">
              <div className="thread-msg-from">{fromAddr}</div>
              <div className="thread-msg-to">to {toAddr}</div>
            </div>
            <div className="thread-msg-time">{formatFullTime(msg.received_at)}</div>
          </div>
          <div className="thread-msg-body">
            {showRaw ? (
              <div style={{
                background: '#111', color: '#eee', padding: '12px', 
                borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px',
                whiteSpace: 'pre-wrap', overflowX: 'auto', border: '1px solid #333'
              }}>
                {msg.raw_content}
              </div>
            ) : (
              msg.body || '(empty message)'
            )}
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="thread-attachments" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #333' }}>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 8, fontWeight: 600 }}>Attachments</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {msg.attachments.map((att: any) => (
                    <a
                      key={att.id}
                      href={`/api/messages/${msg.id}/attachments/${att.id}?token=${localStorage.getItem('token')}`}
                      download
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: '#222', padding: '6px 12px', borderRadius: 6,
                        color: '#eee', textDecoration: 'none', fontSize: 13, border: '1px solid #444'
                      }}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                      </svg>
                      {att.filename}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inline reply */}
        <div className="thread-reply">
          <div className="thread-reply-header">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
            </svg>
            <span className="thread-reply-label">Reply to</span>
            <span className="thread-reply-to">{fromAddr}</span>
          </div>
          <textarea
            placeholder={`Reply to ${fromAddr.split('@')[0]}…`}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleReply();
            }}
          />
          <div className="thread-reply-footer">
            <span className="thread-reply-hint">
              <span className="kbd">⌘</span>+<span className="kbd">Enter</span> to send
            </span>
            <button
              className="thread-action-btn primary"
              style={{ padding: '6px 16px', fontSize: 13 }}
              onClick={handleReply}
              disabled={!replyText.trim() || sending}
            >
              {sending ? <span className="spinner" style={{ width: 12, height: 12, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} /> : 'Send Reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

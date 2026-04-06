import React, { useEffect, useRef, useState } from 'react';
import { useMail } from '../store';
import { avatarColor, CATEGORY_COLORS, formatFullTime, initials } from '../types';

const isPreviewable = (type: string) => type?.startsWith('image/') || type === 'application/pdf';

const DownloadIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const PreviewIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

export default function ThreadView() {
  const { selectedId, selectedMessage, loadingMessage, deleteMessage, openCompose, sendMessage, toast } = useMail();
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [previewAtt, setPreviewAtt] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Clear reply, raw toggle, and preview when message changes
  useEffect(() => { 
    setReplyText(''); 
    setShowRaw(false);
    setPreviewAtt(null);
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
              <div className="thread-attachments">
                <div className="thread-attachments-title">Attachments</div>
                <div className="thread-attachments-list">
                  {msg.attachments.map((att: any) => (
                    <div key={att.id} className="attachment-actions">
                      {isPreviewable(att.content_type) && (
                        <button className="attachment-action-btn preview" onClick={() => setPreviewAtt(att)}>
                          <PreviewIcon /> {att.filename}
                        </button>
                      )}
                      <a
                        href={`/api/messages/${msg.id}/attachments/${att.id}?token=${localStorage.getItem('token')}`}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="attachment-action-btn"
                        title="Download"
                      >
                        {!isPreviewable(att.content_type) && <DownloadIcon />}
                        {!isPreviewable(att.content_type) && <span> {att.filename}</span>}
                        {isPreviewable(att.content_type) && <DownloadIcon />}
                      </a>
                    </div>
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

      {/* Preview Modal */}
      {previewAtt && (
        <div className="preview-overlay" onClick={() => setPreviewAtt(null)}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <div className="preview-header">
              <div className="preview-title">{previewAtt.filename}</div>
              <button className="preview-close" onClick={() => setPreviewAtt(null)}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="preview-content">
              {isPreviewable(previewAtt.content_type) ? (
                previewAtt.content_type === 'application/pdf' ? (
                  <iframe 
                    src={`/api/messages/${msg.id}/attachments/${previewAtt.id}?token=${localStorage.getItem('token')}`} 
                    title={previewAtt.filename}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <img 
                    src={`/api/messages/${msg.id}/attachments/${previewAtt.id}?token=${localStorage.getItem('token')}`} 
                    alt={previewAtt.filename} 
                  />
                )
              ) : (
                <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>
                  <svg width="48" height="48" fill="none" stroke="#555" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: '16px' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 500 }}>No preview available</p>
                  <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#888' }}>This file type cannot be previewed. Please download it to view its contents.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

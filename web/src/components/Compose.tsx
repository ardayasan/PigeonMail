import React, { useEffect, useRef, useState } from 'react';
import { useMail } from '../store';

export default function ComposeModal() {
  const { composing, composeTo, composeSubject, sendMessage, closeCompose, toast } = useMail();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [toInput, setToInput] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const toInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (composing) {
      setRecipients(composeTo ? [composeTo] : []);
      setToInput('');
      setSubject(composeSubject);
      setBody('');
      setFiles([]);
      setTimeout(() => {
        if (!composeTo) toInputRef.current?.focus();
        else document.getElementById('compose-body')?.focus();
      }, 50);
    }
  }, [composing, composeTo, composeSubject]);

  if (!composing) return null;

  const addRecipient = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return;
    if (!trimmed.includes('@')) {
      toast(`"${trimmed}" is not a valid email address`, 'error');
      return;
    }
    if (recipients.includes(trimmed)) {
      setToInput('');
      return;
    }
    setRecipients(prev => [...prev, trimmed]);
    setToInput('');
  };

  const removeRecipient = (r: string) => {
    setRecipients(prev => prev.filter(x => x !== r));
  };

  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      e.preventDefault();
      addRecipient(toInput);
    } else if (e.key === 'Backspace' && !toInput && recipients.length > 0) {
      setRecipients(prev => prev.slice(0, -1));
    }
  };

  const handleToBlur = () => {
    if (toInput.trim()) addRecipient(toInput);
  };

  const handleSend = async () => {
    // Commit any pending input
    const pending = toInput.trim();
    const allRecipients = pending ? [...recipients, pending] : recipients;
    if (allRecipients.length === 0) { toast('Please enter at least one recipient.', 'error'); return; }
    setSending(true);
    try {
      // Join recipients with comma — backend will split them
      await sendMessage(allRecipients.join(','), subject.trim(), body.trim(), files);
      setRecipients([]); setToInput(''); setSubject(''); setBody(''); setFiles([]);
    } catch (e: any) {
      toast(e.message ?? 'Send failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { closeCompose(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend();
  };

  return (
    <div className="compose-overlay" onKeyDown={handleKeyDown}>
      <div className="compose-window" role="dialog" aria-label="Compose message">
        {/* Title bar */}
        <div className="compose-titlebar">
          <span className="compose-title">New Message</span>
          <div className="compose-window-actions">
            <button className="compose-window-btn" title="Minimize" onClick={closeCompose}>─</button>
            <button className="compose-window-btn" title="Close" onClick={closeCompose}>✕</button>
          </div>
        </div>

        {/* To — multi-chip field */}
        <div className="compose-field" style={{ flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
          <label className="compose-field-label">To</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', flex: 1, gap: 4, alignItems: 'center', padding: '4px 0' }}>
            {recipients.map(r => (
              <span key={r} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(79,70,229,0.15)', color: '#818CF8',
                border: '1px solid rgba(79,70,229,0.35)', borderRadius: 20,
                padding: '2px 8px 2px 10px', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
              }}>
                {r}
                <button onClick={() => removeRecipient(r)} style={{
                  background: 'none', border: 'none', color: '#818CF8', cursor: 'pointer',
                  padding: 0, display: 'flex', lineHeight: 1, fontSize: 14, opacity: 0.7,
                }}>×</button>
              </span>
            ))}
            <input
              ref={toInputRef}
              type="text"
              placeholder={recipients.length === 0 ? 'recipient@localhost, another@localhost…' : 'Add another…'}
              value={toInput}
              onChange={e => setToInput(e.target.value)}
              onKeyDown={handleToKeyDown}
              onBlur={handleToBlur}
              autoCapitalize="none"
              style={{ flex: 1, minWidth: 160, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }}
            />
          </div>
        </div>

        {/* Subject */}
        <div className="compose-field">
          <label className="compose-field-label">Subject</label>
          <input
            type="text"
            placeholder="(no subject)"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>

        {/* Body */}
        <div className="compose-body">
          <textarea
            id="compose-body"
            placeholder="Write your message…"
            value={body}
            onChange={e => setBody(e.target.value)}
          />
        </div>

        {/* Attachments UI */}
        <div className="compose-attachments-area" style={{ padding: '0 16px 12px' }}>
          {files.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {files.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, background: '#1e1e1e',
                  border: '1px solid #333', padding: '6px 12px', borderRadius: 8, fontSize: 13,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  <svg width="14" height="14" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/>
                  </svg>
                  <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#eee' }}>
                    {f.name}
                  </span>
                  <span style={{ color: '#666', fontSize: 11 }}>{(f.size / 1024).toFixed(0)}KB</span>
                  <button
                    onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                    style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 2, display: 'flex' }}
                    title="Remove attachment"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={e => {
              if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]);
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'transparent', border: '1px dashed #444', color: '#aaa',
              padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, transition: 'all 0.2s',
              width: 'max-content'
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#666'; e.currentTarget.style.color = '#eee'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#aaa'; }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
            Attach files
          </button>
        </div>

        {/* Footer */}
        <div className="compose-footer">
          <button className="compose-send-btn" onClick={handleSend} disabled={sending || (recipients.length === 0 && !toInput.trim())}>
            {sending
              ? <span className="spinner" style={{ width: 13, height: 13, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
              : `Send${recipients.length > 1 ? ` to ${recipients.length}` : ''}`}
          </button>
          <button className="compose-discard-btn" onClick={closeCompose}>Discard</button>
          <span className="compose-footer-hint">
            <span className="kbd">⌘</span>+<span className="kbd">↵</span> to send · Enter/Tab/comma to add recipient
          </span>
        </div>
      </div>
    </div>
  );
}

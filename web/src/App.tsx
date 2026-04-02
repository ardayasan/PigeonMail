import React, { useEffect } from 'react';
import { useMail } from './store';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import MessageList from './components/MessageList';
import ThreadView from './components/ThreadView';
import ComposeModal from './components/Compose';
import LiveLogs from './components/LiveLogs';

/* ── Keyboard Shortcuts ── */
function useKeyboard() {
  const { messages, selectedId, selectMessage, openCompose, deleteMessage } = useMail();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      // Don't fire shortcuts when typing in inputs
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const idx = messages.findIndex(m => m.id === selectedId);

      switch (e.key) {
        case 'j': // next message
          if (idx < messages.length - 1) selectMessage(messages[idx + 1].id);
          else if (messages.length > 0 && idx === -1) selectMessage(messages[0].id);
          break;
        case 'k': // prev message
          if (idx > 0) selectMessage(messages[idx - 1].id);
          break;
        case 'c': // compose
          openCompose();
          break;
        case 'e': // delete current
        case '#':
          if (selectedId) { deleteMessage(selectedId); }
          break;
        case 'r': // reply
          if (selectedId) {
            const msg = messages.find(m => m.id === selectedId);
            if (msg) openCompose({ to: msg.from, subject: `Re: ${msg.subject}` });
          }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [messages, selectedId, selectMessage, openCompose, deleteMessage]);
}

/* ── Toast Container ── */
function Toasts() {
  const { toasts } = useMail();
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type !== 'default' ? t.type : ''}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ── Main App ── */
function MailApp() {
  useKeyboard();
  return (
    <div className="app-shell">
      <Sidebar />
      <MessageList />
      <ThreadView />
      <ComposeModal />
      <Toasts />
      <LiveLogs />
    </div>
  );
}

export default function App() {
  const { user } = useMail();
  return user ? <MailApp /> : <Auth />;
}

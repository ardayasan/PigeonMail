import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { api } from './api';
import type { Message, Mailbox, Toast } from './types';

/* ── State ── */
interface State {
  user: { username: string } | null;
  messages: Message[];
  selectedId: number | null;
  selectedMessage: Message | null;
  loadingMessages: boolean;
  loadingMessage: boolean;
  mailbox: Mailbox;
  category: string | null;
  categories: string[];
  search: string;
  composing: boolean;
  composeTo: string;
  composeSubject: string;
  toasts: Toast[];
  serverLogs: string[];
  inboxCount: number;
}

const init: State = {
  user: null,
  messages: [],
  selectedId: null,
  selectedMessage: null,
  loadingMessages: false,
  loadingMessage: false,
  mailbox: 'inbox',
  category: null,
  categories: [],
  search: '',
  composing: false,
  composeTo: '',
  composeSubject: '',
  toasts: [],
  serverLogs: [],
  inboxCount: 0,
};

/* ── Actions ── */
type Action =
  | { type: 'SET_USER';      payload: { username: string } | null }
  | { type: 'SET_MESSAGES';  payload: Message[] }
  | { type: 'SET_CATEGORIES'; payload: string[] }
  | { type: 'SELECT_MSG';    payload: { id: number | null; msg: Message | null } }
  | { type: 'SET_MAILBOX';   payload: Mailbox }
  | { type: 'SET_CATEGORY';  payload: string | null }
  | { type: 'SET_SEARCH';    payload: string }
  | { type: 'SET_LOADING_MSGS'; payload: boolean }
  | { type: 'SET_LOADING_MSG';  payload: boolean }
  | { type: 'DELETE_MSG';    payload: number }
  | { type: 'OPEN_COMPOSE';  payload: { to?: string; subject?: string } }
  | { type: 'CLOSE_COMPOSE' }
  | { type: 'PUSH_TOAST';    payload: Toast }
  | { type: 'POP_TOAST';     payload: string }
  | { type: 'ADD_SERVER_LOG'; payload: string }
  | { type: 'TOGGLE_STAR';    payload: { id: number; is_starred: boolean } }
  | { type: 'MARK_READ';      payload: number }
  | { type: 'SET_STATS';      payload: { inbox: number } };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'SET_USER':          return { ...s, user: a.payload };
    case 'SET_MESSAGES':      return { ...s, messages: a.payload };
    case 'SET_CATEGORIES':    return { ...s, categories: a.payload };
    case 'SELECT_MSG':        return { ...s, selectedId: a.payload.id, selectedMessage: a.payload.msg };
    case 'SET_MAILBOX':       return { ...s, mailbox: a.payload, selectedId: null, selectedMessage: null, category: null };
    case 'SET_CATEGORY':      return { ...s, category: a.payload };
    case 'SET_SEARCH':        return { ...s, search: a.payload };
    case 'SET_LOADING_MSGS':  return { ...s, loadingMessages: a.payload };
    case 'SET_LOADING_MSG':   return { ...s, loadingMessage: a.payload };
    case 'DELETE_MSG':
      return {
        ...s,
        messages: s.messages.filter(m => m.id !== a.payload),
        selectedId: s.selectedId === a.payload ? null : s.selectedId,
        selectedMessage: s.selectedId === a.payload ? null : s.selectedMessage,
      };
    case 'OPEN_COMPOSE':
      return { ...s, composing: true, composeTo: a.payload.to ?? '', composeSubject: a.payload.subject ?? '' };
    case 'CLOSE_COMPOSE':     return { ...s, composing: false, composeTo: '', composeSubject: '' };
    case 'PUSH_TOAST':        return { ...s, toasts: [...s.toasts, a.payload] };
    case 'POP_TOAST':         return { ...s, toasts: s.toasts.filter(t => t.id !== a.payload) };
    case 'ADD_SERVER_LOG':
      return { ...s, serverLogs: [...s.serverLogs.slice(-99), a.payload] };
    case 'TOGGLE_STAR':
      return {
        ...s,
        messages: s.messages.map(m => m.id === a.payload.id ? { ...m, is_starred: a.payload.is_starred } : m),
        selectedMessage: s.selectedMessage?.id === a.payload.id ? { ...s.selectedMessage, is_starred: a.payload.is_starred } : s.selectedMessage
      };
    case 'MARK_READ':
      return {
        ...s,
        messages: s.messages.map(m => m.id === a.payload ? { ...m, is_read: true } : m),
        selectedMessage: s.selectedMessage?.id === a.payload ? { ...s.selectedMessage, is_read: true } : s.selectedMessage
      };
    case 'SET_STATS':
      return { ...s, inboxCount: a.payload.inbox };
    default:                  return s;
  }
}

/* ── Context ── */
interface Ctx extends State {
  login:    (u: string, p: string) => Promise<void>;
  register: (u: string, p: string) => Promise<void>;
  logout:   () => void;
  loadMessages: () => Promise<void>;
  selectMessage: (id: number) => Promise<void>;
  setMailbox:   (m: Mailbox) => void;
  setCategory:  (c: string | null) => void;
  setSearch:    (q: string) => void;
  sendMessage:  (to: string, subject: string, body: string, files: File[]) => Promise<void>;
  deleteMessage: (id: number) => Promise<void>;
  toggleStar:   (id: number) => Promise<void>;
  openCompose:  (opts?: { to?: string; subject?: string }) => void;
  closeCompose: () => void;
  toast: (text: string, type?: Toast['type']) => void;
}

const MailCtx = createContext<Ctx>({} as Ctx);
export const useMail = () => useContext(MailCtx);

export function MailProvider({ children }: { children: React.ReactNode }) {
  const [s, dispatch] = useReducer(reducer, init);

  /* Restore session */
  useEffect(() => {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('username');
    if (t && u) dispatch({ type: 'SET_USER', payload: { username: u } });
  }, []);

  /* Subscribe to Server Logs — connect DIRECTLY to backend (bypass Vite proxy buffering) */
  useEffect(() => {
    const sse = new EventSource('http://localhost:8080/logs/stream');
    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const msg = typeof data === 'string' ? data : JSON.stringify(data);
        dispatch({ type: 'ADD_SERVER_LOG', payload: msg });
      } catch {
        if (e.data) dispatch({ type: 'ADD_SERVER_LOG', payload: e.data });
      }
    };
    sse.onerror = () => {};
    return () => sse.close();
  }, []);

  /* Reload messages when mailbox / category changes */
  useEffect(() => {
    if (s.user) loadMessages();
  }, [s.user, s.mailbox, s.category]);

  /* Load categories once after login */
  useEffect(() => {
    if (!s.user) return;
    api.getCategories().then(cats => dispatch({ type: 'SET_CATEGORIES', payload: cats })).catch(() => {});
  }, [s.user]);

  const toast = useCallback((text: string, type: Toast['type'] = 'default') => {
    const id = Math.random().toString(36).slice(2);
    dispatch({ type: 'PUSH_TOAST', payload: { id, text, type } });
    setTimeout(() => dispatch({ type: 'POP_TOAST', payload: id }), 3000);
  }, []);

  const login = useCallback(async (u: string, p: string) => {
    const r = await api.login(u, p);
    localStorage.setItem('token', r.token);
    localStorage.setItem('username', r.username);
    dispatch({ type: 'SET_USER', payload: { username: r.username } });
  }, []);

  const register = useCallback(async (u: string, p: string) => {
    const r = await api.register(u, p);
    localStorage.setItem('token', r.token);
    localStorage.setItem('username', r.username);
    dispatch({ type: 'SET_USER', payload: { username: r.username } });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_MESSAGES', payload: [] });
  }, []);

  const loadMessages = useCallback(async () => {
    dispatch({ type: 'SET_LOADING_MSGS', payload: true });
    try {
      const msgs = await api.getMessages(s.mailbox, s.category ?? undefined);
      dispatch({ type: 'SET_MESSAGES', payload: msgs });
      // Refresh categories and stats
      const cats = await api.getCategories();
      dispatch({ type: 'SET_CATEGORIES', payload: cats });
      const stats = await api.getStats();
      dispatch({ type: 'SET_STATS', payload: stats });
    } catch {
      // silent
    } finally {
      dispatch({ type: 'SET_LOADING_MSGS', payload: false });
    }
  }, [s.mailbox, s.category]);

  const selectMessage = useCallback(async (id: number) => {
    dispatch({ type: 'SELECT_MSG', payload: { id, msg: null } });
    dispatch({ type: 'SET_LOADING_MSG', payload: true });
    try {
      const msg = await api.getMessage(id);
      dispatch({ type: 'SELECT_MSG', payload: { id, msg } });
      
      const msgListState = s.messages.find(m => m.id === id);
      if (msgListState && !msgListState.is_read) {
        await api.markRead(id);
        dispatch({ type: 'MARK_READ', payload: id });
        const stats = await api.getStats();
        dispatch({ type: 'SET_STATS', payload: stats });
      }
    } catch {
      dispatch({ type: 'SELECT_MSG', payload: { id: null, msg: null } });
    } finally {
      dispatch({ type: 'SET_LOADING_MSG', payload: false });
    }
  }, [s.messages]);

  const deleteMessage = useCallback(async (id: number) => {
    await api.deleteMessage(id);
    dispatch({ type: 'DELETE_MSG', payload: id });
    toast('Message deleted', 'default');
    api.getStats().then(stats => dispatch({ type: 'SET_STATS', payload: stats })).catch(() => {});
  }, [toast]);

  const toggleStar = useCallback(async (id: number) => {
    const result = await api.toggleStar(id);
    dispatch({ type: 'TOGGLE_STAR', payload: { id, is_starred: result.is_starred } });
  }, []);

  const sendMessage = useCallback(async (to: string, subject: string, body: string, files: File[]) => {
    await api.sendMessage(to, subject, body, files);
    toast('Message sent', 'success');
    dispatch({ type: 'CLOSE_COMPOSE' });
    // Reload
    const msgs = await api.getMessages(s.mailbox, s.category ?? undefined);
    dispatch({ type: 'SET_MESSAGES', payload: msgs });
  }, [s.mailbox, s.category, toast]);

  const setMailbox  = useCallback((m: Mailbox)       => dispatch({ type: 'SET_MAILBOX',  payload: m }), []);
  const setCategory = useCallback((c: string | null)  => dispatch({ type: 'SET_CATEGORY', payload: c }), []);
  const setSearch   = useCallback((q: string)         => dispatch({ type: 'SET_SEARCH',   payload: q }), []);
  const openCompose = useCallback((opts = {})          => dispatch({ type: 'OPEN_COMPOSE', payload: opts }), []);
  const closeCompose = useCallback(()                  => dispatch({ type: 'CLOSE_COMPOSE' }), []);

  return (
    <MailCtx.Provider value={{
      ...s,
      login, register, logout,
      loadMessages, selectMessage,
      setMailbox, setCategory, setSearch,
      sendMessage, deleteMessage, toggleStar,
      openCompose, closeCompose,
      toast,
    }}>
      {children}
    </MailCtx.Provider>
  );
}

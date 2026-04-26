import type { Message } from './types';

const BASE = '/api';

function token(): string {
  return localStorage.getItem('token') ?? '';
}

async function req<T>(method: string, path: string, body?: object | FormData, auth = true): Promise<T> {
  const headers: Record<string, string> = {};
  if (auth) headers['Authorization'] = `Bearer ${token()}`;

  let requestBody: BodyInit | undefined;
  if (body instanceof FormData) {
    requestBody = body; // let browser set content-type with boundary automatically
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: requestBody,
    signal: AbortSignal.timeout(8000),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as T;
}

export interface AuthResult { token: string; username: string; }

export const api = {
  login:    (u: string, p: string) => req<AuthResult>('POST', '/auth/login',    { username: u, password: p }, false),
  register: (u: string, p: string) => req<AuthResult>('POST', '/auth/register', { username: u, password: p }, false),

  getMessages:  (mailbox: string, category?: string) => 
    req<Message[]>('GET', `/messages?mailbox=${mailbox}${category ? `&category=${encodeURIComponent(category)}` : ''}`),
  getMessage:   (id: number)        => req<Message>('GET', `/messages/${id}`),
  getStats:     ()                  => req<{ inbox: number }>('GET', '/messages/stats'),
  markRead:     (id: number)        => req('POST', `/messages/${id}/read`),
  
  sendMessage: (to: string, subject: string, body: string, files: File[]) => {
    const fd = new FormData();
    fd.append('to', to);
    fd.append('subject', subject);
    fd.append('body', body);
    files.forEach(f => fd.append('attachments', f));
    return req<{ id: number }>('POST', '/messages/send', fd);
  },
  
  deleteMessage: (id: number)       => req<void>('DELETE', `/messages/${id}`),
  toggleStar:    (id: number)       => req<{ is_starred: boolean }>('POST', `/messages/${id}/star`),
  getCategories: ()                 => req<string[]>('GET', '/messages/categories'),
  messageStreamUrl: ()              => `http://localhost:8080/messages/stream?token=${encodeURIComponent(token())}`,
};

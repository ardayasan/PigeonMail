/**
 * src/api/client.ts
 * Thin wrapper around the mail server REST API (port 8080).
 *
 * Change SERVER_URL if running on a physical device — use your machine's
 * LAN IP instead of localhost (e.g. "http://192.168.1.x:8080").
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const SERVER_URL = 'http://localhost:8080';

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'auth_token';
const USERNAME_KEY = 'auth_username';

export async function saveAuth(token: string, username: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USERNAME_KEY, username);
}

export async function loadAuth(): Promise<{ token: string; username: string } | null> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const username = await AsyncStorage.getItem(USERNAME_KEY);
  if (token && username) return { token, username };
  return null;
}

export async function clearAuth() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USERNAME_KEY);
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function authHeader(): Promise<Record<string, string>> {
  const auth = await loadAuth();
  if (!auth) return {};
  return { Authorization: `Bearer ${auth.token}` };
}

async function request<T>(
  method: string,
  path: string,
  body?: object,
  authenticated = true,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authenticated) Object.assign(headers, await authHeader());

  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthResponse {
  token: string;
  username: string;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('POST', '/auth/login', { username, password }, false);
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('POST', '/auth/register', { username, password }, false);
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export interface MessageSummary {
  id: number;
  from: string;
  to: string;
  subject: string;
  received_at: string;
  category: string | null;
}

export interface MessageDetail extends MessageSummary {
  // Detail endpoint returns raw DB column names
  from_addr: string;
  to_addr: string;
  body: string;
  is_deleted: number;
}

export async function getMessages(category?: string): Promise<MessageSummary[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return request<MessageSummary[]>('GET', `/messages${qs}`);
}

export async function getMessage(id: number): Promise<MessageDetail> {
  return request<MessageDetail>('GET', `/messages/${id}`);
}

export async function sendMessage(
  to: string,
  subject: string,
  body: string,
): Promise<{ id: number; status: string }> {
  return request('POST', '/messages/send', { to, subject, body });
}

export async function deleteMessage(id: number): Promise<void> {
  await request('DELETE', `/messages/${id}`);
}

export async function getCategories(): Promise<string[]> {
  return request<string[]>('GET', '/messages/categories');
}

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'refa3y.session-token';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://refa3y.cc/api/proc.php';

export type ApiEnvelope<T> = { status: number; message: string; data: T; errors?: Record<string, string> };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly errors?: Record<string, string>) {
    super(message);
  }
}

let memoryToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return memoryToken;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  memoryToken = token;
  if (Platform.OS === 'web') return;
  if (token === null) await SecureStore.deleteItemAsync(TOKEN_KEY);
  else await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function api<T>(action: string, options: { method?: string; body?: Record<string, unknown>; authenticated?: boolean; query?: Record<string, string | number | undefined> } = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const query = new URLSearchParams({ action });
  for (const [key, value] of Object.entries(options.query ?? {})) if (value !== undefined) query.set(key, String(value));
  const token = options.authenticated === false ? null : await getToken();
  const response = await fetch(`${API_URL}?${query.toString()}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify({ action, ...options.body }) : undefined,
  });
  let payload: ApiEnvelope<T>;
  try { payload = await response.json() as ApiEnvelope<T>; }
  catch { throw new ApiError('The server returned an invalid response.', response.status); }
  if (!response.ok || payload.status >= 400) throw new ApiError(payload.message || 'Request failed.', payload.status, payload.errors);
  return payload.data;
}

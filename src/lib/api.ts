import * as SecureStore from 'expo-secure-store';
import { fetch as expoFetch } from 'expo/fetch';
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
let tokenWrites: Promise<void> = Promise.resolve();

export async function getToken(): Promise<string | null> {
  await tokenWrites;
  if (Platform.OS === 'web') return memoryToken;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  const write = tokenWrites.then(async () => {
    if (Platform.OS === 'web') { memoryToken = token; return; }
    if (token === null) await SecureStore.deleteItemAsync(TOKEN_KEY);
    else await SecureStore.setItemAsync(TOKEN_KEY, token);
  });
  // Keep later writes available; the original failure still reaches its caller.
  tokenWrites = write.catch(() => {});
  await write;
}

export function mediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.startsWith('?action=media%2Fproduct&key=') ? `${API_URL}${value}` : value;
}

export async function api<T>(action: string, options: { method?: string; body?: Record<string, unknown>; form?: FormData; authenticated?: boolean; query?: Record<string, string | number | undefined> } = {}): Promise<T> {
  if (options.body && options.form) throw new Error('Provide either a JSON body or a multipart form.');
  const method = options.method ?? 'GET';
  const query = new URLSearchParams({ action });
  for (const [key, value] of Object.entries(options.query ?? {})) if (value !== undefined) query.set(key, String(value));
  const token = options.authenticated === false ? null : await getToken();
  const url = `${API_URL}?${query.toString()}`;
  const response = await (options.form ? expoFetch : fetch)(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.form ?? (options.body ? JSON.stringify({ action, ...options.body }) : undefined),
  }).catch((error: unknown) => {
    console.error(`[api] Network error for "${action}"`, { url, error });
    throw new ApiError('Could not reach the server. Check your connection.', 0);
  });
  const raw = await response.text();
  let payload: ApiEnvelope<T>;
  try { payload = JSON.parse(raw.replace(/^\uFEFF/, '')) as ApiEnvelope<T>; }
  catch {
    // Non-JSON usually means a PHP error page, a proxy/HTML response, or a wrong EXPO_PUBLIC_API_URL.
    console.error(`[api] Invalid response for "${action}"`, {
      url,
      status: response.status,
      contentType: response.headers.get('content-type'),
      responseLength: raw.length,
    });
    throw new ApiError(`The server returned an invalid response (HTTP ${response.status}).`, response.status);
  }
  if (!response.ok || payload.status >= 400) {
    if (__DEV__) console.warn(`[api] "${action}" failed`, { status: payload.status ?? response.status, message: payload.message, errors: payload.errors, requestId: (payload as { request_id?: string }).request_id, authorizationSent: !!token });
    throw new ApiError(payload.message || 'Request failed.', payload.status ?? response.status, payload.errors);
  }
  return payload.data;
}

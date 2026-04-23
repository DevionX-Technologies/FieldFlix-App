import { BASE_URL } from '@/data/constants';
import axiosInstance from '@/utils/axiosInstance';
import { unwrapNestPayload } from '@/utils/unwrapNestPayload';
import axios, { type AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

/** Readable message from Nest/axios errors (400 body is often lost on `Error.message`). */
export function getFieldflixApiErrorMessage(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { message?: string | string[] } | undefined;
    if (data?.message != null) {
      return Array.isArray(data.message) ? data.message.join('\n') : String(data.message);
    }
    if (e.response?.status && e.message) {
      return `${e.message}${e.response.data ? ` — ${JSON.stringify(e.response.data)}` : ''}`;
    }
    // No HTTP response (timeout, refused, DNS, wrong host): `e.message` is often just "Network Error"
    if (!e.response) {
      const ax = e as AxiosError;
      const code = ax.code;
      const bits: string[] = [ax.message || 'Request failed'];
      if (code) bits.push(`(${code})`);
      if (ax.config) {
        const fullUrl = `${ax.config.baseURL ?? ''}${ax.config.url ?? ''}`;
        if (fullUrl) {
          bits.push(`— ${fullUrl}`);
        }
        if (code === 'ERR_NETWORK' && (ax.config.baseURL ?? '').includes('ngrok')) {
          bits.push('Tip: use https://…ngrok-free.app (no :8000). Rebuild the app after changing the API URL.');
        }
      }
      return bits.join(' ');
    }
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

/** E.164 without + for MSG91-style APIs (e.g. 9198xxxxxxxx) */
export function normalizeMobile(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `91${d}`;
  return d;
}

/** @deprecated use `unwrapNestPayload` from `@/utils/unwrapNestPayload` — kept for any older imports */
export { unwrapNestPayload as unwrapNest } from '@/utils/unwrapNestPayload';

export async function sendOtp(mobile: string) {
  const m = normalizeMobile(mobile);
  const { data } = await axiosInstance.post<{ message: string }>('/auth/send-otp', {
    mobile: m,
  });
  return data;
}

export type VerifyOtpResponse = {
  token: string;
  isFirstTimeLogin: boolean;
  name: string | null;
  phone_number: string;
  profile_image_path: string | null;
};

export async function verifyOtp(mobile: string, otp: string) {
  const m = normalizeMobile(mobile);
  const { data } = await axiosInstance.post<VerifyOtpResponse>('/auth/verify-otp', {
    mobile: m,
    otp: otp.replace(/\D/g, '').slice(0, 6),
  });
  return data;
}

export async function getNotificationCount() {
  const { data } = await axiosInstance.get('/notification/user/count');
  if (typeof data === 'number' && !Number.isNaN(data)) return data;
  if (data && typeof data === 'object' && 'count' in data) {
    const c = (data as { count?: number }).count;
    return typeof c === 'number' && !Number.isNaN(c) ? c : 0;
  }
  return 0;
}

export async function getMyRecordings() {
  const { data } = await axiosInstance.get('/recording/my-recordings');
  return Array.isArray(data) ? data : [];
}

export async function getSharedWithMe() {
  const { data } = await axiosInstance.get('/recording/shared-with-me');
  return Array.isArray(data) ? data : [];
}

/** Backend `ESportsSupported`: e.g. `Pickleball`, `Paddle`, `Cricket`. */
export type TurfsListParams = {
  page?: number;
  limit?: number;
  /** Single sport enum value (matches `GetTurfsQueryDto.sports_supported`). */
  sports_supported?: string;
  latitude?: number;
  longitude?: number;
  /** Kilometers — used with lat/lng (`GetTurfsQueryDto.radius`). */
  radiusKm?: number;
};

export async function getTurfsPage(
  page = 1,
  limit = 30,
  extra?: TurfsListParams,
) {
  const params: Record<string, string | number> = {
    page: extra?.page ?? page,
    limit: extra?.limit ?? limit,
  };
  if (extra?.sports_supported) params.sports_supported = extra.sports_supported;
  if (extra?.latitude != null) params.latitude = extra.latitude;
  if (extra?.longitude != null) params.longitude = extra.longitude;
  if (extra?.radiusKm != null) params.radius = extra.radiusKm;
  const { data } = await axiosInstance.get('/turfs', { params });
  return data;
}

export async function getUser(userId: string) {
  const { data } = await axiosInstance.get(`/users/${userId}`);
  return data;
}

export type FieldflixUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  profile_image_path: string | null;
  singUp_Method?: string | null;
  created_at?: string;
  updated_at?: string;
};

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function atobSafe(input: string): string {
  if (typeof globalThis.atob === 'function') return globalThis.atob(input);
  let str = input.replace(/=+$/, '');
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const ch of str) {
    const idx = B64_CHARS.indexOf(ch);
    if (idx < 0) continue;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

/**
 * Decode a JWT payload without verifying the signature (client-only).
 * Mirrors `auth/strategy/jwt.strategy.ts` — expects `{ user_id, email? }`.
 */
export function decodeJwt(token: string): { user_id?: string; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = payload.length % 4;
    if (pad) payload += '='.repeat(4 - pad);
    const bytes = atobSafe(payload);
    return JSON.parse(bytes) as { user_id?: string; email?: string };
  } catch {
    return null;
  }
}

/** Resolves the currently authenticated user via JWT `user_id` → `/users/:id`. */
export async function getMyProfile(token: string): Promise<FieldflixUser | null> {
  const payload = decodeJwt(token);
  if (!payload?.user_id) return null;
  try {
    return await getUser(payload.user_id);
  } catch {
    return null;
  }
}

export async function patchUser(body: Record<string, unknown>) {
  const { data } = await axiosInstance.patch<unknown>('/users', body);
  return data;
}

/**
 * Upload a profile picture (jpeg/png) to the backend.
 * Mirrors `user.controller.ts → @Patch('/upload/profile/picture')`.
 *
 * Uses native `fetch` so React Native's networking layer assembles the
 * multipart body (with proper boundary) from the `FormData` instance —
 * axios on RN often strips the boundary when `Content-Type` is forced.
 *
 * Returns the signed S3 URL (string) on success.
 */
export async function uploadProfilePicture(params: {
  uri: string;
  name?: string;
  mimeType?: string;
}): Promise<string> {
  const token = await SecureStore.getItemAsync('token');
  if (!token) throw new Error('Not authenticated');
  const mime =
    params.mimeType ??
    (params.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
  const name =
    params.name ?? (mime === 'image/png' ? 'avatar.png' : 'avatar.jpg');
  const form = new FormData();
  form.append('file', {
    uri: params.uri,
    name,
    type: mime,
  } as unknown as Blob);

  const ngrokHeaders =
    BASE_URL.includes('ngrok') ? { 'ngrok-skip-browser-warning': 'true' } : {};
  const res = await fetch(`${BASE_URL}/users/upload/profile/picture`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'FieldFlicks/1.0 (React Native; FieldFlicks Mobile)',
      Authorization: `Bearer ${token}`,
      ...ngrokHeaders,
      // Do NOT set Content-Type here — RN adds `multipart/form-data;
      // boundary=...` automatically from the FormData body. Setting it
      // manually drops the boundary and the server rejects the payload.
    },
    body: form as unknown as BodyInit,
  });

  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try {
      const body = await res.text();
      if (body) {
        try {
          const parsed = JSON.parse(body) as { message?: string | string[] };
          if (parsed?.message) {
            msg = Array.isArray(parsed.message)
              ? parsed.message.join('\n')
              : String(parsed.message);
          } else {
            msg = `${msg}: ${body.slice(0, 200)}`;
          }
        } catch {
          msg = `${msg}: ${body.slice(0, 200)}`;
        }
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    const raw = await res.json();
    const unwrapped = unwrapNestPayload<string | { data?: string; message?: string }>(raw);
    if (typeof unwrapped === 'string') return unwrapped;
    if (unwrapped && typeof unwrapped === 'object' && 'data' in unwrapped) {
      return (unwrapped as { data?: string }).data ?? '';
    }
    return typeof unwrapped === 'object' && unwrapped && 'message' in unwrapped
      ? String((unwrapped as { message?: string }).message ?? '')
      : '';
  }
  const text = await res.text();
  return text.replace(/^"|"$/g, '');
}

export async function getNotifications(page = 1) {
  const { data } = await axiosInstance.get('/notification', {
    params: { page },
  });
  return data;
}

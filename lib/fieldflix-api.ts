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

const DEBUG_BODY_MAX = 1200;

/**
 * Multi-line details for dev-friendly alerts: HTTP status, URL, response body.
 * Server "logs" only appear here if the backend includes them in the JSON body.
 */
export function getFieldflixApiErrorDebug(e: unknown): string {
  if (!axios.isAxiosError(e)) {
    return e instanceof Error ? e.message : String(e);
  }
  const lines: string[] = [];
  if (e.response?.status != null) {
    lines.push(`HTTP ${e.response.status}`);
  }
  if (e.config) {
    const method = (e.config.method ?? 'GET').toUpperCase();
    const fullUrl = `${e.config.baseURL ?? ''}${e.config.url ?? ''}`;
    if (fullUrl) lines.push(`${method} ${fullUrl}`);
  }
  if (e.code) lines.push(`code: ${e.code}`);
  const data = e.response?.data;
  if (data != null) {
    const raw =
      typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    lines.push(
      raw.length > DEBUG_BODY_MAX
        ? `Response (truncated):\n${raw.slice(0, DEBUG_BODY_MAX)}…`
        : `Response:\n${raw}`,
    );
  } else if (!e.response) {
    lines.push(getFieldflixApiErrorMessage(e, e.message));
  }
  return lines.join('\n');
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

export async function checkPhoneAccountExists(
  mobile: string,
): Promise<{ exists: boolean }> {
  const m = normalizeMobile(mobile);
  const { data } = await axiosInstance.post<{ exists: boolean }>(
    '/auth/account-exists',
    { mobile: m },
  );
  return { exists: !!data?.exists };
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

/**
 * `GET /recording/*` can arrive as a raw array, or nested as `{ items }`, `{ recordings }`, etc.
 * after intermediaries. Used so Sessions and Recordings both show the same rows.
 */
export function coerceToRecordingList(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload == null || typeof payload !== 'object') return [];
  const o = payload as Record<string, unknown>;
  const fromKeys = (obj: Record<string, unknown>): unknown[] | null => {
    for (const k of [
      'data',
      'items',
      'recordings',
      'results',
      'rows',
      'sharedRecordings',
      'shared_recordings',
      'shared',
    ]) {
      const v = obj[k];
      if (Array.isArray(v)) return v;
    }
    return null;
  };
  const top = fromKeys(o);
  if (top) return top as any[];
  const inner = o.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const nested = fromKeys(inner as Record<string, unknown>);
    if (nested) return nested as any[];
  }
  return [];
}

export async function getMyRecordings() {
  const { data } = await axiosInstance.get('/recording/my-recordings');
  return coerceToRecordingList(data);
}

/** Single recording with related entities (`GET /recording/:id`). */
export async function getRecordingById(recordingId: string) {
  const { data } = await axiosInstance.get(`/recording/${recordingId}`);
  return data;
}

export async function getSharedWithMe() {
  const { data } = await axiosInstance.get('/recording/shared-with-me');
  return coerceToRecordingList(data);
}

export type SharedByMeRow = {
  id: string;
  shared_to_user_id: string;
  shared_to_user_name: string;
  shared_to_user_phone: string;
  recording: any;
};

export async function getSharedByMe(): Promise<SharedByMeRow[]> {
  const { data } = await axiosInstance.get('/recording/shared-by-me');
  return Array.isArray(data) ? (data as SharedByMeRow[]) : [];
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

export type PlanId =
  | 'cricket'
  | 'pickleball'
  | 'padel'
  | 'free'
  | 'pro'
  | 'premium';

export type PlanOrderResponse = {
  id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_type: string;
  created_at?: string;
  expires_at?: string;
};

export type PaymentHistoryRow = {
  id: string;
  user_id: string;
  recording_id: string | null;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number | string;
  base_amount: number | string;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | string;
  payment_type: 'recording_access' | 'highlight_access' | 'media_access' | string;
  description: string | null;
  paid_at: string | null;
  created_at: string;
};

/** Creates a Razorpay order for the premium / plan screen (`POST /payments/plan/create-order`). */
export async function createPlanOrder(plan: PlanId): Promise<PlanOrderResponse> {
  const { data } = await axiosInstance.post<PlanOrderResponse>('/payments/plan/create-order', {
    plan,
  });
  return data as PlanOrderResponse;
}

/** Confirms payment after native Razorpay Checkout (`POST /payments/verify`). */
export async function verifyRazorpayPayment(body: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  status: 'completed' | 'failed' | 'pending' | 'cancelled' | 'refunded';
}) {
  const { data } = await axiosInstance.post('/payments/verify', body);
  return data;
}

export async function getPaymentHistory(): Promise<PaymentHistoryRow[]> {
  const { data } = await axiosInstance.get<PaymentHistoryRow[]>('/payments/history');
  return Array.isArray(data) ? data : [];
}

export type ActivePlan = {
  active: boolean;
  plan: PlanId | null;
  paid_at: string | null;
  expires_at: string | null;
  payment_id: string | null;
};

/** Server-truth entitlement (`GET /payments/plan/active`). */
export async function getActivePlan(): Promise<ActivePlan> {
  const { data } = await axiosInstance.get<ActivePlan>('/payments/plan/active');
  return data;
}

export type RecordingHighlightDto = {
  id: string;
  relative_timestamp: string | null;
  button_click_timestamp: string | Date;
  playback_id: string | null;
  mux_public_playback_url: string | null;
  thumbnail_url: string | null;
  status: string;
  /** Server: total like count (recording highlights). */
  likesCount?: number;
  viewerLiked?: boolean;
  viewerSaved?: boolean;
};

/** Normalizes occasional wrapped/nested payloads into a highlight row array. */
export function coerceHighlightList(payload: unknown): RecordingHighlightDto[] {
  if (Array.isArray(payload)) return payload as RecordingHighlightDto[];
  if (payload == null || typeof payload !== 'object') return [];
  const o = payload as Record<string, unknown>;
  for (const k of ['highlights', 'items', 'data', 'results', 'rows']) {
    const v = o[k];
    if (Array.isArray(v)) return v as RecordingHighlightDto[];
  }
  const inner = o.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const innerObj = inner as Record<string, unknown>;
    for (const k of ['highlights', 'items']) {
      const v = innerObj[k];
      if (Array.isArray(v)) return v as RecordingHighlightDto[];
    }
  }
  return [];
}

/** Maps `recording.recordingHighlights[]` embedded rows into the `/highlights` DTO shape. */
export function embedToHighlightDto(raw: {
  id?: unknown;
  relative_timestamp?: string | null;
  button_click_timestamp?: string | Date | null;
  playback_id?: string | null;
  mux_public_playback_url?: string | null;
  status?: string | null;
}): RecordingHighlightDto | null {
  const id = raw?.id != null ? String(raw.id) : '';
  if (!id) return null;
  const st = String(raw.status ?? '').toLowerCase();
  if (st === 'failed' || st === 'permanently_failed') return null;
  const pid =
    typeof raw.playback_id === 'string' && raw.playback_id.trim()
      ? raw.playback_id.trim()
      : null;
  const url =
    raw.mux_public_playback_url?.trim?.() ??
    (pid ? `https://stream.mux.com/${pid}.m3u8` : null);
  if (!pid && !url) return null;
  return {
    id,
    relative_timestamp: raw.relative_timestamp ?? null,
    button_click_timestamp: raw.button_click_timestamp ?? '',
    playback_id: pid,
    mux_public_playback_url: url,
    thumbnail_url: pid
      ? `https://image.mux.com/${pid}/thumbnail.jpg?time=2`
      : null,
    status: raw.status ?? 'unknown',
    likesCount: Number((raw as { likesCount?: unknown }).likesCount ?? 0),
    viewerLiked: Boolean((raw as { viewerLiked?: unknown }).viewerLiked),
    viewerSaved: Boolean((raw as { viewerSaved?: unknown }).viewerSaved),
  };
}

function mergeHighlightEngagementFromPayload(
  row: RecordingHighlightDto,
): RecordingHighlightDto {
  const o = row as unknown as Record<string, unknown>;
  return {
    ...row,
    likesCount: Number(
      o.likesCount ?? o.likes_count ?? row.likesCount ?? 0,
    ),
    viewerLiked: Boolean(o.viewerLiked ?? o.viewer_liked ?? row.viewerLiked),
    viewerSaved: Boolean(o.viewerSaved ?? o.viewer_saved ?? row.viewerSaved),
  };
}

/** Ready highlights for a recording (`GET /recording/:id/highlights`). */
export async function getRecordingHighlights(
  recordingId: string,
): Promise<RecordingHighlightDto[]> {
  const { data } = await axiosInstance.get<unknown>(
    `/recording/${recordingId}/highlights`,
  );
  return coerceHighlightList(data).map(mergeHighlightEngagementFromPayload);
}

export async function toggleRecordingHighlightLike(highlightId: string): Promise<{
  liked: boolean;
  likesCount: number;
}> {
  const { data } = await axiosInstance.post<{
    liked: boolean;
    likesCount: number;
  }>(`/recording/highlights/${highlightId}/like`, {});
  return data;
}

export async function toggleRecordingHighlightSave(highlightId: string): Promise<{
  saved: boolean;
}> {
  const { data } = await axiosInstance.post<{ saved: boolean }>(
    `/recording/highlights/${highlightId}/save`,
    {},
  );
  return data;
}

export type SavedRecordingHighlightSummary = {
  recordingId: string;
  highlightId: string;
  relativeTimestamp: string | null;
  muxPublicPlaybackUrl: string | null;
  thumbnailUrl: string | null;
  status: string;
};

export async function getSavedRecordingHighlights(): Promise<
  SavedRecordingHighlightSummary[]
> {
  const { data } = await axiosInstance.get<SavedRecordingHighlightSummary[]>(
    '/recording/highlights/saved',
  );
  return Array.isArray(data) ? data : [];
}

export type RecordingPlayback = {
  recording_id: string;
  playback_id: string | null;
  mux_public_url: string | null;
  signed_token: string | null;
  signed_url: string | null;
  expires_at: string | null;
};

/** Latest playback URL/token for a recording (`GET /recording/:id/playback`). */
export async function getRecordingPlayback(
  recordingId: string,
): Promise<RecordingPlayback> {
  const { data } = await axiosInstance.get<RecordingPlayback>(
    `/recording/${recordingId}/playback`,
  );
  return data;
}

export type RecordingStatus = {
  id: string;
  status: 'in_progress' | 'processing' | 'completed' | 'ready' | 'failed' | string;
  s3Path?: string | null;
  mux_playback_id?: string | null;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
};

export async function getRecordingStatus(
  recordingId: string,
): Promise<RecordingStatus | null> {
  try {
    const { data } = await axiosInstance.get<RecordingStatus>(
      `/recording/${recordingId}/status`,
    );
    return data ?? null;
  } catch {
    return null;
  }
}

/** Polls `/recording/:id/status` until it's ready, completed (with playback id), or the timeout elapses. */
export async function pollRecordingReady(
  recordingId: string,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    onTick?: (status: RecordingStatus | null) => void;
  },
): Promise<RecordingStatus | null> {
  const intervalMs = options?.intervalMs ?? 5000;
  const timeoutMs = options?.timeoutMs ?? 5 * 60 * 1000;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const status = await getRecordingStatus(recordingId);
    options?.onTick?.(status);
    if (status?.status === 'ready' && status?.mux_playback_id) return status;
    if (status?.status === 'completed' && status?.mux_playback_id) return status;
    if (status?.status === 'failed') return status;
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  return null;
}

/** Generates (or returns) a deep-linkable share URL for a recording (`POST /recording/:id/share`). */
export async function createShareLink(
  recordingId: string,
): Promise<{ shareableLink: string }> {
  const { data } = await axiosInstance.post<{ shareableLink: string }>(
    `/recording/${recordingId}/share`,
  );
  return data;
}

export type ShareLinkResolution = {
  recording_id: string | null;
  owner_id: string | null;
  mux_playback_id: string | null;
  mux_media_url: string | null;
  duration_seconds: number | null;
  start_time: string | null;
  end_time: string | null;
  turf_name: string | null;
  owner_name: string | null;
  status: string | null;
  presignedUrl: string | null;
};

/** Resolves a share token (public / unauthenticated) — `GET /recording/shared/media/:token`. */
export async function resolveShareToken(
  shareToken: string,
): Promise<ShareLinkResolution> {
  const { data } = await axiosInstance.get<ShareLinkResolution>(
    `/recording/shared/media/${encodeURIComponent(shareToken)}`,
  );
  return data;
}

export async function getNotifications(page = 1, limit = 50) {
  const { data } = await axiosInstance.get('/notification', {
    params: { page, limit },
  });
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null && 'items' in data) {
    const items = (data as { items?: unknown }).items;
    return Array.isArray(items) ? items : [];
  }
  return [];
}

/** `GET /users` — for admin stats (all authenticated users can call per current API). */
export async function getAllUsers(): Promise<FieldflixUser[]> {
  const { data } = await axiosInstance.get<unknown>('/users');
  if (Array.isArray(data)) return data as FieldflixUser[];
  return [];
}

export type FlickShortDto = {
  id: string;
  recordingId: string;
  sport: 'pickleball' | 'padel' | 'cricket' | string;
  title: string;
  topText: string;
  bottomText: string;
  aspect: '9:16' | '16:9';
  muxPlaybackId: string;
  /** HLS time window: playback loops inside [startSec, endSec); must be ≤ 15s. */
  startSec: number;
  endSec: number;
  approved: boolean;
  likesCount: number;
  comments: { id: string; userName: string | null; text: string; createdAt: string }[];
  createdAt: string;
};

/** Server + DB admin list; also see {@link getMyAdminStatus}. */
export async function getMyAdminStatus(): Promise<{ isAdmin: boolean }> {
  const { data } = await axiosInstance.get<{ isAdmin: boolean }>('/admin/me');
  return data as { isAdmin: boolean };
}

export type AdminPhoneRow = {
  id: string;
  phoneLast10: string;
  createdAt: string;
};

export async function getAdminPhoneList(): Promise<AdminPhoneRow[]> {
  const { data } = await axiosInstance.get<{ phones: AdminPhoneRow[] }>('/admin/phones');
  const p = (data as { phones?: AdminPhoneRow[] })?.phones;
  return Array.isArray(p) ? p : [];
}

export async function addAdminByPhone(phone: string): Promise<AdminPhoneRow> {
  const { data } = await axiosInstance.post<AdminPhoneRow>('/admin/phones', { phone });
  return data as AdminPhoneRow;
}

export async function removeAdminPhone(phoneLast10: string): Promise<void> {
  const last = String(phoneLast10).replace(/\D/g, '');
  const id = last.length >= 10 ? last.slice(-10) : last;
  await axiosInstance.delete(`/admin/phones/${encodeURIComponent(id)}`);
}

/** Mux-ready recordings for admin FlickShort picker (`GET /admin/recordings-for-flickshorts`). */
export type AdminMuxReadyRecording = {
  id: string;
  mux_playback_id: string;
  status: string;
  startTime: string;
  endTime: string | null;
  recording_name: string | null;
  turfName: string | null;
  /** Derived from turf `sports_supported` — server also uses this on create. */
  flick_sport: 'pickleball' | 'padel' | 'cricket';
  turf_sports_supported: string[];
};

export async function getAdminMuxReadyRecordings(): Promise<AdminMuxReadyRecording[]> {
  const { data } = await axiosInstance.get<AdminMuxReadyRecording[]>(
    '/admin/recordings-for-flickshorts',
  );
  return Array.isArray(data) ? data : [];
}

/** Public approved shorts. Use `sport=all` or omit for every sport. */
export async function getPublicFlickShorts(sport?: string): Promise<FlickShortDto[]> {
  const { data } = await axiosInstance.get<FlickShortDto[]>('/flick-shorts/public', {
    params: sport && sport !== 'all' ? { sport } : {},
  });
  return Array.isArray(data) ? data : [];
}

export async function getAdminFlickShorts(): Promise<FlickShortDto[]> {
  const { data } = await axiosInstance.get<FlickShortDto[]>('/flick-shorts/admin');
  return Array.isArray(data) ? data : [];
}

export async function createFlickShort(body: {
  recordingId: string;
  sport: 'pickleball' | 'padel' | 'cricket';
  title: string;
  topText: string;
  bottomText: string;
  aspect: '9:16' | '16:9';
  /** Optional; default 0 → 15s clip. Window length must be ≤ 15s. */
  startSec?: number;
  endSec?: number;
}): Promise<FlickShortDto> {
  const { data } = await axiosInstance.post<FlickShortDto>('/flick-shorts', body);
  return data as FlickShortDto;
}

export async function approveFlickShort(
  id: string,
  approved: boolean = true,
): Promise<FlickShortDto> {
  const { data } = await axiosInstance.patch<FlickShortDto>(`/flick-shorts/${id}/approve`, {
    approved,
  });
  return data as FlickShortDto;
}

/** Admin-only: remove a pending (non-approved) FlickShort. */
export async function deleteFlickShort(id: string): Promise<void> {
  await axiosInstance.delete(`/flick-shorts/${id}`);
}

export async function likeFlickShort(id: string): Promise<FlickShortDto> {
  const { data } = await axiosInstance.post<FlickShortDto>(`/flick-shorts/${id}/like`, {});
  return data as FlickShortDto;
}

export async function commentOnFlickShort(
  id: string,
  text: string,
): Promise<FlickShortDto> {
  const { data } = await axiosInstance.post<FlickShortDto>(`/flick-shorts/${id}/comment`, {
    text,
  });
  return data as FlickShortDto;
}

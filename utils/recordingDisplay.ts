/** Shared display helpers for `Recording` payloads from the Nest API. */

import {
  fieldflixHomeSportsFromSupported,
  summarizeTurfSportsLine,
  type HomeSportKey,
} from '@/utils/turfSports';

export function formatRecordingListWhen(iso: string | Date | undefined | null): string {
  if (iso == null) return '—';
  const d = typeof iso === 'string' || typeof iso === 'number' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} | ${time}`;
}

export function formatRecordingTimeLabel(iso: string | Date | undefined | null): string {
  if (iso == null) return '';
  const d = typeof iso === 'string' || typeof iso === 'number' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function highlightCountFromRecording(
  s: { recordingHighlights?: unknown[] } | null | undefined,
): number {
  const rows = Array.isArray(s?.recordingHighlights) ? s.recordingHighlights : [];
  return rows.filter((h) => {
    if (!h || typeof h !== 'object') return false;
    const row = h as {
      status?: unknown;
      playback_id?: unknown;
      mux_public_playback_url?: unknown;
    };
    const st = String(row.status ?? '').toLowerCase();
    if (st !== 'ready' && st !== 'clip_created') return false;
    const hasPlaybackId =
      typeof row.playback_id === 'string' && row.playback_id.trim().length > 0;
    const hasMuxUrl =
      typeof row.mux_public_playback_url === 'string' &&
      row.mux_public_playback_url.trim().length > 0;
    return hasPlaybackId || hasMuxUrl;
  }).length;
}

/**
 * A recording is considered "viewable" once Mux has published a playback id, even
 * if the backend `status` column is still stuck at `processing`/`completed`. This
 * happens when `video.asset.ready` is delivered to Mux but the API server didn't
 * persist the status update (stale instance, signature mismatch, etc.). The list
 * UIs use this so the user can play an asset whose Mux dashboard says "Ready".
 */
export function recordingIsReady(
  rec:
    | {
        status?: string | null;
        mux_playback_id?: string | null;
        mux_media_url?: string | null;
        mux_public_url?: string | null;
      }
    | null
    | undefined,
): boolean {
  if (!rec) return false;
  const s = String(rec.status ?? '').toLowerCase();
  if (s === 'ready' || s === 'completed') return true;
  if (s === 'failed' || s === 'cancelled') return false;
  return Boolean(rec.mux_playback_id || rec.mux_media_url || rec.mux_public_url);
}

/** Normalizes API enum strings (`Pickleball`, `paddle`, `FOOT_BALL`, etc.). */
function normalizeSportToken(raw: string): string {
  return String(raw).toLowerCase().replace(/_/g, ' ').trim();
}

/**
 * Labels a session/recording turf for FieldFlix UI.
 *
 * Turfs expose `sports_supported` as Postgres enum arrays; the first element is often
 * a generic/default (e.g. Football) unrelated to FieldFlix. We therefore **prefer**
 * pickleball → padel → cricket when **any** list entry matches, aligned with backend
 * `deriveFlickSportFromTurf`, and avoid showing unrelated sports alone.
 */
export function sportLabelFromTurf(
  supported: string[] | undefined | null,
  fallback = 'Pickleball',
): string {
  if (!supported?.length) return fallback;
  const norm = supported.map((x) => normalizeSportToken(String(x)));
  const hasPickle = norm.some((s) => s.includes('pickle'));
  const hasPaddle = norm.some((s) => s.includes('paddle'));
  const hasCricket = norm.some((s) => s.includes('cricket'));
  if (hasPickle) return 'Pickleball';
  if (hasPaddle) return 'Padel';
  if (hasCricket) return 'Cricket';
  return 'Multi-sport';
}

/** Stored on `POST /recording/start` metadata when the user picks a sport. */
export const FIELD_FLIX_SESSION_SPORT_METADATA_KEY =
  'fieldflix_session_sport' as const;

function homeSportToLabel(key: HomeSportKey): string {
  if (key === 'pickleball') return 'Pickleball';
  if (key === 'padel') return 'Padel';
  return 'Cricket';
}

/** Parse persisted session sport from recording metadata JSON. */
export function parseFieldflixSessionSportFromMetadata(
  metadata: unknown,
): HomeSportKey | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>)[
    FIELD_FLIX_SESSION_SPORT_METADATA_KEY
  ];
  if (raw !== 'pickleball' && raw !== 'padel' && raw !== 'cricket')
    return null;
  return raw;
}

/**
 * Sport label + filter tabs for Sessions. Prefer saved metadata; if venue lists
 * several FieldFlix sports and metadata is missing, show a multi-line label and
 * do not tie the row to a single tab (filters as "All sports" only).
 */
export function recordingSportUi(rec: {
  metadata?: unknown;
  turf?: { sports_supported?: string[] | null } | null;
}): { sportLabel: string; sportFilterKeys: HomeSportKey[] } {
  const meta = parseFieldflixSessionSportFromMetadata(rec.metadata);
  if (meta) {
    return {
      sportLabel: homeSportToLabel(meta),
      sportFilterKeys: [meta],
    };
  }

  const supported = rec.turf?.sports_supported ?? null;
  const ffKeys = fieldflixHomeSportsFromSupported(supported);

  if (ffKeys.length === 0) {
    return {
      sportLabel: sportLabelFromTurf(supported ?? undefined),
      sportFilterKeys: [],
    };
  }
  if (ffKeys.length === 1) {
    const key = ffKeys[0]!;
    return {
      sportLabel: homeSportToLabel(key),
      sportFilterKeys: [key],
    };
  }

  const line = summarizeTurfSportsLine(supported);
  return {
    sportLabel: line || 'Multi-sport',
    sportFilterKeys: [],
  };
}

/**
 * Highlights tab / IAP plan: pinned metadata wins, else single turf sport, else pickleball fallback.
 */
export function homeSportPlanFromRecording(rec: {
  metadata?: unknown;
  turf?: { sports_supported?: string[] | null } | null;
}): HomeSportKey {
  const meta = parseFieldflixSessionSportFromMetadata(rec.metadata);
  if (meta) return meta;
  const keys = fieldflixHomeSportsFromSupported(rec.turf?.sports_supported);
  if (keys.length === 1) return keys[0]!;
  return 'pickleball';
}

/**
 * Returns a Mux thumbnail URL when the recording has a published playback id.
 * The recording list otherwise falls back to a bundled background.
 */
export function recordingThumbUrl(
  rec:
    | {
        mux_playback_id?: string | null;
        recording?: { mux_playback_id?: string | null } | null;
      }
    | null
    | undefined,
  timeSeconds = 10,
): string | null {
  const playbackId =
    rec?.mux_playback_id ?? rec?.recording?.mux_playback_id ?? null;
  if (!playbackId) return null;
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${timeSeconds}`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Calculates a recording's actual duration from `startTime`/`endTime`.
 * Falls back to "Processing…" when the asset is still being prepared.
 * Pre-existing booking-style strings (e.g. `"1.5h"`) are normalised when nothing
 * better is available.
 */
export function recordingDurationLabel(
  rec:
    | {
        startTime?: string | Date | null;
        endTime?: string | Date | null;
        status?: string | null;
        mux_playback_id?: string | null;
        mux_media_url?: string | null;
        mux_public_url?: string | null;
        payment?: { game_duration?: string } | null;
      }
    | null
    | undefined,
): string {
  if (!rec) return '—';

  if (rec.startTime && rec.endTime) {
    const start = new Date(rec.startTime).getTime();
    const end = new Date(rec.endTime).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
      const totalSeconds = Math.floor((end - start) / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
    }
  }

  if (!recordingIsReady(rec)) {
    return 'Processing…';
  }

  return rec.payment?.game_duration ?? '—';
}

/**
 * Picks a usable HLS URL for the in-app player. Prefers signed URLs when the
 * backend provides them, falling back to the public Mux URL stored on the
 * recording entity.
 */
export function recordingPlaybackUrl(
  rec:
    | {
        mux_media_url?: string | null;
        /** Present on `GET /recording/:id` from `getMuxPublicUrl` helper. */
        mux_public_url?: string | null;
        signed_url?: string | null;
        mux_playback_id?: string | null;
      }
    | null
    | undefined,
): string | null {
  if (!rec) return null;
  if (rec.signed_url) return rec.signed_url;
  if (rec.mux_media_url) return rec.mux_media_url;
  if (rec.mux_public_url) return rec.mux_public_url;
  if (rec.mux_playback_id) {
    return `https://stream.mux.com/${rec.mux_playback_id}.m3u8`;
  }
  return null;
}

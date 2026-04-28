/** Shared display helpers for `Recording` payloads from the Nest API. */

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

export function highlightCountFromRecording(s: { recordingHighlights?: unknown[] } | null | undefined): number {
  return Array.isArray(s?.recordingHighlights) ? s.recordingHighlights.length : 0;
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

export function sportLabelFromTurf(
  supported: string[] | undefined | null,
  fallback = 'Pickleball',
): string {
  if (!supported?.length) return fallback;
  const raw = String(supported[0]);
  if (raw === 'Paddle') return 'Padel';
  return raw;
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

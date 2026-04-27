import { BASE_URL } from '@/data/constants';
import { coerceToRecordingList, getFieldflixApiErrorDebug, getMyRecordings } from '@/lib/fieldflix-api';
import type { ImageSourcePropType } from 'react-native';
import { useCallback, useRef, useState } from 'react';

export type SessionRowForUi = {
  id: string;
  recordingId: string;
  sport: string;
  arena: string;
  area: string;
  when: string;
  sportIcon: ImageSourcePropType;
  pinIcon: ImageSourcePropType;
  clockIcon: ImageSourcePropType;
  playIcon: ImageSourcePropType | null;
  thumbUrl: string | null;
  duration: string;
  status: string;
  isReady: boolean;
};

type MapRowFn = (r: any) => SessionRowForUi;

/**
 * Sessions list: one generation counter (no AbortController) so stale HTTP responses
 * never apply, and we never leave `loading` stuck after a cancelled request.
 */
export function useSessionsMyRecordings(mapRecordingToSessionRow: MapRowFn) {
  const [rows, setRows] = useState<SessionRowForUi[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendLog, setBackendLog] = useState('');
  const [error, setError] = useState<string | null>(null);
  const genRef = useRef(0);
  /** Last successful mapped count — for “keep previous rows” on error. */
  const lastSuccessCountRef = useRef(0);

  const load = useCallback(async () => {
    const gen = ++genRef.current;
    setError(null);
    if (lastSuccessCountRef.current === 0) {
      setLoading(true);
    }

    const ts = new Date().toISOString();
    try {
      const data = await Promise.race([
        getMyRecordings(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Sessions request timed out. Please tap Reload.'));
          }, 15_000);
        }),
      ]);
      if (gen !== genRef.current) {
        return;
      }

      const arr = coerceToRecordingList(data);
      const rawStr =
        typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      const preview =
        rawStr.length > 10_000 ? `${rawStr.slice(0, 10_000)}\n…` : rawStr;

      const completed = (arr as unknown[]).filter((r) => {
        if (r == null || typeof r !== 'object') return false;
        const o = r as Record<string, unknown>;
        const id = o.id ?? o.recording_id ?? o.recordingId;
        if (id == null || id === '') return false;
        const s = String(o.status ?? '').toLowerCase();
        if (s === 'failed' || s === 'cancelled') return false;
        return true;
      });

      const mapped: SessionRowForUi[] = [];
      for (const r of completed) {
        try {
          const o = r as any;
          const raw = o.id != null ? o : { ...o, id: o.recording_id ?? o.recordingId };
          mapped.push(mapRecordingToSessionRow(raw));
        } catch {
          // skip bad row
        }
      }

      if (gen !== genRef.current) {
        return;
      }

      lastSuccessCountRef.current = mapped.length;
      setBackendLog(
        [
          `Time: ${ts}`,
          `BASE_URL: ${BASE_URL}`,
          `GET /recording/my-recordings`,
          `Unwrapped type: ${Array.isArray(data) ? 'array' : data === null ? 'null' : typeof data}`,
          `coerceToRecordingList: ${arr.length} item(s)`,
          `After non-failed/cancelled filter: ${completed.length} row(s)`,
          `Row components built for UI: ${mapped.length}`,
          '--- body (unwrapped) ---',
          preview,
        ].join('\n'),
      );
      setRows(mapped);
      setLoading(false);
    } catch (e) {
      if (gen !== genRef.current) {
        return;
      }
      setError(
        e instanceof Error && e.message
          ? e.message
          : 'Could not load sessions right now. Please tap Reload.',
      );
      const hadSessions = lastSuccessCountRef.current > 0;
      setRows((prev) => (prev.length > 0 ? prev : []));
      setBackendLog(
        [
          `Time: ${ts}`,
          `BASE_URL: ${BASE_URL}`,
          `GET /recording/my-recordings — error`,
          getFieldflixApiErrorDebug(e),
          hadSessions ? '\n(Keeping previous session rows; this fetch failed.)' : '',
        ].join(''),
      );
      setLoading(false);
    }
  }, [mapRecordingToSessionRow]);

  return { rows, loading, backendLog, error, load };
}

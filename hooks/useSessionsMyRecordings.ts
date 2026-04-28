import { BASE_URL } from '@/data/constants';
import { coerceToRecordingList, getFieldflixApiErrorDebug, getMyRecordings } from '@/lib/fieldflix-api';
import { pushClientDebugLog } from '@/utils/clientDebugLog';
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
type SessionDebugSnapshot = {
  requestId: number;
  startedAtIso: string;
  elapsedMs: number;
  networkMs: number | null;
  rawCount: number;
  filteredCount: number;
  mappedCount: number;
  skippedMapCount: number;
  statusHistogram: Record<string, number>;
  sampleIds: string[];
  timedOut: boolean;
};

/**
 * Sessions list: one generation counter (no AbortController) so stale HTTP responses
 * never apply, and we never leave `loading` stuck after a cancelled request.
 */
export function useSessionsMyRecordings(mapRecordingToSessionRow: MapRowFn) {
  const [rows, setRows] = useState<SessionRowForUi[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendLog, setBackendLog] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [debugSnapshot, setDebugSnapshot] = useState<SessionDebugSnapshot | null>(
    null,
  );
  const genRef = useRef(0);
  /** Last successful mapped count — for “keep previous rows” on error. */
  const lastSuccessCountRef = useRef(0);

  const load = useCallback(async () => {
    const gen = ++genRef.current;
    pushClientDebugLog('sessions', `load start #${gen}`);
    setError(null);
    const startedAt = Date.now();
    if (lastSuccessCountRef.current === 0) {
      setLoading(true);
    }

    const ts = new Date().toISOString();
    try {
      const networkStartedAt = Date.now();
      const data = await Promise.race([
        getMyRecordings(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Sessions request timed out. Please tap Reload.'));
          }, 15_000);
        }),
      ]);
      const networkMs = Date.now() - networkStartedAt;
      if (gen !== genRef.current) {
        pushClientDebugLog('sessions', `stale response ignored #${gen}`);
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
      const statusHistogram: Record<string, number> = {};
      for (const r of completed) {
        if (!r || typeof r !== 'object') continue;
        const o = r as Record<string, unknown>;
        const key = String(o.status ?? 'unknown').toLowerCase() || 'unknown';
        statusHistogram[key] = (statusHistogram[key] ?? 0) + 1;
      }

      const mapped: SessionRowForUi[] = [];
      let skippedMapCount = 0;
      for (const r of completed) {
        try {
          const o = r as any;
          const raw = o.id != null ? o : { ...o, id: o.recording_id ?? o.recordingId };
          mapped.push(mapRecordingToSessionRow(raw));
        } catch {
          skippedMapCount += 1;
        }
      }

      if (gen !== genRef.current) {
        pushClientDebugLog('sessions', `stale mapped response ignored #${gen}`);
        return;
      }

      lastSuccessCountRef.current = mapped.length;
      const snapshot: SessionDebugSnapshot = {
        requestId: gen,
        startedAtIso: ts,
        elapsedMs: Date.now() - startedAt,
        networkMs,
        rawCount: arr.length,
        filteredCount: completed.length,
        mappedCount: mapped.length,
        skippedMapCount,
        statusHistogram,
        sampleIds: completed
          .slice(0, 8)
          .map((r) => (r && typeof r === 'object' ? String((r as Record<string, unknown>).id ?? '') : ''))
          .filter(Boolean),
        timedOut: false,
      };
      setDebugSnapshot(snapshot);
      setBackendLog(
        [
          `Time: ${snapshot.startedAtIso}`,
          `Request #${snapshot.requestId}`,
          `BASE_URL: ${BASE_URL}`,
          `GET /recording/my-recordings`,
          `Elapsed: ${snapshot.elapsedMs}ms`,
          `Network wait: ${snapshot.networkMs ?? 'n/a'}ms`,
          `Unwrapped type: ${Array.isArray(data) ? 'array' : data === null ? 'null' : typeof data}`,
          `coerceToRecordingList: ${snapshot.rawCount} item(s)`,
          `After non-failed/cancelled filter: ${snapshot.filteredCount} row(s)`,
          `Row components built for UI: ${snapshot.mappedCount}`,
          `Rows skipped while mapping: ${snapshot.skippedMapCount}`,
          `Status histogram: ${JSON.stringify(snapshot.statusHistogram)}`,
          `Sample recording IDs: ${snapshot.sampleIds.join(', ') || 'none'}`,
          '--- body (unwrapped) ---',
          preview,
        ].join('\n'),
      );
      setRows(mapped);
      setLoading(false);
      pushClientDebugLog('sessions', `load success #${gen}`, {
        rawCount: arr.length,
        filteredCount: completed.length,
        mappedCount: mapped.length,
        networkMs,
      });
    } catch (e) {
      if (gen !== genRef.current) {
        pushClientDebugLog('sessions', `stale error ignored #${gen}`);
        return;
      }
      setError(
        e instanceof Error && e.message
          ? e.message
          : 'Could not load sessions right now. Please tap Reload.',
      );
      const timedOut =
        e instanceof Error &&
        e.message.toLowerCase().includes('timed out');
      const snapshot: SessionDebugSnapshot = {
        requestId: gen,
        startedAtIso: ts,
        elapsedMs: Date.now() - startedAt,
        networkMs: null,
        rawCount: 0,
        filteredCount: 0,
        mappedCount: 0,
        skippedMapCount: 0,
        statusHistogram: {},
        sampleIds: [],
        timedOut,
      };
      setDebugSnapshot(snapshot);
      const hadSessions = lastSuccessCountRef.current > 0;
      setRows((prev) => (prev.length > 0 ? prev : []));
      setBackendLog(
        [
          `Time: ${snapshot.startedAtIso}`,
          `Request #${snapshot.requestId}`,
          `BASE_URL: ${BASE_URL}`,
          `GET /recording/my-recordings — error`,
          `Elapsed: ${snapshot.elapsedMs}ms`,
          `Timed out: ${snapshot.timedOut}`,
          getFieldflixApiErrorDebug(e),
          hadSessions ? '\n(Keeping previous session rows; this fetch failed.)' : '',
        ].join(''),
      );
      setLoading(false);
      pushClientDebugLog(
        'sessions',
        `load failed #${gen}`,
        e instanceof Error ? e.message : String(e),
      );
    }
  }, [mapRecordingToSessionRow]);

  return { rows, loading, backendLog, error, debugSnapshot, load };
}

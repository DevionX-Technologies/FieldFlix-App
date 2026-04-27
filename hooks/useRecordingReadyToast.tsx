import { LAST_STOPPED_RECORDING_ID } from '@/data/constants';
import { pollRecordingReady, type RecordingStatus } from '@/lib/fieldflix-api';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

type ToastState =
  | { kind: 'idle' }
  | { kind: 'processing'; recordingId: string }
  | { kind: 'ready'; recordingId: string }
  | { kind: 'failed'; recordingId: string };

/**
 * Watches `LAST_STOPPED_RECORDING_ID` in SecureStore and polls the backend until
 * the Mux source.ready webhook lands (or `failed` / timeout). Returns a small
 * state object the caller can render as an inline toast.
 *
 * The hook owns no UI. It is safe to mount on multiple screens; only the first
 * caller per `recordingId` actually polls — subsequent reads of the same id are
 * served from local state.
 */
export function useRecordingReadyToast() {
  const [state, setState] = useState<ToastState>({ kind: 'idle' });
  const pollingRef = useRef<string | null>(null);

  const dismiss = useCallback(async () => {
    setState({ kind: 'idle' });
    try {
      await SecureStore.deleteItemAsync(LAST_STOPPED_RECORDING_ID);
    } catch {
      // ignore
    }
  }, []);

  const beginPolling = useCallback(async (recordingId: string) => {
    if (pollingRef.current === recordingId) return;
    pollingRef.current = recordingId;
    setState({ kind: 'processing', recordingId });

    const result: RecordingStatus | null = await pollRecordingReady(recordingId, {
      intervalMs: 5000,
      timeoutMs: 5 * 60 * 1000,
    });

    if (pollingRef.current !== recordingId) return;

    if (result?.status === 'failed') {
      setState({ kind: 'failed', recordingId });
    } else if (result?.status === 'ready' || result?.status === 'completed') {
      setState({ kind: 'ready', recordingId });
    } else {
      // Timed out — keep the "processing" hint but stop the active poll.
      setState((prev) =>
        prev.kind === 'processing' ? prev : { kind: 'processing', recordingId },
      );
    }
    pollingRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const id = await SecureStore.getItemAsync(LAST_STOPPED_RECORDING_ID);
        if (cancelled || !id) return;
        await beginPolling(id);
      } catch {
        // SecureStore unavailable — bail gracefully
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [beginPolling]);

  return { state, dismiss };
}

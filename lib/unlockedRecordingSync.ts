import {
  getPaymentHistory,
  getUnlockedRecordingIds,
} from '@/lib/fieldflix-api';
import {
  persistUnlockedRecordingIds,
  readUnlockedRecordingIds,
} from '@/utils/unlockedRecordingsStorage';

const SCOPED_ACCESS = new Set(['recording_access', 'highlight_access']);

/**
 * Merge server-truth unlocked recording IDs into local cache.
 *
 * Order of preference:
 *   1. `GET /payments/unlocked-recordings` — group-unlock view: returns every
 *      recording visible to the user (owned OR claimed via Find My Recording)
 *      that any group member has paid to unlock. This is the source of truth.
 *   2. Fallback: `GET /payments/history` filtered to the current user's own
 *      completed RECORDING_ACCESS / HIGHLIGHT_ACCESS rows — used only when
 *      the group-unlock endpoint is unavailable (e.g. older backend builds).
 *   3. Local cache from prior runs — keeps unlocks across offline launches.
 *
 * Call after checkout and on Highlights / Recordings focus so a different
 * device recovers access (and so the lock icon flips when any group member
 * pays — not just the current user).
 */
export async function mergeServerUnlockedRecordingIds(): Promise<string[]> {
  const fromGroup = await getUnlockedRecordingIds().catch(() => [] as string[]);

  let fromHistory: string[] = [];
  if (fromGroup.length === 0) {
    const hist = await getPaymentHistory().catch(() => []);
    fromHistory = hist
      .filter(
        (p) =>
          SCOPED_ACCESS.has(String(p.payment_type ?? '')) &&
          String(p.status ?? '') === 'completed' &&
          p.recording_id,
      )
      .map((p) => String(p.recording_id));
  }

  const local = await readUnlockedRecordingIds();
  const merged = Array.from(
    new Set([...fromGroup, ...fromHistory, ...local]),
  );
  await persistUnlockedRecordingIds(merged);
  return merged;
}

import { getPaymentHistory } from '@/lib/fieldflix-api';
import {
  persistUnlockedRecordingIds,
  readUnlockedRecordingIds,
} from '@/utils/unlockedRecordingsStorage';

const SCOPED_ACCESS = new Set(['recording_access', 'highlight_access']);

/**
 * Merge server-truth RECORDING_ACCESS / HIGHLIGHT_ACCESS payments into local unlocked ids.
 * Call after checkout and on Highlights / Recordings focus so new devices recover access.
 */
export async function mergeServerUnlockedRecordingIds(): Promise<string[]> {
  const hist = await getPaymentHistory().catch(() => []);
  const fromServer = hist
    .filter(
      (p) =>
        SCOPED_ACCESS.has(String(p.payment_type ?? '')) &&
        String(p.status ?? '') === 'completed' &&
        p.recording_id,
    )
    .map((p) => String(p.recording_id));
  const local = await readUnlockedRecordingIds();
  const merged = Array.from(new Set([...fromServer, ...local]));
  await persistUnlockedRecordingIds(merged);
  return merged;
}

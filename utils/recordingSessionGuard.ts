import { RECORDING_KEY } from '@/data/constants';
import * as SecureStore from 'expo-secure-store';

/**
 * True when this device still has an in-flight recording workflow (running countdown,
 * or paused mid-session via `recordingStartData`). Prevents stacking a second venue flow.
 *
 * Expired `end_time` with stale markers only → false so a stuck row can retry after time elapses.
 */
export async function hasPersistedRecordingSession(): Promise<boolean> {
  const rk = await SecureStore.getItemAsync(RECORDING_KEY);
  if (!rk?.trim()) return false;
  const endStr = await SecureStore.getItemAsync('end_time');
  if (!endStr?.trim()) return true;
  const endMs = parseInt(endStr, 10);
  if (!Number.isFinite(endMs)) return true;
  return endMs > Date.now();
}

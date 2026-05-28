import {
  RECORDING_ACTIVE_ROUTE_PARAMS_KEY,
  RECORDING_KEY,
  RECORDING_QR_CAMERA_ID,
  TIME_GROUNDLOCATION,
  TIME_TURF_NAME,
  TURF_ID,
} from '@/data/constants';
import * as SecureStore from 'expo-secure-store';

function remainingSecondsFromEndMs(endMs: number): number {
  return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
}

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

/**
 * Router search params for `/recording-active` so cold start resumes the live timer dial.
 */
export async function buildRecordingActiveResumeSearchParams(): Promise<Record<
  string,
  string
> | null> {
  if (!(await hasPersistedRecordingSession())) return null;
  const endStr = await SecureStore.getItemAsync('end_time');
  let remainingSeconds = '0';
  if (endStr?.trim()) {
    remainingSeconds = String(
      remainingSecondsFromEndMs(parseInt(endStr, 10)),
    );
  }
  const turf = (await SecureStore.getItemAsync(TURF_ID))?.trim() ?? '';
  const camera =
    (await SecureStore.getItemAsync(RECORDING_QR_CAMERA_ID))?.trim() ?? '';

  const fromDisk: Record<string, string> = {};
  try {
    const raw = await SecureStore.getItemAsync(RECORDING_ACTIVE_ROUTE_PARAMS_KEY);
    if (raw?.trim()) {
      const o = JSON.parse(raw) as Record<string, unknown>;
      for (const [k, v] of Object.entries(o)) {
        if (v == null) continue;
        fromDisk[String(k)] = typeof v === 'string' ? v : String(v);
      }
    }
  } catch {
    /* ignore */
  }

  const out: Record<string, string> = {
    ...fromDisk,
    Resume: '1',
  };

  // Prefer live countdown from wall clock when running; else keep disk (e.g. paused).
  if (remainingSeconds !== '0') {
    out.remainingSeconds = remainingSeconds;
  } else if (!out.remainingSeconds) {
    out.remainingSeconds = remainingSeconds;
  }

  if (turf && !out.turfId) out.turfId = turf;
  if (camera && !out.cameraId) out.cameraId = camera;

  const storedName = (await SecureStore.getItemAsync(TIME_TURF_NAME))?.trim() ?? '';
  const storedLocation =
    (await SecureStore.getItemAsync(TIME_GROUNDLOCATION))?.trim() ?? '';
  if (storedName && !out.Name) out.Name = storedName;
  if (storedLocation && !out.GroundLocation) out.GroundLocation = storedLocation;

  return out;
}

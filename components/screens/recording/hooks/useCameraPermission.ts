import type { PermissionStatus } from 'expo-camera';
import { Camera } from 'expo-camera';
import { useEffect, useState } from 'react';

/**
 * Resolves camera permission: reads `getCameraPermissionsAsync` first, and only
 * calls `requestCameraPermissionsAsync` when status is still `undetermined`.
 */
export function useCameraPermission(): PermissionStatus | null {
  const [status, setStatus] = useState<PermissionStatus | null>(null);

  useEffect(() => {
    (async () => {
      // Read system state first so reopening the app does not re-run the *request* flow
      // (OS already stores granted/denied; only `undetermined` should call request).
      const { status: current } = await Camera.getCameraPermissionsAsync();
      if (current === 'undetermined') {
        const { status: after } = await Camera.requestCameraPermissionsAsync();
        setStatus(after);
      } else {
        setStatus(current);
      }
    })();
  }, []);

  return status;
}
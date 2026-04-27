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
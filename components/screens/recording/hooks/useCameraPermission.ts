import type { PermissionStatus } from 'expo-camera';
import { Camera } from 'expo-camera';
import { useEffect, useState } from 'react';

/**
 * Requests camera permission on mount and returns the current status.
 * Status will be "granted" | "denied" | "undetermined".
 */
export function useCameraPermission(): PermissionStatus | null {
  const [status, setStatus] = useState<PermissionStatus | null>(null);

  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      setStatus(cameraStatus);
    })();
  }, []);

  return status;
}
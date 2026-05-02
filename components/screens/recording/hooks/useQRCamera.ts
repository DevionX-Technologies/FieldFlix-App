// src/hooks/useQrCamera.ts

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { qrCodeDataSchema, QrCodeDataSchema } from '../data/recordingSchema';
import { useCameraPermission } from './useCameraPermission';

/**
 * Custom hook that:
 * 1. Uses `useCameraPermission` to track camera permission status.
 * 2. Tracks a `scanned` flag so QR scanning only fires once per session.
 * 3. Parses & validates the scanned QR JSON against a Zod schema.
 * 4. Calls `onValidQr(validData)` when validation succeeds.
 *
 * Returns:
 *  - hasPermission: PermissionStatus | null
 *  - scanned: boolean
 *  - handleBarCodeScanned: (event) => void   → to pass into <Camera onBarCodeScanned={…} />
 *  - resetScan: () => void   → call if you want to allow scanning again
 */
export function useQrCamera(
  onValidQr: (
    valid: QrCodeDataSchema,
  ) => void | boolean | Promise<void | boolean>,
) {
  // (1) Get camera permission status using the separate hook
  const hasPermission = useCameraPermission();

  // (2) Track whether we've already scanned once
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = useCallback(
    async (event: { data: string; type: string }) => {
      if (scanned) return;
      setScanned(true);

      // 1️⃣ Try to parse JSON
      let parsed: unknown;
      try {
          parsed = JSON.parse(event.data);
          console.log('Scanned QR data:', parsed);
      } catch {
        Alert.alert(
          'Invalid QR Code',
          'Scanned data is not valid, Rescan or please contact turf owner.',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
        return;
      }

      // 2️⃣ Validate with Zod schema
      try {
        const valid = qrCodeDataSchema.parse(parsed) as QrCodeDataSchema;
        const proceed = await Promise.resolve(onValidQr(valid));
        if (proceed === false) setScanned(false);
      } catch {
        Alert.alert(
          'Invalid QR Code',
          'QR data did not match the expected format. Please scan a valid turf QR code.',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
      }
    },
    [scanned, onValidQr]
  );

  // If you want to allow scanning again (e.g., after an error), call this
  const resetScan = () => {
    setScanned(false);
  };

  return { hasPermission, scanned, handleBarCodeScanned, resetScan };
}
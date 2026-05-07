import PermissionRequestView from '@/components/screens/recording/components/PermissionRequestView';
import ScanOverlay from '@/components/screens/recording/components/ScanOverlay';
import type { QrCodeDataSchema } from '@/components/screens/recording/data/recordingSchema';
import { useQrCamera } from '@/components/screens/recording/hooks/useQRCamera';
import { Paths } from '@/data/paths';
import { clearRecordingFlowDebug, logRecordingFlowDebug } from '@/utils/recordingFlowDebug';
import { navigateBackOrHome } from '@/utils/navigateBackOrHome';
import { hasPersistedRecordingSession } from '@/utils/recordingSessionGuard';
import {
  FIELD_FLIX_HEADER_HEIGHT,
  FieldflixScreenHeader,
} from '@/screens/fieldflix/FieldflixScreenHeader';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

export default function FieldflixScanQrScreen() {
  const router = useRouter();
  const [permissionInfo, requestPermission] = useCameraPermissions();
  /** Bumping this remounts <CameraView> after a permission grant so Android
   *  doesn't try to attach the camera to a surface that was created when the
   *  OS still considered the permission denied. */
  const [cameraMountKey, setCameraMountKey] = React.useState(0);
  /** Re-entrancy guard so two focus events don't double-fire requestPermission. */
  const requestingRef = React.useRef(false);

  /**
   * On every screen focus:
   *   - If the OS hasn't been asked yet (`undetermined`) → fire the native
   *     prompt immediately so the user never sees a blank "Allow camera?"
   *     intermediate screen.
   *   - If we already have permission, re-check it via `requestPermission`
   *     (which is a no-op when granted but refreshes the hook's cached state)
   *     and bump the mount key so <CameraView> remounts cleanly. This fixes
   *     the "tap back + come back" workaround needed because expo-camera's
   *     hook can hold a stale `granted: false` from a previous session.
   */
  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      void (async () => {
        if (requestingRef.current) return;
        requestingRef.current = true;
        try {
          const next = await requestPermission();
          if (cancelled) return;
          if (next?.granted) {
            // Force a fresh CameraView mount in case a previous unmount left
            // the surface in a bad state (Android Camera2 quirk).
            setCameraMountKey((k) => k + 1);
          }
        } finally {
          requestingRef.current = false;
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [requestPermission]),
  );

  const onValidQr = React.useCallback(
    async (valid: QrCodeDataSchema) => {
      if (await hasPersistedRecordingSession()) {
        Alert.alert(
          'Recording in progress',
          'You already have an active FieldFlicks session on this phone. Finish it from your recording timer or Sessions before scanning a new court.',
        );
        return false;
      }
      clearRecordingFlowDebug();
      const navParams = {
        GroundNumber: valid.GroundNumber ?? '',
        GroundDescription: valid.GroundDescription ?? '',
        Name: valid.Name ?? '',
        GroundLocation: valid.GroundLocation ?? '',
        Size: valid.Size ?? '',
        turfId: valid.turfId ?? '',
        cameraId: valid.cameraId ?? '',
      };
      logRecordingFlowDebug('qr_scan_valid', { parsedQr: valid, navParams });
      router.push({
        pathname: Paths.recordingTime,
        params: navParams,
      });
      return undefined;
    },
    [router],
  );

  const { scanned, handleBarCodeScanned, resetScan } = useQrCamera(onValidQr);

  if (permissionInfo === null) {
    return (
      <View style={styles.blank}>
        <FieldflixScreenHeader
          title="Scan QR"
          onBack={() => navigateBackOrHome(router)}
          backAccessibilityLabel="Go back"
        />
      </View>
    );
  }

  if (!permissionInfo.granted) {
    return (
      <View style={styles.blank}>
        <FieldflixScreenHeader
          title="Scan QR"
          onBack={() => navigateBackOrHome(router)}
          backAccessibilityLabel="Go back"
        />
        <PermissionRequestView
          status={permissionInfo.status}
          onRetry={async () => {
            const next = await requestPermission();
            if (next?.granted) {
              // Same fix as the useFocusEffect path: remount <CameraView>
              // so it picks up the freshly-granted permission first try.
              setCameraMountKey((k) => k + 1);
            }
            resetScan();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FieldflixScreenHeader
        title="Scan QR"
        onBack={() => navigateBackOrHome(router)}
        backAccessibilityLabel="Go back"
      />
      {!scanned ? (
        <CameraView
          key={`cam-${cameraMountKey}`}
          style={styles.camera}
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
      ) : (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#B6FC00" />
          <Text style={styles.infoText}>QR Scanned. Redirecting…</Text>
        </View>
      )}
      {!scanned ? (
        <View pointerEvents="none" style={styles.overlayWrap}>
          <ScanOverlay />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  blank: {
    flex: 1,
    backgroundColor: '#020617',
  },
  camera: {
    flex: 1,
  },
  overlayWrap: {
    position: 'absolute',
    top: FIELD_FLIX_HEADER_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

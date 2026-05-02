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
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

export default function FieldflixScanQrScreen() {
  const router = useRouter();
  const [permissionInfo, requestPermission] = useCameraPermissions();

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
            await requestPermission();
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

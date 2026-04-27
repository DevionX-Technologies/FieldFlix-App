import PermissionRequestView from '@/components/screens/recording/components/PermissionRequestView';
import ScanOverlay from '@/components/screens/recording/components/ScanOverlay';
import type { QrCodeDataSchema } from '@/components/screens/recording/data/recordingSchema';
import { useQrCamera } from '@/components/screens/recording/hooks/useQRCamera';
import { Paths } from '@/data/paths';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function FieldflixScanQrScreen() {
  const router = useRouter();
  const [permissionInfo, requestPermission] = useCameraPermissions();

  const onValidQr = React.useCallback(
    (valid: QrCodeDataSchema) => {
      router.push({
        pathname: Paths.recordingTime,
        params: {
          GroundNumber: valid.GroundNumber ?? '',
          GroundDescription: valid.GroundDescription ?? '',
          Name: valid.Name ?? '',
          GroundLocation: valid.GroundLocation ?? '',
          Size: valid.Size ?? '',
          turfId: valid.turfId ?? '',
          cameraId: valid.cameraId ?? '',
        },
      });
    },
    [router],
  );

  const { scanned, handleBarCodeScanned, resetScan } = useQrCamera(onValidQr);

  if (permissionInfo === null) {
    return <View style={styles.blank} />;
  }

  if (!permissionInfo.granted) {
    return (
      <PermissionRequestView
        status={permissionInfo.status}
        onRetry={async () => {
          await requestPermission();
          resetScan();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {!scanned ? (
        <CameraView
          style={StyleSheet.absoluteFill}
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
      {!scanned && <ScanOverlay />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  blank: {
    flex: 1,
    backgroundColor: '#000',
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

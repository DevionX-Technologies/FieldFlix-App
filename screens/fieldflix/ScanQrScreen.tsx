import PermissionRequestView from "@/components/screens/recording/components/PermissionRequestView";
import type { QrCodeDataSchema } from "@/components/screens/recording/data/recordingSchema";
import { useQrCamera } from "@/components/screens/recording/hooks/useQRCamera";
import { Paths } from "@/data/paths";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FieldflixScanQrScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permissionInfo, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);

  const onValidQr = React.useCallback(
    (valid: QrCodeDataSchema) => {
      router.push({
        pathname: Paths.recordingTime,
        params: {
          GroundNumber: valid.GroundNumber ?? "",
          GroundDescription: valid.GroundDescription ?? "",
          Name: valid.Name ?? "",
          GroundLocation: valid.GroundLocation ?? "",
          Size: valid.Size ?? "",
          turfId: valid.turfId ?? "",
          cameraId: valid.cameraId ?? "",
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
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        {scanned ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#4ade80" />
            <Text style={styles.infoText}>QR Scanned. Redirecting…</Text>
          </View>
        ) : (
          <>
            {/* Camera inside green-bordered frame */}
            <View style={styles.cameraFrame}>
              <CameraView
                style={StyleSheet.absoluteFill}
                enableTorch={torchOn}
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              />
            </View>

            {/* Hint text */}
            <Text style={styles.hint}>Align the QR code within the frame</Text>

            {/* Flashlight FAB */}
            <Pressable style={styles.fab} onPress={() => setTorchOn((v) => !v)}>
              <Ionicons
                name={torchOn ? "sunny" : "sunny-outline"}
                size={22}
                color="#fff"
              />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },
  blank: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  card: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 100,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  cameraFrame: {
    width: "88%",
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#4ade80",
    overflow: "hidden",
    backgroundColor: "#0d1526",
  },
  hint: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 24,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1e2535",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});

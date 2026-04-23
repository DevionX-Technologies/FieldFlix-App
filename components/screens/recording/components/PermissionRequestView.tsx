import { Camera } from 'expo-camera';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Displays either a spinner (if status is null/"undetermined") or
 * a "Grant Permission" button (if status is "denied").
 * No automatic navigation - parent component handles all navigation logic.
 */

interface Props {
  onRetry: () => void;
  status: 'granted' | 'denied' | 'undetermined' | null;
}

/**
 * Displays either a spinner (if status is null/"undetermined") or
 * a “Grant Permission” button (if status is “denied”).
 * If permission is granted, it redirects to the next screen immediately.
 */
export default function PermissionRequestView({ onRetry, status }: Props) {
  // Remove internal state management to prevent conflicts

  // If still waiting for permission:
  if (status === null || status === 'undetermined') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B6FC00" />
        <Text style={styles.infoText}>Requesting camera permission...</Text>
      </View>
    );
  }

  // If permission was denied:
  if (status === 'denied') {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>
          Camera access is required to scan QR codes.
        </Text>
        <Pressable
          style={styles.button}
          onPress={async () => {
            await Camera.requestCameraPermissionsAsync();
            onRetry(); // Notify parent to re-check permissions
          }}
        >
          <Text style={styles.buttonText}>Grant Camera Permission</Text>
        </Pressable>
      </View>
    );
  }

  // Permission granted - parent component handles navigation
  return null;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#B6FC00',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  buttonText: {
    color: '#0C0C11',
    fontWeight: 'bold',
  },
});
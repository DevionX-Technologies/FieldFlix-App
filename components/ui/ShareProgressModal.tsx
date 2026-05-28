import { FF } from '@/screens/fieldflix/fonts';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  /** 0–1 when known; omit for indeterminate (preparing on server). */
  progress?: number | null;
};

export function ShareProgressModal({
  visible,
  title,
  message,
  progress = null,
}: Props) {
  const pct =
    typeof progress === 'number' && Number.isFinite(progress)
      ? Math.min(1, Math.max(0, progress))
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      hardwareAccelerated
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            {pct == null ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.pctText}>{Math.round(pct * 100)}%</Text>
            )}
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.track}>
            {pct == null ? (
              <View style={styles.indeterminate}>
                <LinearGradient
                  colors={['#22c55e', '#86efac', '#22c55e']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.indeterminateFill}
                />
              </View>
            ) : (
              <View style={[styles.fill, { width: `${pct * 100}%` }]} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 22,
    backgroundColor: 'rgba(13, 21, 31, 0.98)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    ...Platform.select({
      ios: {
        shadowColor: '#22c55e',
        shadowOpacity: 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 10 },
    }),
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  pctText: {
    fontFamily: FF.bold,
    fontSize: 14,
    color: '#fff',
  },
  title: {
    fontFamily: FF.bold,
    fontSize: 17,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(203, 213, 225, 0.92)',
    textAlign: 'center',
    marginBottom: 16,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  indeterminate: {
    height: '100%',
    width: '40%',
  },
  indeterminateFill: {
    flex: 1,
    borderRadius: 3,
    opacity: 0.9,
  },
});

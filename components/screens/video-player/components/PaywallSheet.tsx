import { Paths } from '@/data/paths';
import { FF } from '@/screens/fieldflix/fonts';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const ACCENT = '#22C55E';

type Props = {
  visible: boolean;
  onClose: () => void;
  onUpgradePress?: () => void;
  message?: string;
};

/**
 * Shown when a free user crosses the 2.5-minute preview cap. Hides the active video
 * behind a blurred / dimmed overlay and routes the user to the premium plan screen.
 */
export function PaywallSheet({ visible, onClose, onUpgradePress, message }: Props) {
  const router = useRouter();

  const handleUpgrade = () => {
    onUpgradePress?.();
    router.push(Paths.profilePremium);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.lockBadge}>
            <LockIcon />
          </View>
          <Text style={styles.title}>Preview ended</Text>
          <Text style={styles.body}>
            {message ??
              'You\'ve watched the free preview. Unlock the full match and all highlights with a FieldFlicks plan.'}
          </Text>
          <Pressable
            onPress={handleUpgrade}
            style={styles.cta}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to view full video"
          >
            <LinearGradient
              colors={[ACCENT, '#16a34a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.ctaText}>View plans</Text>
          </Pressable>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
            <Text style={styles.closeText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function LockIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 10V8a6 6 0 0112 0v2M5 10h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z"
        stroke="#fff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 24,
    backgroundColor: '#0c1218',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    alignItems: 'center',
    gap: 12,
  },
  lockBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(34,197,94,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: FF.bold,
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
  },
  body: {
    fontFamily: FF.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  cta: {
    width: '100%',
    height: 52,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaText: {
    fontFamily: FF.bold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.2,
  },
  close: {
    paddingVertical: 8,
  },
  closeText: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
  },
});

export default PaywallSheet;

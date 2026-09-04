import { Text } from '@/components/ui/text';
import useTheme from '@/theme/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';

interface CustomModalProps {
  visible: boolean;
  type: 'info' | 'success' | 'error' | 'loading';
  title: string;
  message: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  buttonText?: string;
  /** When set (and type is not `loading`), `onClose` runs after this many ms. */
  autoDismissMs?: number;
  visualVariant?: 'default' | 'session';
}

export const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  type,
  title,
  message,
  showCloseButton = true,
  onClose,
  buttonText = 'Got it',
  autoDismissMs,
  visualVariant = 'default',
}) => {
  const { colors } = useTheme();
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark' || true;

  useEffect(() => {
    if (!visible || !autoDismissMs || type === 'loading' || !onClose) return;
    const id = setTimeout(() => onClose(), autoDismissMs);
    return () => clearTimeout(id);
  }, [visible, autoDismissMs, type, onClose]);

  const getIconColor = () => '#FFFFFF';

  const getIconBackgroundColor = () => {
    switch (type) {
      case 'loading':
        return colors.primary;
      case 'success':
        return '#34C759';
      case 'error':
        return '#FF3B30';
      case 'info':
        return '#FF9500';
      default:
        return colors.primary;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'loading':
        return <ActivityIndicator size="small" color={getIconColor()} />;
      case 'success':
        return <Ionicons name="checkmark" size={24} color={getIconColor()} />;
      case 'error':
        return <Ionicons name="close" size={24} color={getIconColor()} />;
      case 'info':
        return <Ionicons name="information" size={24} color={getIconColor()} />;
      default:
        return <Ionicons name="information" size={24} color={getIconColor()} />;
    }
  };

  const dynamicStyles = StyleSheet.create({
    modalInner: {
      backgroundColor: isDark ? 'rgba(13,21,31,0.98)' : '#FFFFFF',
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0, 0, 0, 0.1)',
    },
    modalTitle: {
      color: isDark ? '#FFFFFF' : '#000000',
    },
    modalMessage: {
      color: isDark ? 'rgba(203,213,225,0.9)' : 'rgba(0, 0, 0, 0.7)',
    },
    modalButton: {
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderColor: 'rgba(255,255,255,0.2)',
      shadowColor: 'transparent',
    },
    modalButtonText: {
      color: '#FFFFFF',
    },
    sessionHint: {
      color: isDark ? 'rgba(148,163,184,0.85)' : 'rgba(0,0,0,0.45)',
    },
  });

  const showSessionChrome = visualVariant === 'session' && type !== 'loading';

  const innerCard = (
    <View
      style={[
        styles.modalInner,
        dynamicStyles.modalInner,
        showSessionChrome && styles.sessionInnerCard,
      ]}
    >
      <View style={styles.modalHeader}>
        <View
          style={[
            styles.modalIcon,
            showSessionChrome && styles.sessionIconRing,
            { backgroundColor: getIconBackgroundColor() },
          ]}
        >
          {getIcon()}
        </View>
        <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>{title}</Text>
      </View>

      <Text style={[styles.modalMessage, dynamicStyles.modalMessage]}>{message}</Text>

      {showSessionChrome && autoDismissMs ? (
        <Text style={[styles.autoDismissHint, dynamicStyles.sessionHint]}>
          Closes automatically in a few seconds, tap ✕ to dismiss.
        </Text>
      ) : null}

      {showCloseButton && type !== 'loading' && onClose && !showSessionChrome ? (
        <Pressable
          style={[styles.modalButton, dynamicStyles.modalButton]}
          onPress={onClose}
        >
          <Text style={[styles.modalButtonText, dynamicStyles.modalButtonText]}>
            {buttonText}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Modal
      animationType={Platform.OS === 'android' ? 'none' : 'fade'}
      transparent
      visible={visible}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {showSessionChrome ? (
          <LinearGradient
            colors={['rgba(34,197,94,0.55)', 'rgba(22,163,74,0.25)', 'rgba(2,6,23,0.92)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sessionFrame}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              style={styles.sessionClose}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color="rgba(248,250,252,0.9)" />
            </Pressable>
            {innerCard}
          </LinearGradient>
        ) : (
          innerCard
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sessionFrame: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 2,
    position: 'relative',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 14,
  },
  sessionClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2,6,23,0.45)',
  },
  sessionInnerCard: {
    borderRadius: 20,
    borderWidth: 0,
  },
  sessionIconRing: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  modalInner: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  modalIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  modalMessage: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  autoDismissHint: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: -10,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  modalButton: {
    minHeight: 44,
    minWidth: 128,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

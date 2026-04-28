import { Text } from '@/components/ui/text';
import useTheme from '@/theme/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
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
}

export const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  type,
  title,
  message,
  showCloseButton = true,
  onClose,
  buttonText = 'Got it',
}) => {
  const { colors } = useTheme();
  const systemColorScheme = useColorScheme();
  // Use system color scheme or force dark mode if needed
  const isDark = systemColorScheme === 'dark' || true;

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
    modalContent: {
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
  });

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
        <View style={[styles.modalContent, dynamicStyles.modalContent]}>
          <View style={styles.modalHeader}>
            <View
              style={[
                styles.modalIcon,
                { backgroundColor: getIconBackgroundColor() },
              ]}
            >
              {getIcon()}
            </View>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
              {title}
            </Text>
          </View>

          <Text style={[styles.modalMessage, dynamicStyles.modalMessage]}>
            {message}
          </Text>

          {showCloseButton && type !== 'loading' && onClose && (
            <Pressable
              style={[styles.modalButton, dynamicStyles.modalButton]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, dynamicStyles.modalButtonText]}>{buttonText}</Text>
            </Pressable>
          )}
        </View>
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
  modalContent: {
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
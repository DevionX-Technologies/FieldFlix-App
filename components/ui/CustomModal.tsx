import { Text } from '@/components/ui/text';
import useTheme from '@/theme/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
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
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    modalTitle: {
      color: isDark ? '#FFFFFF' : '#000000',
    },
    modalMessage: {
      color: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
    },
    modalButton: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
    },
  });

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContent, dynamicStyles.modalContent]}>
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
              <Text style={styles.modalButtonText}>{buttonText}</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    minWidth: 280,
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
import { CustomModal } from '@/components/ui/CustomModal';
import React, { useState } from 'react';

interface ModalConfig {
  type: 'info' | 'success' | 'error' | 'loading';
  title: string;
  message: string;
  buttonText?: string;
}

export function useCustomModal() {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    type: 'info',
    title: '',
    message: '',
    buttonText: 'Got it',
  });

  const showModal = (
    type: 'info' | 'success' | 'error' | 'loading',
    title: string,
    message: string,
    buttonText: string = 'Got it'
  ) => {
    setModalConfig({ type, title, message, buttonText });
    setModalVisible(true);
  };

  const hideModal = () => {
    setModalVisible(false);
  };

  // Convenience methods that match Alert.alert signature
  const showAlert = (title: string, message?: string, buttonText: string = 'OK') => {
    showModal('info', title, message || '', buttonText);
  };

  const showSuccess = (title: string, message?: string, buttonText: string = 'Great!') => {
    showModal('success', title, message || '', buttonText);
  };

  const showError = (title: string, message?: string, buttonText: string = 'OK') => {
    showModal('error', title, message || '', buttonText);
  };

  const showLoading = (title: string, message?: string) => {
    showModal('loading', title, message || '');
  };

  const ModalComponent = (
    <CustomModal
      visible={modalVisible}
      type={modalConfig.type}
      title={modalConfig.title}
      message={modalConfig.message}
      buttonText={modalConfig.buttonText}
      onClose={hideModal}
      showCloseButton={modalConfig.type !== 'loading'}
    />
  );

  return {
    showModal,
    showAlert,
    showSuccess,
    showError,
    showLoading,
    hideModal,
    modalVisible,
    modalConfig,
    ModalComponent,
  };
}
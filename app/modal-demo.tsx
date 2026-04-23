import { CustomModal } from '@/components/ui/CustomModal';
import { Text } from '@/components/ui/text';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export default function ModalDemo() {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    type: 'success' as 'info' | 'success' | 'error' | 'loading',
    title: 'Recording Stopped',
    message: 'Your recording has been successfully stopped. You would be able to view it in your recordings list in a few minutes.',
  });

  const showModal = (type: 'info' | 'success' | 'error' | 'loading', title: string, message: string) => {
    setModalConfig({ type, title, message });
    setModalVisible(true);
  };

  const hideModal = () => {
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modal Demo</Text>
      
      <Pressable 
        style={[styles.button, { backgroundColor: '#34C759' }]}
        onPress={() => showModal('success', 'Recording Stopped', 'Your recording has been successfully stopped. You would be able to view it in your recordings list in a few minutes.')}
      >
        <Text style={styles.buttonText}>Show Success Modal</Text>
      </Pressable>

      <Pressable 
        style={[styles.button, { backgroundColor: '#FF3B30' }]}
        onPress={() => showModal('error', 'Recording Failed', 'Unable to stop the recording. Please check your connection and try again.')}
      >
        <Text style={styles.buttonText}>Show Error Modal</Text>
      </Pressable>

      <Pressable 
        style={[styles.button, { backgroundColor: '#FF9500' }]}
        onPress={() => showModal('info', 'Recording in Progress', 'Please stop the current recording before starting a new one.')}
      >
        <Text style={styles.buttonText}>Show Info Modal</Text>
      </Pressable>

      <CustomModal
        visible={modalVisible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={hideModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    minWidth: 200,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
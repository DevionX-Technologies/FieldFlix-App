import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { useRazorpay } from '../hooks/useRazorpay';
import { RAZORPAY_CONFIG } from '../services/razorpayConfig';
import { PaymentResponse, PaymentError } from '../services/razorpayService';
import { showRazorpaySetupInstructions } from '../utils/razorpayUtils';

interface TestRazorpayButtonProps {
  amount?: number; // Amount in rupees (default: 1)
  title?: string;
  style?: any;
  disabled?: boolean;
  onPaymentSuccess?: (response: PaymentResponse) => void;
  onPaymentError?: (error: PaymentError) => void;
}

const TestRazorpayButton: React.FC<TestRazorpayButtonProps> = ({
  amount = 1,
  title = 'Test Razorpay Payment',
  style,
  disabled = false,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const handlePaymentSuccess = (response: PaymentResponse) => {
    console.log('🎉 Test Payment Success:', response);
    Alert.alert(
      '✅ Payment Successful!',
      `Payment ID: ${response.razorpay_payment_id}\nOrder ID: ${response.razorpay_order_id}\nSignature: ${response.razorpay_signature}`,
      [{ text: 'OK' }]
    );
    
    if (onPaymentSuccess) {
      onPaymentSuccess(response);
    }
  };

  const handlePaymentError = (error: PaymentError) => {
    console.log('❌ Test Payment Error:', error);
    Alert.alert(
      '❌ Payment Failed',
      `Error Code: ${error.code}\nDescription: ${error.description}\nSource: ${error.source}\nStep: ${error.step}\nReason: ${error.reason}`,
      [{ text: 'OK' }]
    );
    
    if (onPaymentError) {
      onPaymentError(error);
    }
  };

  const { initiatePayment, isLoading, error, clearError } = useRazorpay({
    apiKey: RAZORPAY_CONFIG.API_KEY,
    onSuccess: handlePaymentSuccess,
    onError: handlePaymentError,
  });

  const handleTestPayment = () => {
    // Check if running in Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';
    
    if (isExpoGo) {
      showRazorpaySetupInstructions();
      return;
    }

    if (error) {
      clearError();
    }

    const testPaymentOptions = {
      name: 'FieldFlicks Test',
      description: `Test payment of ₹${amount}`,
      image: 'https://fieldflicks.com/logo.png', // Replace with your actual logo
      amount: amount * 100, // Convert to paisa
      currency: 'INR',
      prefill: {
        email: 'test@fieldflicks.com',
        contact: '+919876543210',
        name: 'Test User',
      },
      theme: {
        color: '#00BAF2',
      },
      notes: {
        purpose: 'Test Payment',
        platform: 'FieldFlicks Mobile App',
        timestamp: new Date().toISOString(),
      },
    };

    initiatePayment(testPaymentOptions);
  };

  const isExpoGo = Constants.appOwnership === 'expo';

  if (error) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.errorButton, style]}
        onPress={clearError}
      >
        <Text style={styles.errorButtonText}>
          ⚠️ Error: Tap to retry
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isLoading && styles.loadingButton,
        disabled && styles.disabledButton,
        isExpoGo && styles.expoGoButton,
        style,
      ]}
      onPress={handleTestPayment}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <>
          <ActivityIndicator color="#ffffff" size="small" />
          <Text style={styles.buttonText}> Processing...</Text>
        </>
      ) : (
        <Text style={styles.buttonText}>
          {isExpoGo 
            ? `📱 Setup Guide (₹${amount})` 
            : `${title} (₹${amount})`
          }
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#00BAF2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 48,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingButton: {
    backgroundColor: '#0099CC',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  errorButton: {
    backgroundColor: '#f44336',
  },
  errorButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  expoGoButton: {
    backgroundColor: '#6c5ce7',
  },
});

export default TestRazorpayButton;
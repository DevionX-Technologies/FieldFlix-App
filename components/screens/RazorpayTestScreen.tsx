import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import TestRazorpayButton from '../TestRazorpayButton';
import { PaymentResponse, PaymentError } from '../../services/razorpayService';

const RazorpayTestScreen: React.FC = () => {
  const handlePaymentSuccess = (response: PaymentResponse) => {
    console.log('Test screen - Payment Success:', response);
    // Handle successful payment here
    // You can save payment details, update user subscription, etc.
  };

  const handlePaymentError = (error: PaymentError) => {
    console.log('Test screen - Payment Error:', error);
    // Handle payment error here
    // You can log errors, show user-friendly messages, etc.
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Razorpay Test Screen</Text>
        
        <Text style={styles.description}>
          Test different payment scenarios with various amounts:
        </Text>

        <View style={styles.buttonContainer}>
          <Text style={styles.sectionTitle}>Small Payment Test</Text>
          <TestRazorpayButton
            amount={1}
            title="₹1 Test Payment"
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Text style={styles.sectionTitle}>Medium Payment Test</Text>
          <TestRazorpayButton
            amount={100}
            title="₹100 Test Payment"
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Text style={styles.sectionTitle}>Premium Payment Test</Text>
          <TestRazorpayButton
            amount={999}
            title="₹999 Premium Test"
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>📝 Testing Notes:</Text>
          <Text style={styles.infoText}>
            • These are test payments using Razorpay test keys{'\n'}
            • No real money will be charged{'\n'}
            • Payments will only work in development builds{'\n'}
            • Use test card numbers for successful payments{'\n'}
            • Check console logs for detailed payment responses
          </Text>
        </View>

        <View style={styles.testCardsContainer}>
          <Text style={styles.infoTitle}>💳 Test Card Numbers:</Text>
          <Text style={styles.testCardText}>
            Success: 4111 1111 1111 1111{'\n'}
            Failure: 4000 0000 0000 0002{'\n'}
            CVV: Any 3 digits{'\n'}
            Expiry: Any future date
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22,
  },
  buttonContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 15,
  },
  testCardsContainer: {
    backgroundColor: '#f3e5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  testCardText: {
    fontSize: 14,
    color: '#555',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
});

export default RazorpayTestScreen;
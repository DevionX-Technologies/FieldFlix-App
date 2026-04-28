import { TOKEN_KEY } from '@/data/constants';
import { canUseReactNativeFirebase } from '@/utils/canUseReactNativeFirebase';
import messaging from '@react-native-firebase/messaging';
import * as SecureStore from 'expo-secure-store'; // Or AsyncStorage
import axiosInstance from './axiosInstance';



/**
 * Get permission and fetch FCM token
 */
export const requestAndRegisterFcmToken = async () => {
  if (!canUseReactNativeFirebase()) {
    return;
  }
  try {
    const authStatus = await messaging().requestPermission();
    const isAuthorized =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!isAuthorized) {
      console.warn('🔒 Notification permission denied:', authStatus);
      return;
    }

    const currentToken = await messaging().getToken();
    const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);

    if (currentToken && currentToken !== storedToken) {
      console.log('📲 Sending new FCM token to backend:', currentToken);

      await axiosInstance.put('/users/register/deviceId', {
        deviceId: currentToken,
      });

      await SecureStore.setItemAsync(TOKEN_KEY, currentToken);
    } else {
      console.log('✅ FCM token already registered or unchanged');
    }
  } catch (error) {
    console.error('❌ FCM token registration error:', error);
  }
};

/**
 * Handle token refreshes and update backend if needed
 */
export const setupFcmTokenRefreshListener = () => {
  if (!canUseReactNativeFirebase()) {
    return;
  }
  messaging().onTokenRefresh(async (newToken) => {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        console.log("stored token",storedToken)
      if (newToken !== storedToken) {
        console.log('🔄 FCM token refreshed. Updating backend:', newToken);

        await axiosInstance.put('/users/register/deviceId', {
          deviceId: newToken,
        });

        await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      } else {
        console.log('ℹ️ Refreshed FCM token unchanged, skipping update.');
      }
    } catch (error) {
      console.error('❌ Error updating refreshed FCM token:', error);
    }
  });
};

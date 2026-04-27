import { TOKEN_KEY } from '@/data/constants';
import { canUseReactNativeFirebase } from '@/utils/canUseReactNativeFirebase';
import messaging from '@react-native-firebase/messaging';
import * as SecureStore from 'expo-secure-store'; // Or AsyncStorage
import axiosInstance from './axiosInstance';

let tokenRefreshSubscribed = false;

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
    if (!currentToken) {
      console.warn('FCM: no device token from Firebase');
      return;
    }

    // Always upsert on the server so the userDevices row exists (phone login, reinstall, same token).
    try {
      await axiosInstance.put('/users/register/deviceId', {
        deviceId: currentToken,
      });
      await SecureStore.setItemAsync(TOKEN_KEY, currentToken);
      console.log('✅ FCM device id registered with backend');
    } catch (e) {
      console.error('FCM: failed to register device with backend (not logged in yet?)', e);
    }
  } catch (error) {
    console.error('❌ FCM token registration error:', error);
  }
};

/**
 * Handle token refreshes and update backend if needed
 */
export const setupFcmTokenRefreshListener = () => {
  if (!canUseReactNativeFirebase() || tokenRefreshSubscribed) {
    return;
  }
  tokenRefreshSubscribed = true;
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

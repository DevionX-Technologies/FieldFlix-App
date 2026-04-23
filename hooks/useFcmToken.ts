// src/hooks/useFcmToken.ts
import { canUseReactNativeFirebase } from '@/utils/canUseReactNativeFirebase';
import messaging from '@react-native-firebase/messaging';
import { useEffect, useState } from 'react';

export function useFcmToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!canUseReactNativeFirebase()) {
      return;
    }
    (async () => {
      const authStatus = await messaging().requestPermission();
      if (authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL) {
        const fcmToken = await messaging().getToken();
        console.log('📱 FCM token:', fcmToken);
        setToken(fcmToken);
        // TODO: send this token to your server, tied to the current user
      } else {
        console.warn('FCM permission declined:', authStatus);
      }
    })();

    // Optional: refresh token listener
    return messaging().onTokenRefresh(newToken => {
      console.log('🔄 FCM token refreshed:', newToken);
      setToken(newToken);
      // TODO: update your server record
    });
  }, []);

  return token;
}
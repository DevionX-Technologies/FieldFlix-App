import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

export interface AppleSignInConfigStatus {
  platform: string;
  isIOS: boolean;
  moduleAvailable: boolean;
  appleSignInAvailable: boolean | null;
  bundleId: string;
  error?: string;
}

export const checkAppleSignInConfig = async (): Promise<AppleSignInConfigStatus> => {
  const status: AppleSignInConfigStatus = {
    platform: Platform.OS,
    isIOS: Platform.OS === 'ios',
    moduleAvailable: false,
    appleSignInAvailable: null,
    bundleId: 'com.fieldflicks', // Your configured bundle ID
  };

  try {
    // Check if the module is available (development build vs Expo Go)
    if (AppleAuthentication && AppleAuthentication.isAvailableAsync) {
      status.moduleAvailable = true;
      
      if (Platform.OS === 'ios') {
        // Check if Apple Sign-In is available on this device
        const available = await AppleAuthentication.isAvailableAsync();
        status.appleSignInAvailable = available;
        
        if (!available) {
          status.error = 'Apple Sign-In not available. Check: iOS 13+, Apple Developer Console configuration, Bundle ID capability';
        }
      } else {
        status.error = 'Apple Sign-In only available on iOS';
      }
    } else {
      status.error = 'expo-apple-authentication module not available. Are you using Expo Go? Need development build.';
    }
  } catch (error: any) {
    status.error = `Configuration check failed: ${error.message}`;
  }

  return status;
};

export const logAppleSignInStatus = async () => {
  console.log('🍎 === Apple Sign-In Configuration Check ===');
  
  const status = await checkAppleSignInConfig();
  
  console.log('📱 Platform:', status.platform);
  console.log('🍎 Is iOS:', status.isIOS ? '✅' : '❌');
  console.log('📦 Module Available:', status.moduleAvailable ? '✅' : '❌');
  console.log('🔐 Apple Sign-In Available:', 
    status.appleSignInAvailable === true ? '✅' : 
    status.appleSignInAvailable === false ? '❌' : '⏳ Checking...'
  );
  console.log('📱 Bundle ID:', status.bundleId);
  
  if (status.error) {
    console.log('❌ Error:', status.error);
  } else if (status.appleSignInAvailable) {
    console.log('✅ Apple Sign-In is ready to use!');
  }
  
  console.log('🍎 ========================================');
  
  return status;
};
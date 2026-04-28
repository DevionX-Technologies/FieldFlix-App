import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * @react-native-firebase/* needs native binaries. That is not available in Expo Go
 * (StoreClient) or on web. Calling `app.app()`, `messaging()`, etc. there crashes immediately.
 */
export function canUseReactNativeFirebase(): boolean {
  if (Platform.OS === 'web') return false;
  // Expo Go cannot load @react-native-firebase native modules.
  if (Constants.appOwnership === 'expo') return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  return true;
}

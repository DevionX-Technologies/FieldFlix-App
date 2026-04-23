import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// App Store URLs
const APP_STORE_URLS = {
  ios: 'https://apps.apple.com/app/fieldflicks/id1234567890', // TODO: Replace with your actual App Store ID when available
  android: 'https://play.google.com/store/apps/details?id=com.fieldflicks&hl=en_IN',
};

// Deep link configuration
export const DEEP_LINK_CONFIG = {
  scheme: 'fieldflicks',
  domain: 'www.fieldflicks.com',
};

export const generateShareableRecordingURL = (recordingId: string, muxPlaybackUrl?: string): string => {
  // Create a universal link that works with Framer (using URL parameters)
  const params = new URLSearchParams({
    id: recordingId,
    ...(muxPlaybackUrl && { fallback: muxPlaybackUrl }),
  });
  
  const universalLink = `https://${DEEP_LINK_CONFIG.domain}/shared-recording?${params.toString()}`;
  
  return universalLink; // Return universal link for better web compatibility
};

export const parseSharedRecordingURL = (url: string): { recordingId?: string; fallbackUrl?: string } => {
  try {
    const parsedUrl = Linking.parse(url);
    
    // Handle both deep links and universal links
    if (parsedUrl.path?.includes('/shared-recording')) {
      const pathParts = parsedUrl.path.split('/');
      const recordingId = pathParts[pathParts.length - 1];
      
      return {
        recordingId,
        fallbackUrl: parsedUrl.queryParams?.fallbackUrl as string,
      };
    }
    
    return {};
  } catch (error) {
    console.error('Error parsing shared recording URL:', error);
    return {};
  }
};

export const getAppStoreURL = (): string => {
  return Platform.OS === 'ios' ? APP_STORE_URLS.ios : APP_STORE_URLS.android;
};

export const createUniversalShareLink = (recordingId: string, muxPlaybackUrl?: string): string => {
  // This would ideally be handled by your backend/website
  // The website should detect if the app is installed and redirect accordingly
  const baseUrl = `https://${DEEP_LINK_CONFIG.domain}`;
  const params = new URLSearchParams({
    recordingId,
    ...(muxPlaybackUrl && { fallback: muxPlaybackUrl }),
    // Add app store URLs for fallback
    iosApp: APP_STORE_URLS.ios,
    androidApp: APP_STORE_URLS.android,
  });
  
  return `${baseUrl}/shared-recording/${recordingId}?${params.toString()}`;
};

/**
 * Handles incoming deep link URLs when the app is opened
 * @param url - The incoming URL
 * @param navigation - Navigation object to handle routing
 */
export const handleIncomingDeepLink = (url: string, navigation: any) => {
  const { recordingId, fallbackUrl } = parseSharedRecordingURL(url);
  
  if (recordingId) {
    // Navigate to shared recording view
    // You'll need to implement this navigation logic based on your app structure
    navigation.navigate('SharedRecording', { 
      recordingId, 
      fallbackUrl,
      isShared: true 
    });
  }
};

/**
 * Custom share message for different platforms
 */
export const getShareMessage = (recordingId: string): string => {
  return `Check out this amazing game recording I captured with FieldFlicks! 🎥⚽\n\nTap to watch: `;
};
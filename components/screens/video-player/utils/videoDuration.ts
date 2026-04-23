/**
 * Utilities for extracting video duration from Mux API with caching
 */

import { MUX_TOKEN_ID, MUX_TOKEN_SECRET } from '@/data/constants';
import { cacheDuration, getCachedDuration } from './durationCache';

/**
 * Mux API response interface for asset metadata
 */
interface MuxAssetTrack {
  type: 'video' | 'audio';
  max_width?: number;
  max_height?: number;
  max_frame_rate?: number;
  max_channels?: number;
  id: string;
  duration: number;
}

interface MuxAssetData {
  tracks: MuxAssetTrack[];
  status: string;
  resolution_tier: string;
  playback_ids: {
    policy: string;
    id: string;
  }[];
  passthrough?: string;
  max_stored_resolution: string;
  max_stored_frame_rate: number;
  max_resolution_tier: string;
  master_access: string;
  id: string;
  encoding_tier: string;
  video_quality: string;
  duration: number;
  created_at: string;
  aspect_ratio: string;
}

interface MuxAssetResponse {
  data: MuxAssetData;
}

/**
 * Create basic authentication header for Mux API
 */
const createMuxAuthHeader = (): string => {
  const credentials = `${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`;
  return `Basic ${btoa(credentials)}`;
};

/**
 * Get video duration directly from Mux API endpoint
 * Uses the /video/v1/assets/{asset_id} endpoint to fetch duration
 */
export const getDurationFromMuxAPI = async (assetId: string): Promise<number | null> => {
  try {
    console.log('Fetching duration from Mux API for asset:', assetId);

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      console.warn('Mux API credentials not found in constants');
      return null;
    }

    // Make request directly to Mux API endpoint
    const response = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': createMuxAuthHeader(),
      },
    });

    if (!response.ok) {
      console.warn(`Mux API request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: MuxAssetResponse = await response.json();
    
    if (data.data && data.data.duration) {
      console.log('Duration extracted from Mux API:', data.data.duration);
      return data.data.duration;
    }

    console.warn('No duration found in Mux API response');
    return null;
  } catch (error) {
    console.warn('Failed to fetch duration from Mux API:', error);
    return null;
  }
};

/**
 * Extract asset ID from various sources (playback URL, asset ID, etc.)
 */
export const extractAssetId = (source: string): string | null => {
  try {
    // If it's already an asset ID (starts with alphanumeric and is long)
    if (source && /^[a-zA-Z0-9]{20,}$/.test(source)) {
      return source;
    }

    // If it's a playback URL, we need to map playback ID to asset ID
    // This typically requires your backend API since playback IDs don't directly map to asset IDs
    console.warn('Cannot extract asset ID from playback URL - requires backend mapping');
    return null;
  } catch (error) {
    console.warn('Failed to extract asset ID:', error);
    return null;
  }
};

/**
 * Main function to get video duration from asset ID with caching
 * First checks cache, then falls back to API call
 */
export const getVideoDurationFromAssetWithCache = async (assetId: string, recordingId: string): Promise<number | null> => {
  try {
    if (!assetId || !recordingId) {
      console.warn('No asset ID or recording ID provided');
      return null;
    }

    // First check cache
    const cachedDuration = await getCachedDuration(recordingId);
    if (cachedDuration !== null) {
      console.log(`Using cached duration for recording ${recordingId}: ${cachedDuration}s`);
      return cachedDuration;
    }

    console.log(`No cached duration found for recording ${recordingId}, fetching from API...`);
    
    // Use direct Mux API call
    const duration = await getDurationFromMuxAPI(assetId);
    if (duration && duration > 0) {
      // Cache the result
      await cacheDuration(recordingId, duration);
      return duration;
    }

    console.warn('Could not extract duration from Mux API');
    return null;
  } catch (error) {
    console.error('Error getting video duration from asset with cache:', error);
    return null;
  }
};

/**
 * Main function to get video duration from asset ID
 * Uses direct Mux API call
 */
export const getVideoDurationFromAsset = async (assetId: string): Promise<number | null> => {
  try {
    if (!assetId) {
      console.warn('No asset ID provided');
      return null;
    }
    // Use direct Mux API call
    const duration = await getDurationFromMuxAPI(assetId);
    if (duration && duration > 0) {
      return duration;
    }

    console.warn('Could not extract duration from Mux API');
    return null;
  } catch (error) {
    console.error('Error getting video duration from asset:', error);
    return null;
  }
};

/**
 * Utility function to format duration in human-readable format
 */
export const formatVideoDuration = (seconds: number | null): string => {
  if (!seconds || seconds < 0) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
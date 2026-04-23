/**
 * Video duration caching utility using AsyncStorage
 * Caches recording ID -> duration mapping to avoid repeated API calls
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'video_duration_cache';
const CACHE_VERSION_KEY = 'video_duration_cache_version';
const CURRENT_CACHE_VERSION = '1.0';

export interface DurationCacheEntry {
  duration: number;
  timestamp: number;
  recordingId: string;
}

export interface DurationCache {
  [recordingId: string]: DurationCacheEntry;
}

/**
 * Initialize cache and handle version updates
 */
const initializeCache = async (): Promise<DurationCache> => {
  try {
    const [cacheVersion, cacheData] = await Promise.all([
      AsyncStorage.getItem(CACHE_VERSION_KEY),
      AsyncStorage.getItem(CACHE_KEY)
    ]);

    // If version mismatch, clear cache
    if (cacheVersion !== CURRENT_CACHE_VERSION) {
      console.log('Cache version mismatch, clearing cache');
      await AsyncStorage.multiRemove([CACHE_KEY, CACHE_VERSION_KEY]);
      await AsyncStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
      return {};
    }

    if (!cacheData) {
      return {};
    }

    const parsedCache: DurationCache = JSON.parse(cacheData);
    return parsedCache || {};
  } catch (error) {
    console.warn('Error initializing duration cache:', error);
    return {};
  }
};

/**
 * Save cache to AsyncStorage
 */
const saveCache = async (cache: DurationCache): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Error saving duration cache:', error);
  }
};

/**
 * Get cached duration for a recording ID
 */
export const getCachedDuration = async (recordingId: string): Promise<number | null> => {
  try {
    if (!recordingId) return null;

    const cache = await initializeCache();
    const entry = cache[recordingId];

    if (!entry) return null;

    // Cache entries are valid indefinitely unless cache version changes
    console.log(`Found cached duration for ${recordingId}: ${entry.duration}s`);
    return entry.duration;
  } catch (error) {
    console.warn('Error getting cached duration:', error);
    return null;
  }
};

/**
 * Cache a duration for a recording ID
 */
export const cacheDuration = async (recordingId: string, duration: number): Promise<void> => {
  try {
    if (!recordingId || !duration || duration <= 0) return;

    const cache = await initializeCache();
    
    cache[recordingId] = {
      duration,
      timestamp: Date.now(),
      recordingId
    };

    await saveCache(cache);
    console.log(`Cached duration for ${recordingId}: ${duration}s`);
  } catch (error) {
    console.warn('Error caching duration:', error);
  }
};

/**
 * Get multiple cached durations at once
 */
export const getMultipleCachedDurations = async (recordingIds: string[]): Promise<Record<string, number>> => {
  try {
    const cache = await initializeCache();
    const result: Record<string, number> = {};

    recordingIds.forEach(recordingId => {
      if (recordingId && cache[recordingId]) {
        result[recordingId] = cache[recordingId].duration;
      }
    });

    return result;
  } catch (error) {
    console.warn('Error getting multiple cached durations:', error);
    return {};
  }
};

/**
 * Clear all cached durations
 */
export const clearDurationCache = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([CACHE_KEY, CACHE_VERSION_KEY]);
    console.log('Duration cache cleared');
  } catch (error) {
    console.warn('Error clearing duration cache:', error);
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<{ totalEntries: number; oldestEntry: number | null; newestEntry: number | null }> => {
  try {
    const cache = await initializeCache();
    const entries = Object.values(cache);
    
    if (entries.length === 0) {
      return { totalEntries: 0, oldestEntry: null, newestEntry: null };
    }

    const timestamps = entries.map(entry => entry.timestamp);
    
    return {
      totalEntries: entries.length,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps)
    };
  } catch (error) {
    console.warn('Error getting cache stats:', error);
    return { totalEntries: 0, oldestEntry: null, newestEntry: null };
  }
};
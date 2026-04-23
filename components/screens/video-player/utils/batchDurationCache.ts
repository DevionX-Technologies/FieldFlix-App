/**
 * Batch utility for handling multiple video duration requests with caching
 */

import { useEffect, useState } from 'react';
import { cacheDuration, getMultipleCachedDurations } from './durationCache';
import { getDurationFromMuxAPI } from './videoDuration';

export interface RecordingDurationRequest {
  recordingId: string;
  assetId?: string;
  muxPlaybackUrl?: string;
}

export interface RecordingDurationResult {
  recordingId: string;
  duration: number | null;
  fromCache: boolean;
  error?: string;
}

/**
 * Batch fetch durations for multiple recordings, using cache when possible
 */
export const batchGetRecordingDurations = async (
  requests: RecordingDurationRequest[]
): Promise<RecordingDurationResult[]> => {
  const results: RecordingDurationResult[] = [];
  
  try {
    // Get all recording IDs
    const recordingIds = requests.map(req => req.recordingId);
    
    // Check cache for all recordings at once
    const cachedDurations = await getMultipleCachedDurations(recordingIds);
    
    // Separate cached and uncached requests
    const cachedRequests: RecordingDurationRequest[] = [];
    const uncachedRequests: RecordingDurationRequest[] = [];
    
    requests.forEach(request => {
      if (cachedDurations[request.recordingId] !== undefined) {
        cachedRequests.push(request);
      } else {
        uncachedRequests.push(request);
      }
    });
    
    console.log(`Found ${cachedRequests.length} cached durations, fetching ${uncachedRequests.length} from API`);
    
    // Add cached results
    cachedRequests.forEach(request => {
      results.push({
        recordingId: request.recordingId,
        duration: cachedDurations[request.recordingId],
        fromCache: true
      });
    });
    
    // Fetch uncached durations from API
    const apiPromises = uncachedRequests.map(async (request): Promise<RecordingDurationResult> => {
      try {
        let assetId = request.assetId;
        
        // If no asset ID provided, try to extract from playback URL
        if (!assetId && request.muxPlaybackUrl) {
          // Simple extraction - look for asset ID in the playback URL
          // This is a simplified approach, may need adjustment based on URL format
          const urlParts = request.muxPlaybackUrl.split('/');
          const possibleAssetId = urlParts[urlParts.length - 1]?.split('.')[0];
          if (possibleAssetId && /^[a-zA-Z0-9]{20,}$/.test(possibleAssetId)) {
            assetId = possibleAssetId;
          }
        }
        
        if (!assetId) {
          return {
            recordingId: request.recordingId,
            duration: null,
            fromCache: false,
            error: 'No asset ID available'
          };
        }
        
        const duration = await getDurationFromMuxAPI(assetId);
        
        if (duration && duration > 0) {
          // Cache the result
          await cacheDuration(request.recordingId, duration);
          
          return {
            recordingId: request.recordingId,
            duration,
            fromCache: false
          };
        } else {
          return {
            recordingId: request.recordingId,
            duration: null,
            fromCache: false,
            error: 'Could not fetch duration from Mux API'
          };
        }
      } catch (error) {
        console.warn(`Error fetching duration for recording ${request.recordingId}:`, error);
        return {
          recordingId: request.recordingId,
          duration: null,
          fromCache: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
    
    // Wait for all API calls to complete
    const apiResults = await Promise.all(apiPromises);
    results.push(...apiResults);
    
    return results;
    
  } catch (error) {
    console.error('Error in batch duration fetch:', error);
    // Return error results for all requests
    return requests.map(request => ({
      recordingId: request.recordingId,
      duration: null,
      fromCache: false,
      error: error instanceof Error ? error.message : 'Batch fetch failed'
    }));
  }
};

/**
 * Hook for batch fetching durations for a list of recordings
 */

export const useBatchVideoDurations = (requests: RecordingDurationRequest[]) => {
  const [results, setResults] = useState<RecordingDurationResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchBatchDurations = async () => {
      if (requests.length === 0) {
        setResults([]);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const batchResults = await batchGetRecordingDurations(requests);
        
        if (!isCancelled) {
          setResults(batchResults);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Error in batch duration fetch:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch durations');
          setLoading(false);
        }
      }
    };

    fetchBatchDurations();

    return () => {
      isCancelled = true;
    };
  }, [requests]);

  const getDurationForRecording = (recordingId: string): number | null => {
    const result = results.find(r => r.recordingId === recordingId);
    return result?.duration || null;
  };

  return {
    results,
    loading,
    error,
    getDurationForRecording,
    totalCached: results.filter(r => r.fromCache).length,
    totalFetched: results.filter(r => !r.fromCache).length
  };
};
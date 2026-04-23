import { useEffect, useState } from 'react';
import { getVideoDurationFromAssetWithCache } from '../utils/videoDuration';

/**
 * Custom hook to fetch and manage video duration from Mux asset ID with caching
 */
export const useVideoDuration = (assetId: string | null | undefined, recordingId: string | null | undefined) => {
  const [duration, setDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchDuration = async () => {
      if (!assetId || !recordingId) {
        setDuration(null);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Use cached version that checks cache first, then API
        const videoDuration = await getVideoDurationFromAssetWithCache(assetId, recordingId);
        
        if (!isCancelled) {
          setDuration(videoDuration);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Error fetching video duration:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch duration');
          setLoading(false);
        }
      }
    };

    fetchDuration();

    return () => {
      isCancelled = true;
    };
  }, [assetId, recordingId]);

  return {
    duration,
    loading,
    error,
  };
};
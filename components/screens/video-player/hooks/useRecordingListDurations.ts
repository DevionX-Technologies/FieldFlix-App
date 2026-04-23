/**
 * Example usage of batch duration caching for recording lists
 */

import React from 'react';
import { RecordingDurationRequest, useBatchVideoDurations } from '../utils/batchDurationCache';

export interface Recording {
  id: string;
  assetId?: string;
  mux_public_playbook_url?: string;
  // ... other recording properties
}

/**
 * Hook to batch fetch durations for a list of recordings
 */
export const useRecordingListDurations = (recordings: Recording[]) => {
  const requests: RecordingDurationRequest[] = React.useMemo(() => {
    return recordings
      .filter(recording => recording.id) // Only process recordings with valid IDs
      .map(recording => ({
        recordingId: recording.id,
        assetId: recording.assetId,
        muxPlaybackUrl: recording.mux_public_playbook_url
      }));
  }, [recordings]);

  const {
    results,
    loading,
    error,
    getDurationForRecording,
    totalCached,
    totalFetched
  } = useBatchVideoDurations(requests);

  React.useEffect(() => {
    if (results.length > 0) {
      console.log(`Duration batch fetch complete: ${totalCached} from cache, ${totalFetched} from API`);
    }
  }, [results.length, totalCached, totalFetched]);

  return {
    getDurationForRecording,
    loading,
    error,
    totalCached,
    totalFetched,
    allResults: results
  };
};
import { Recording } from '@/components/screens/video-player/type';
import axiosInstance from '@/utils/axiosInstance';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

interface RecordingWithFlattendTurf extends Recording {
  name?: string;
  location?: string;
  ownerName?: string;
  sharedWithUserName?: string;
}

interface UseSharedRecordingsReturn {
  sharedRecordings: RecordingWithFlattendTurf[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useSharedRecordings = (): UseSharedRecordingsReturn => {
  const [sharedRecordings, setSharedRecordings] = useState<RecordingWithFlattendTurf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSharedWithMe = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get<unknown[]>(
        '/recording/shared-with-me?include=turf,camera,recordingHighlights',
      );
      const data = Array.isArray(response.data) ? response.data : [];
      console.log('📱 Raw shared-with-me response: ------------------', JSON.stringify(data, null, 2));
      
      // Transform the wrapped recording data to match the Recording interface
      const transformedRecordings = data.map((item: any) => {
        const recording = item.recording;
        console.log('📱 Individual recording:', recording);
        
        // Extract information from the new API response structure
        const ownerName = recording.owner_name || item.sharedByUser?.name || item.sharedByUser?.email?.split('@')[0];
        const sharedWithUserName = item.shared_with_user_name;
        const turfDetail = recording.turf_detail || recording.turf;
        const turfName = turfDetail?.name || recording.name || recording.title;
        
        // Build comprehensive location string from turf_detail
        let locationParts = [];
        if (turfDetail?.location) locationParts.push(turfDetail.location);
        if (turfDetail?.city && turfDetail.city !== turfDetail?.location) locationParts.push(turfDetail.city);
        if (turfDetail?.state && turfDetail.state !== turfDetail?.city) locationParts.push(turfDetail.state);
        
        const turfLocation = locationParts.length > 0 ? locationParts.join(', ') : 
                            (turfDetail?.address_line || recording.location || 'No location available');
        
        // Create display name showing both turf and owner
        const displayName = turfName || (ownerName ? `${ownerName}'s Recording` : `Recording #${recording.id?.toString().slice(-4)}`);
        
        // Create display location showing location and owner info
        const displayLocation = ownerName ? `${turfLocation} • Shared by ${ownerName}` : turfLocation;
        
        // Debug available data
        console.log('📱 Available data for recording:', recording.id, {
          ownerName: recording.owner_name,
          sharedWithUserName: item.shared_with_user_name,
          turfName: turfDetail?.name,
          turfLocation: turfDetail?.location,
          turfCity: turfDetail?.city,
          turfState: turfDetail?.state,
          turfAddressLine: turfDetail?.address_line,
          displayName,
          displayLocation,
          recordingHighlights: recording.recordingHighlights,
          highlightsCount: recording.recordingHighlights?.length || 0
        });
        
        return {
          ...recording,
          // Ensure status is properly mapped
          status: recording.status === 'completed' ? 'ready' : recording.status,
          // Preserve recording highlights for video player
          recordingHighlights: recording.recordingHighlights || [],
          // Add shared user info for potential display
          sharedByUser: item.sharedByUser,
          sharedWithUser: item.sharedWithUser,
          ownerName: ownerName,
          sharedWithUserName: sharedWithUserName,
          // Name should show the turf name
          name: displayName,
          // Location should show comprehensive location with owner info
          location: displayLocation,
          // Keep the detailed turf object for other components
          turf: turfDetail || {
            name: turfName || displayName,
            location: turfLocation,
            address_line: turfDetail?.address_line,
            city: turfDetail?.city,
            state: turfDetail?.state,
            postal_code: turfDetail?.postal_code,
            country: turfDetail?.country,
            geo_location: turfDetail?.geo_location,
            id: recording.turfId || turfDetail?.id || 'unknown'
          }
        } as RecordingWithFlattendTurf;
      });
      
      console.log('📱 Transformed recordings:', transformedRecordings);
      
      // Filter out duplicates based on recording ID
      const uniqueRecordings = transformedRecordings.filter((recording: RecordingWithFlattendTurf, index: number, array: RecordingWithFlattendTurf[]) => 
        array.findIndex((r: RecordingWithFlattendTurf) => r.id === recording.id) === index
      );
      
      console.log('📱 Unique recordings after deduplication:', uniqueRecordings);
      console.log('📱 Removed duplicates count:', transformedRecordings.length - uniqueRecordings.length);
      
      setSharedRecordings(uniqueRecordings);
    } catch (error: any) {
      console.error('📛 Error fetching shared-with-me recordings:', error.message);
      setError('Failed to load shared recordings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on focus (when tab becomes active)
  useFocusEffect(
    useCallback(() => {
      fetchSharedWithMe();
    }, [fetchSharedWithMe])
  );

  return {
    sharedRecordings,
    isLoading,
    error,
    refetch: fetchSharedWithMe,
  };
};
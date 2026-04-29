import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Paths } from '@/data/paths';
import { useCustomModal } from '@/hooks/useCustomModal';
import axiosInstance from '@/utils/axiosInstance';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';

export default function SharedRecordingLandingScreen() {
  const { recordingId } = useLocalSearchParams<{ recordingId: string }>();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [shouldNavigateOnModalClose, setShouldNavigateOnModalClose] = useState(false);
  const { showSuccess, showError, modalVisible, ModalComponent } = useCustomModal();
  const hasCalledAPI = useRef(false);

  useEffect(() => {
    // Prevent multiple API calls
    if (hasCalledAPI.current) {
      return;
    }

    if (!recordingId) {
      console.error('📛 DEBUG: No recordingId found in query parameters');
      showError(
        'Invalid Link',
        'No recording ID was provided in the link.',
        'OK'
      );
      setShouldNavigateOnModalClose(true);
      setIsLoading(false);
      return;
    }

    const handleSharedRecordingAPI = async (id: string) => {
      hasCalledAPI.current = true;
      setIsLoading(true);

      try {
        console.log('🚀 DEBUG: Calling shared recording API with ID:', id);
        console.log('🚀 DEBUG: API endpoint:', `/recording/shared/${id}`);

        const response = await axiosInstance.get(`/recording/shared/${id}`);

        console.log('✅ DEBUG: Shared recording API success:', response.data);
        console.log('🚀 DEBUG: Response status:', response.status);

        // Show success modal and set navigation flag
        showSuccess(
          'Recording Shared Successfully',
          'The recording has been shared with you successfully!',
          'Continue'
        );
        setShouldNavigateOnModalClose(true);

      } catch (error: any) {
        console.error('📛 DEBUG: Shared recording API error:', error);
        console.error('📛 DEBUG: Error message:', error.message);
        console.error('📛 DEBUG: Error response:', error.response?.data);
        console.error('📛 DEBUG: Error status:', error.response?.status);

        // Show error modal
        const errorMessage = error.response?.data?.message || 
                            error.message || 
                            'Failed to access the shared recording. Please try again.';

        showError(
          'Error Loading Recording',
          errorMessage,
          'OK'
        );
        setShouldNavigateOnModalClose(true);

      } finally {
        setIsLoading(false);
      }
    };

    console.log('🚀 DEBUG: Landing page received recordingId:', recordingId);
    handleSharedRecordingAPI(recordingId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId]); // Intentionally excluding showSuccess/showError to prevent infinite renders

  // Handle navigation after modal is closed
  useEffect(() => {
    if (shouldNavigateOnModalClose && !modalVisible) {
      if (recordingId) {
        console.log('🚀 DEBUG: Modal closed, navigating to shared recordings tab...');
        // Navigate to the RecordingPlaybackScreen with shared tab parameter
        router.replace(`${Paths.RecordingPlaybackScreen}?tab=shared` as any);
      } else {
        console.log('🚀 DEBUG: Modal closed, navigating to home (invalid link)...');
        router.replace('/');
      }
    }
  }, [modalVisible, shouldNavigateOnModalClose, recordingId, router]);

  return (
    <Box className="flex-1 justify-center items-center bg-app-backgroundColor px-6">
      <VStack space="lg" className="items-center">
        {isLoading ? (
          <>
            <ActivityIndicator size="large" color="#55DB26" />
            <Text className="text-white text-lg text-center">
              Loading shared recording...
            </Text>
            <Text className="text-gray-400 text-sm text-center">
              Please wait while we fetch the recording details
            </Text>
          </>
        ) : (
          <Text className="text-white text-lg text-center">
            Ready to view shared recording
          </Text>
        )}
      </VStack>

      {/* Modal Component */}
      {ModalComponent}
    </Box>
  );
}
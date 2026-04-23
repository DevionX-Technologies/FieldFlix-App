import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Paths } from "@/data/paths";
import axiosInstance from "@/utils/axiosInstance";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert } from "react-native";

export default function ShareRecordingScreen() {
  const { mediaId } = useLocalSearchParams<{ mediaId: string }>();
  const router = useRouter();
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareRecording = useCallback(async (recordingId: string) => {
    setIsSharing(true);
    setError(null);

    try {
      console.log('� DEBUG: Starting share flow for recording ID:', recordingId);
      console.log('🚀 DEBUG: API endpoint will be:', `/recording/${recordingId}/share`);
      console.log('🚀 DEBUG: Payload will be:', { mediaId: recordingId });
      
      const response = await axiosInstance.post(`/recording/${recordingId}/share`, {
        mediaId: recordingId,
      });

      console.log('✅ DEBUG: Recording shared successfully:', response.data);
      console.log('🚀 DEBUG: Will redirect to:', `${Paths.ViewSavedRecording}?tab=shared`);

      // Show success message
      Alert.alert(
        "Recording Shared!",
        "The recording has been shared successfully.",
        [
          {
            text: "View Shared Recordings",
            onPress: () => {
              // Navigate to shared recordings page
              console.log('🚀 DEBUG: User tapped View Shared Recordings, navigating...');
              router.replace(Paths.ViewSavedRecording + '?tab=shared' as any);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('📛 DEBUG: Error sharing recording:', error);
      console.error('📛 DEBUG: Error message:', error.message);
      console.error('📛 DEBUG: Error response:', error.response?.data);
      setError(`Failed to share recording: ${error.response?.data?.message || error.message}`);
      
      Alert.alert(
        "Share Failed",
        `Unable to share the recording. ${error.response?.data?.message || error.message}`,
        [
          {
            text: "Go to Home",
            onPress: () => router.replace(Paths.Home),
          },
          {
            text: "Try Again",
            onPress: () => shareRecording(recordingId),
          },
        ]
      );
    } finally {
      setIsSharing(false);
    }
  }, [router]);

  useEffect(() => {
    console.log('🚀 DEBUG: ShareRecordingScreen mounted');
    console.log('🚀 DEBUG: Received mediaId:', mediaId);
    
    if (mediaId) {
      console.log('🚀 DEBUG: MediaId found, starting share process...');
      shareRecording(mediaId);
    } else {
      console.log('📛 DEBUG: No mediaId provided');
      setError("Invalid recording ID");
    }
  }, [mediaId, shareRecording]);

  return (
    <Box 
      className="flex-1 justify-center items-center px-6"
      style={{ backgroundColor: "#0C0C11" }}
    >
      <VStack space="lg" className="items-center">
        {isSharing ? (
          <>
            <ActivityIndicator size="large" color="#55DB26" />
            <VStack space="sm" className="items-center">
              <Text className="text-white text-xl font-semibold">
                Sharing Recording...
              </Text>
              <Text className="text-gray-400 text-center">
                Please wait while we share the recording with you.
              </Text>
            </VStack>
          </>
        ) : error ? (
          <VStack space="sm" className="items-center">
            <Text className="text-red-400 text-xl font-semibold">
              Share Failed
            </Text>
            <Text className="text-gray-400 text-center">
              {error}
            </Text>
          </VStack>
        ) : (
          <VStack space="sm" className="items-center">
            <Text className="text-green-400 text-xl font-semibold">
              Recording Shared!
            </Text>
            <Text className="text-gray-400 text-center">
              The recording has been shared successfully.
            </Text>
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
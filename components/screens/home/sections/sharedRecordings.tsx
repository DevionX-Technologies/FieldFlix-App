import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Paths } from "@/data/paths";
import { useResponsiveDesign } from "@/hooks/useResponsiveDesign";
import axiosInstance from "@/utils/axiosInstance";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView } from "react-native";
import { Recording } from "../../video-player/type";
import { RecordingCard } from "../components/recordingCard";

export default function SharedRecordingsSection() {
  const router = useRouter();
  const { font } = useResponsiveDesign();
  const scrollViewRef = useRef<ScrollView>(null);

  const [sharedRecordings, setSharedRecordings] = React.useState<Recording[]>([]);
  const [showViewAllButton, setShowViewAllButton] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const MAX_RECENT_RECORDINGS = 15;
  const screenWidth = Dimensions.get("window").width;
  const thumbnailHeight = screenWidth * 0.42;

  useEffect(() => {
    const fetchSharedRecordings = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get<unknown[]>(
          '/recording/shared-recordings',
        );
        const data = Array.isArray(response.data) ? response.data : [];
        setSharedRecordings(data);
      } catch (error: any) {
        console.error('📛 Error fetching shared recordings:', error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedRecordings();
  }, []);

  // Get only first 5 recordings for recent section
  const recentSharedRecordings = sharedRecordings.slice(0, MAX_RECENT_RECORDINGS);
  const hasMoreRecordings = sharedRecordings.length > MAX_RECENT_RECORDINGS;

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isCloseToRight = contentOffset.x + layoutMeasurement.width >= contentSize.width - 80;
    
    if (isCloseToRight && hasMoreRecordings && contentOffset.x > 50) {
      setShowViewAllButton(true);
    } else {
      setShowViewAllButton(false);
    }
  };

  if (isLoading) {
    return (
      <Box className="py-8 items-center">
        <Text style={{ fontSize: font.sm }} className="text-gray-600">
          Loading shared recordings...
        </Text>
      </Box>
    );
  }

  return (
    <VStack space="md">

      {/* Recordings List */}
      {recentSharedRecordings.length === 0 ? (
        // <EmptyState />
        <></>
      ) : (
        <Box style={{ height: thumbnailHeight + 20 }}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {recentSharedRecordings.map((recording, index) => (
              <Box key={recording.id || index} className="mr-4">
                <RecordingCard
                  items={[recording]}
                  cardWidth={screenWidth * 0.75}
                  cardMarginRight={16}
                  imageHeight={thumbnailHeight}
                />
              </Box>
            ))}
            
            {/* View All button that appears when scrolling */}
            {showViewAllButton && (
              <Box 
                className="justify-center items-center ml-4"
                style={{ 
                  width: screenWidth * 0.35,
                  height: thumbnailHeight,
                }}
              >
                <Pressable
                  onPress={() => router.push(`${Paths.ViewSavedRecording}?tab=shared`)}
                  className="items-center justify-center w-full h-full rounded-xl border-2 border-dashed border-app-baseColor"
                  style={{ backgroundColor: 'rgba(85, 219, 38, 0.05)' }}
                >
                  <VStack space="sm" className="items-center">
                    <Text style={{ fontSize: font.custom(32) }}>👀</Text>
                    <Text style={{ fontSize: font.sm }} bold className="text-app-baseColor text-center">
                      View All{'\n'}Shared
                    </Text>
                  </VStack>
                </Pressable>
              </Box>
            )}
          </ScrollView>
        </Box>
      )}
    </VStack>
  );
}
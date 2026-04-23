import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Paths } from "@/data/paths";
import { useResponsiveDesign } from "@/hooks/useResponsiveDesign";
import { useAppDispatch } from "@/store";
import { setRecording } from "@/store/slices/recording";
import axiosInstance from "@/utils/axiosInstance";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { Recording } from "../../video-player/type";
import { RecordingCard } from "../components/recordingCard";

export default function RecentRecordingsSection() {
  const router = useRouter()
  const { font } = useResponsiveDesign();
  const scrollViewRef = useRef<ScrollView>(null);

  const [recordings, setRecordings] = React.useState<Recording[]>([]);
  const [showViewAllButton, setShowViewAllButton] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useAppDispatch();

  const MAX_RECENT_RECORDINGS = 15;
  const screenWidth = Dimensions.get("window").width;
  const thumbnailHeight = screenWidth * 0.42; // Match the recording card height



  // Skeleton loading component
  const SkeletonCard = () => {
    const shimmerAnimation = useSharedValue(0);

    React.useEffect(() => {
      shimmerAnimation.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        false
      );
    }, [shimmerAnimation]);

    const shimmerStyle = useAnimatedStyle(() => ({
      opacity: interpolate(shimmerAnimation.value, [0, 0.5, 1], [0.3, 0.7, 0.3]),
    }));

    return (
      <Animated.View
        style={[
          {
            width: screenWidth - 30,
            height: thumbnailHeight,
            backgroundColor: 'rgba(85, 219, 38, 0.1)',
            borderRadius: 16,
            marginRight: 16,
            borderWidth: 1,
            borderColor: 'rgba(85, 219, 38, 0.2)',
          },
          shimmerStyle
        ]}
      >
        <LinearGradient
          colors={['rgba(85, 219, 38, 0.1)', 'rgba(85, 219, 38, 0.3)', 'rgba(85, 219, 38, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 16,
            justifyContent: 'flex-end',
            padding: 16,
          }}
        >
          {/* Skeleton content */}
          <Box className="space-y-2">
            <Box
              style={{
                width: '60%',
                height: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 8,
              }}
            />
            <Box
              style={{
                width: '40%',
                height: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 6,
              }}
            />
          </Box>
        </LinearGradient>
      </Animated.View>
    );
  };



 useEffect(() => {
    const fetchRecordings = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get<unknown[]>(
          '/recording/my-recordings',
        );
        const data = Array.isArray(response.data) ? response.data : [];

        setRecordings(data); // assuming passed from props/state
        dispatch(setRecording(data)); // send to Redux
      } catch (error: any) {
        console.error('📛 Error fetching recordings:', error.message);
        // 401 is already handled by axiosInstance interceptor
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecordings();
  }, [dispatch]);

  // Get only first 5 recordings for recent section
  const recentRecordings = recordings.slice(0, MAX_RECENT_RECORDINGS);
  const hasMoreRecordings = recordings.length > MAX_RECENT_RECORDINGS;

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isCloseToRight = contentOffset.x + layoutMeasurement.width >= contentSize.width - 80;
    
    if (isCloseToRight && hasMoreRecordings && contentOffset.x > 50) {
      setShowViewAllButton(true);
    } else {
      setShowViewAllButton(false);
    }
  };

  // Empty state component
  const EmptyState = () => (
    <Box className="items-center justify-center py-16 px-6">
      <VStack space="lg" className="items-center">
        <Box 
          className="w-24 h-24 rounded-full items-center justify-center mb-2"
          style={{ backgroundColor: 'rgba(85, 219, 38, 0.1)' }}
        >
          <Text style={{ fontSize: font.custom(40) }}>🎥</Text>
        </Box>
        <VStack space="sm" className="items-center">
          <Text style={{ fontSize: font.xl }} bold className="text-center text-gray-800">
            No Recordings Yet
          </Text>
          <Text style={{ fontSize: font.sm }} className="text-center text-gray-600 max-w-sm leading-relaxed">
            Start recording your games to see them appear here. Your recent recordings will be displayed in this section for quick access.
          </Text>
        </VStack>
        <Pressable 
          onPress={() => router.push(Paths.Home)}
          className="mt-6 bg-app-baseColor px-8 py-4 rounded-full shadow-lg"
          style={{ elevation: 3 }}
        >
          <Text style={{ fontSize: font.md }} bold className="text-white">
            📹 Start Recording
          </Text>
        </Pressable>
      </VStack>
    </Box>
  );

  return (
    <Box>
      {/* Header - Always visible */}
      <Animated.View entering={FadeIn.duration(600)}>
        <Box className="color-app-baseColor flex flex-row justify-between items-center w-full mb-5">
          <Text className="text-app-baseColor" style={{ fontSize: font.lg }} bold>
            Recent Recordings
          </Text>
          {!isLoading && recordings.length > 0 && (
            <Pressable
              onPress={() => router.push(Paths.RecordingPlaybackScreen)}
            >
              <Text style={{ fontSize: font.md }} bold className="cursor-pointer underline">
                View All
              </Text>
            </Pressable>
          )}
        </Box>
      </Animated.View>

      {/* Content Area */}
      {isLoading ? (
        // Skeleton Loading State
        <Box className="relative">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            <SkeletonCard />
            <SkeletonCard />
            <Box style={{ width: 20 }} />
          </ScrollView>
        </Box>
      ) : recordings.length === 0 ? (
        // Empty State
        <EmptyState />
      ) : (
        // Recordings Content
        <Animated.View entering={FadeIn.delay(300).duration(600)}>
          <Box className="relative">
            <ScrollView 
              horizontal 
              ref={scrollViewRef}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: hasMoreRecordings ? 110 : 20 }}
            >
              <RecordingCard items={recentRecordings} />
            </ScrollView>
            
            {/* View All button that appears when scrolled to the end */}
            {showViewAllButton && hasMoreRecordings && (
              <Box 
                className="absolute right-3 top-0 justify-center items-center"
                style={{ 
                  width: 85,
                  height: thumbnailHeight,
                  backgroundColor: 'rgba(0,0,0,0.85)',
                  borderRadius: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(86, 219, 38, 0)'
                }}
              >
                <Pressable
                  onPress={() => router.push(Paths.RecordingPlaybackScreen)}
                  className="items-center justify-center w-full h-full rounded-2xl"
                  style={{
                    backgroundColor: 'transparent',
                  }}
                >
                  <Text style={{ fontSize: font.sm }} bold className="text-white text-center">
                    View All
                  </Text>
                  <Text style={{ fontSize: font.xs }} className="text-app-baseColor text-center font-medium mt-2">
                    +{recordings.length - MAX_RECENT_RECORDINGS} more
                  </Text>
                </Pressable>
              </Box>
            )}
          </Box>
        </Animated.View>
      )}
    </Box>
  );
}

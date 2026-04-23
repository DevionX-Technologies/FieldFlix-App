import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { useResponsiveDesign } from "@/hooks/useResponsiveDesign";
import { useSharedRecordings } from "@/hooks/useSharedRecordings";
import React from "react";
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet } from "react-native";
import Animated, {
  BounceIn,
  Easing,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { RecordingCard } from "../../home/components/recordingCard";



export default function SharedRecordingsTab() {

  const { font } = useResponsiveDesign();
  const screenWidth = Dimensions.get("window").width;
  
  const { sharedRecordings, isLoading, error } = useSharedRecordings();

  const MAX_RECENT_RECORDINGS = 15;

  // Get only first 5 recordings for recent section
  const recentSharedRecordings = sharedRecordings.slice(0, MAX_RECENT_RECORDINGS);


  // Debug logging for rendering
  console.log('📱 SharedRecordingsTab render - Total recordings:', sharedRecordings.length);
  console.log('📱 Recent shared recordings for display:', recentSharedRecordings);
  recentSharedRecordings.forEach((recording: any, index: number) => {
    console.log(`📱 Recording ${index + 1}:`, {
      id: recording.id,
      status: recording.status,
      name: recording.name, // Direct name property
      location: recording.location, // Direct location property
      turf: recording.turf,
      mux_playback_id: recording.mux_playback_id,
      mux_media_url: recording.mux_media_url
    });
  });



  // Enhanced empty state component with animations
  const EmptyState = () => {
    const pulseAnimation = useSharedValue(0);
    const floatingAnimation = useSharedValue(0);

    React.useEffect(() => {
      // Continuous pulse animation for the icon
      pulseAnimation.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );

      // Floating animation for the background circles
      floatingAnimation.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }, [pulseAnimation, floatingAnimation]);

    const pulseStyle = useAnimatedStyle(() => ({
      transform: [
        { 
          scale: interpolate(pulseAnimation.value, [0, 1], [1, 1.1])
        }
      ],
      opacity: interpolate(pulseAnimation.value, [0, 1], [0.8, 1])
    }));

    const floatingStyle = useAnimatedStyle(() => ({
      transform: [
        { 
          translateY: interpolate(floatingAnimation.value, [0, 1], [-10, 10])
        }
      ]
    }));

    return (
      <Box 
        className="items-center justify-center flex-1"
        style={{ 
          minHeight: 400,
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
      >
        {/* Background decorative elements */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 40,
              right: 30,
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(85, 219, 38, 0.05)',
            },
            floatingStyle
          ]}
        />
        
        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: 100,
              left: 20,
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: 'rgba(85, 219, 38, 0.08)',
            },
            floatingStyle
          ]}
        />

        <VStack space="xl" className="items-center w-full max-w-sm">
          {/* Animated icon container */}
          <Animated.View
            entering={BounceIn.delay(200).duration(1000)}
            style={[
              {
                alignItems: 'center',
                justifyContent: 'center',
              }
            ]}
          >
            <Animated.View
              style={[
                {
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: 'rgba(85, 219, 38, 0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: 'rgba(85, 219, 38, 0.2)',
                  shadowColor: '#55DB26',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 8,
                },
                pulseStyle
              ]}
            >
              {/* Share/Connect Icon using Text emoji */}
              <Text style={{ 
                fontSize: 48, 
                lineHeight: 48,
              }}>
                📱
              </Text>
              <Text style={{ 
                fontSize: 24, 
                lineHeight: 24,
                position: 'absolute',
                bottom: 25,
                right: 25,
              }}>
                🤝
              </Text>
            </Animated.View>
          </Animated.View>

          {/* Animated title */}
          <Animated.View 
            entering={FadeInUp.delay(400).duration(600)}
            className="items-center"
          >
            <Text 
              style={{ 
                fontSize: font.custom(24),
                fontWeight: '700',
                color: '#FFFFFF',
                textAlign: 'center',
                marginBottom: 8,
                letterSpacing: 0.5,
              }}
            >
              No Shared Recordings Yet
            </Text>
          </Animated.View>

          {/* Animated description */}
          <Animated.View 
            entering={FadeInDown.delay(600).duration(600)}
            className="items-center"
          >
            <Text 
              style={{ 
                fontSize: font.custom(16),
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center',
                lineHeight: 24,
                maxWidth: 280,
              }}
            >
              Connect with friends and teammates to see their amazing game highlights and shared recordings here.
            </Text>
          </Animated.View>

          {/* Animated action hint */}
          <Animated.View 
            entering={FadeInUp.delay(800).duration(600)}
            className="items-center mt-4"
          >
            <Box
              style={{
                backgroundColor: 'rgba(85, 219, 38, 0.1)',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 25,
                borderWidth: 1,
                borderColor: 'rgba(85, 219, 38, 0.3)',
              }}
            >
              <Text 
                style={{ 
                  fontSize: font.custom(14),
                  color: '#55DB26',
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                🎯 Ask friends to share recordings with you
              </Text>
            </Box>
          </Animated.View>
        </VStack>
      </Box>
    );
  };

  if (isLoading) {
    return (
      <Box className="items-center justify-center py-16" style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#000'
      }}>
        <ActivityIndicator size="large" color="#55DB26" />
        <Text style={{ fontSize: font.sm }} className="text-gray-400 mt-4">
          Loading shared recordings...
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="items-center justify-center py-16">
        <Text style={{ fontSize: font.sm }} className="text-red-400">
          {error}
        </Text>
      </Box>
    );
  }

  if (sharedRecordings.length === 0) {
    return (
      <Box style={styles.container}>
        <EmptyState />
      </Box>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <VStack space="md">
        {recentSharedRecordings.map((recording: any, index: number) => (
          <Box key={recording.id || index} className="mb-4">
            <RecordingCard
              items={[recording]}
              cardWidth={screenWidth * 0.95}
              cardMarginRight={0}
            />
          </Box>
        ))}
      </VStack>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0C0C11",
    padding: 16
  },
  detailsText: {
    color: "#fff",
    fontSize: 16,
    marginVertical: 8,
    alignSelf: "center",
  },
});
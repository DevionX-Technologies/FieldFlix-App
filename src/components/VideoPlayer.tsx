import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useCallback, useRef } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';

/**
 * Props for the high-performance VideoPlayer component
 */
export type VideoPlayerProps = {
  /** video source url or object */
  source: string | { uri: string } | any;
  /** seconds to jump on ± buttons, default 10 */
  skipSeconds?: number;
  /** time updates per second, default 2 (0.5s) */
  timeUpdateHz?: number;
  /** optional: show native controls toggle (default false) */
  nativeControls?: boolean;
  /** optional: onProgress callback (currentSeconds, durationSeconds) */
  onProgress?: (current: number, duration: number) => void;
  /** optional: custom colors for the progress bar */
  colors?: {
    track?: string;
    buffered?: string;
    played?: string;
  };
};

/**
 * High-performance video player with smooth scrubbing progress bar
 * 
 * Performance optimizations:
 * - Uses Reanimated shared values to avoid React re-renders
 * - Throttled timeUpdate events (2-4 Hz)
 * - Transform-based animations (scaleX) instead of width changes
 * - No setState calls during playback
 * - Scrubbing blocks live updates to prevent conflicts
 */
export default function VideoPlayer({
  source,
  skipSeconds = 10,
  timeUpdateHz = 2,
  nativeControls = false,
  onProgress,
  colors = {}
}: VideoPlayerProps): React.ReactElement {
  
  // Shared values for smooth animations without React re-renders
  const duration = useSharedValue(0);          // seconds
  const position = useSharedValue(0);          // seconds
  const buffered = useSharedValue(0);          // seconds
  const isScrubbing = useSharedValue(false);   // prevent update conflicts while dragging
  
  // Track timeline width for pixel ↔ time mapping
  const timelineWidthRef = useRef(1);
  
  // Setup video player with performance optimizations
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    // Throttle time updates to prevent excessive re-renders (2-4 Hz)
    p.timeUpdateEventInterval = 1 / timeUpdateHz;
  });

  // Handle timeline layout for scrubbing calculations
  const onTimelineLayout = useCallback((event: LayoutChangeEvent) => {
    timelineWidthRef.current = Math.max(1, event.nativeEvent.layout.width);
  }, []);

  // Handle video source load event to get duration
  React.useEffect(() => {
    const sourceLoadListener = player.addListener('sourceLoad', (event) => {
      'worklet';
      // Get duration from player directly since event structure varies
      if (player.duration && player.duration > 0) {
        duration.value = player.duration;
      }
      
      // Call onProgress callback on JS thread if provided
      if (onProgress) {
        runOnJS(onProgress)(position.value, duration.value);
      }
    });

    return () => sourceLoadListener?.remove();
  }, [player, duration, position, onProgress]);

  // Handle time updates (throttled by timeUpdateEventInterval)
  React.useEffect(() => {
    const timeUpdateListener = player.addListener('timeUpdate', (event) => {
      'worklet';
      
      // Ignore updates while user is scrubbing to prevent conflicts
      if (isScrubbing.value) return;
      
      const currentTime = event.currentTime ?? 0;
      
      position.value = currentTime;
      
      // Update duration from player if not set
      if (duration.value <= 0 && player.duration && player.duration > 0) {
        duration.value = player.duration;
      }
      
      // Update buffered position (fallback to current position)
      // expo-video doesn't expose buffered duration directly, so we estimate
      buffered.value = Math.max(currentTime, buffered.value);
      
      // Call onProgress callback on JS thread if provided
      if (onProgress) {
        runOnJS(onProgress)(currentTime, duration.value);
      }
    });

    return () => timeUpdateListener?.remove();
  }, [player, duration, position, buffered, isScrubbing, onProgress]);

  // Convert pixel position to time (seconds)
  const pixelToTime = useCallback((pixelX: number): number => {
    'worklet';
    const ratio = Math.min(1, Math.max(0, pixelX / timelineWidthRef.current));
    return ratio * duration.value;
  }, [duration]);

  // Clamp time within valid bounds
  const clampTime = useCallback((time: number): number => {
    'worklet';
    return Math.min(duration.value, Math.max(0, time));
  }, [duration]);

  // Pan gesture for smooth scrubbing
  const panGesture = React.useMemo(() => {
    return Gesture.Pan()
      .onBegin(({ x }) => {
        'worklet';
        // Disable scrubbing if no duration available
        if (duration.value <= 0) return;
        
        isScrubbing.value = true;
        const targetTime = clampTime(pixelToTime(x));
        position.value = targetTime;
      })
      .onUpdate(({ x }) => {
        'worklet';
        if (duration.value <= 0) return;
        
        const targetTime = clampTime(pixelToTime(x));
        position.value = targetTime;
      })
      .onFinalize(async ({ x }) => {
        'worklet';
        if (duration.value <= 0) return;
        
        const targetTime = clampTime(pixelToTime(x));
        
        // Seek to target time on JS thread
        runOnJS(async () => {
          try {
            // expo-video uses currentTime property for seeking
            player.currentTime = targetTime;
          } catch (error) {
            console.warn('Seek error:', error);
          }
        })();
        
        // Smooth animation to final position
        position.value = withTiming(targetTime, { duration: 120 }, () => {
          isScrubbing.value = false;
        });
      });
  }, [duration, position, isScrubbing, pixelToTime, clampTime, player]);

  // Skip forward/backward helpers
  const skipBy = useCallback(async (deltaSeconds: number) => {
    if (duration.value <= 0) return;
    
    const currentPos = position.value;
    const targetTime = Math.min(duration.value, Math.max(0, currentPos + deltaSeconds));
    
    try {
      // expo-video uses currentTime property for seeking
      player.currentTime = targetTime;
      position.value = targetTime;
    } catch (error) {
      console.warn('Skip error:', error);
    }
  }, [duration, position, player]);

  // Animated styles using transform for better performance
  const playedStyle = useAnimatedStyle(() => {
    const progress = duration.value > 0 ? position.value / duration.value : 0;
    const clampedProgress = Math.min(1, Math.max(0, progress));
    
    return {
      transform: [{ scaleX: clampedProgress }],
    };
  });

  const bufferedStyle = useAnimatedStyle(() => {
    const progress = duration.value > 0 ? buffered.value / duration.value : 0;
    const clampedProgress = Math.min(1, Math.max(0, progress));
    
    return {
      transform: [{ scaleX: clampedProgress }],
    };
  });

  // Determine if controls should be enabled
  const controlsEnabled = duration.value > 0;

  // Format time for display (only used in skip buttons, not per-frame)
  const formatSkipTime = (seconds: number): string => {
    return seconds >= 60 ? `${Math.floor(seconds / 60)}m` : `${seconds}s`;
  };

  return (
    <View style={styles.container}>
      {/* Video View */}
      <VideoView
        player={player}
        style={styles.video}
        allowsFullscreen
        allowsPictureInPicture
        nativeControls={nativeControls}
        contentFit="contain"
      />
      
      {/* Custom Controls */}
      {!nativeControls && (
        <View style={styles.controls}>
          {/* Skip Controls */}
          <View style={styles.skipControls}>
            <Pressable
              style={[styles.skipButton, !controlsEnabled && styles.skipButtonDisabled]}
              onPress={() => skipBy(-skipSeconds)}
              disabled={!controlsEnabled}
            >
              <Text style={styles.skipText}>
                ⟲ {formatSkipTime(skipSeconds)}
              </Text>
            </Pressable>
            
            <Pressable
              style={[styles.skipButton, !controlsEnabled && styles.skipButtonDisabled]}
              onPress={() => skipBy(skipSeconds)}
              disabled={!controlsEnabled}
            >
              <Text style={styles.skipText}>
                {formatSkipTime(skipSeconds)} ⟳
              </Text>
            </Pressable>
          </View>

          {/* Progress Timeline */}
          <GestureDetector gesture={panGesture}>
            <View
              style={styles.timeline}
              onLayout={onTimelineLayout}
            >
              {/* Background Track */}
              <View 
                style={[
                  styles.track,
                  { backgroundColor: colors.track || 'rgba(255,255,255,0.25)' }
                ]} 
              />
              
              {/* Buffered Progress */}
              <Animated.View
                style={[
                  styles.bufferedBar,
                  { backgroundColor: colors.buffered || 'rgba(255,255,255,0.45)' },
                  bufferedStyle,
                ]}
              />
              
              {/* Played Progress */}
              <Animated.View
                style={[
                  styles.playedBar,
                  { backgroundColor: colors.played || '#fff' },
                  playedStyle,
                ]}
              />
            </View>
          </GestureDetector>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  controls: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  skipControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  skipButtonDisabled: {
    opacity: 0.4,
  },
  skipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  timeline: {
    height: 22, // Larger touch target
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    left: 0,
    right: 0,
  },
  bufferedBar: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    left: 0,
    width: '100%',
    transformOrigin: 'left',
  },
  playedBar: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    left: 0,
    width: '100%',
    transformOrigin: 'left',
  },
});
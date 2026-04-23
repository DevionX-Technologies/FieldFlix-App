import { Ionicons } from "@expo/vector-icons";
import { VideoView } from "expo-video";
import React, { useCallback, useRef } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { useDownloadAndShare } from "../hooks/useDownloadAndShare";

interface SafeVideoPlayerControlsProps {
  player: any;
  isPlaying: boolean;
  source: string;
  filename: string;
  /** seconds to jump on ± buttons, default 10 */
  skipSeconds?: number;
  /** time updates per second, default 2 */
  timeUpdateHz?: number;
  /** optional: onProgress callback (currentSeconds, durationSeconds) */
  onProgress?: (current: number, duration: number) => void;
  /** optional: custom colors for the progress bar */
  colors?: {
    track?: string;
    buffered?: string;
    played?: string;
  };
}

/**
 * Safe version of VideoPlayerControls without gesture handler
 * Use this if the gesture handler version is causing crashes
 */
export const SafeVideoPlayerControls: React.FC<SafeVideoPlayerControlsProps> = ({
  player,
  isPlaying,
  source,
  filename,
  skipSeconds = 10,
  timeUpdateHz = 2,
  onProgress,
  colors = {},
}) => {
  const { isDownloading } = useDownloadAndShare();

  // Shared values for smooth animations
  const duration = useSharedValue(0);
  const position = useSharedValue(0);
  const buffered = useSharedValue(0);
  
  // Track timeline width for pixel ↔ time mapping
  const timelineWidthRef = useRef(1);
  
  // Setup time update interval for performance
  React.useEffect(() => {
    if (player?.timeUpdateEventInterval !== undefined) {
      player.timeUpdateEventInterval = 1 / timeUpdateHz;
    }
  }, [player, timeUpdateHz]);

  // Handle video events - no worklets
  React.useEffect(() => {
    if (!player) return;

    const sourceLoadListener = player.addListener('sourceLoad', () => {
      if (player.duration && player.duration > 0) {
        duration.value = player.duration;
      }
      
      if (onProgress) {
        onProgress(position.value, duration.value);
      }
    });

    const timeUpdateListener = player.addListener('timeUpdate', (event: any) => {
      const currentTime = event.currentTime ?? 0;
      position.value = currentTime;
      
      if (duration.value <= 0 && player.duration && player.duration > 0) {
        duration.value = player.duration;
      }
      
      buffered.value = Math.max(currentTime, buffered.value);
      
      if (onProgress) {
        onProgress(currentTime, duration.value);
      }
    });

    return () => {
      sourceLoadListener?.remove();
      timeUpdateListener?.remove();
    };
  }, [player, duration, position, buffered, onProgress]);

  // Timeline layout handler
  const onTimelineLayout = useCallback((event: any) => {
    timelineWidthRef.current = Math.max(1, event.nativeEvent.layout.width);
  }, []);

  // Convert pixel to time
  const pixelToTime = useCallback((pixelX: number): number => {
    const ratio = Math.min(1, Math.max(0, pixelX / timelineWidthRef.current));
    return ratio * duration.value;
  }, [duration]);

  // Skip controls
  const skipBy = useCallback((deltaSeconds: number) => {
    if (duration.value <= 0 || !player) return;
    
    const currentPos = position.value;
    const targetTime = Math.min(duration.value, Math.max(0, currentPos + deltaSeconds));
    
    try {
      if (player.currentTime !== undefined) {
        player.currentTime = targetTime;
        position.value = targetTime;
      }
    } catch (error) {
      console.warn('Skip error:', error);
    }
  }, [duration, position, player]);

  // Handle timeline press for seeking
  const handleTimelinePress = useCallback((event: any) => {
    if (duration.value <= 0 || !player) return;
    
    const { locationX } = event.nativeEvent;
    const targetTime = Math.min(duration.value, Math.max(0, pixelToTime(locationX)));
    
    try {
      if (player.currentTime !== undefined) {
        player.currentTime = targetTime;
        position.value = targetTime;
      }
    } catch (error) {
      console.warn('Seek error:', error);
    }
  }, [duration, position, player, pixelToTime]);

  // Animated styles
  const playedStyle = useAnimatedStyle(() => {
    const progress = duration.value > 0 ? position.value / duration.value : 0;
    return {
      transform: [{ scaleX: Math.min(1, Math.max(0, progress)) }],
    };
  });

  const bufferedStyle = useAnimatedStyle(() => {
    const progress = duration.value > 0 ? buffered.value / duration.value : 0;
    return {
      transform: [{ scaleX: Math.min(1, Math.max(0, progress)) }],
    };
  });

  const controlsEnabled = duration.value > 0;

  return (
    <View style={styles.card}>
      <VideoView
        style={styles.video}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />

      {/* Play/Pause Controls */}
      <View style={styles.controlsOverlay}>
        <TouchableOpacity
          onPress={() => {
            if (isPlaying) {
              player.pause();
            } else {
              player.play();
            }
          }}
          style={styles.playButton}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Download Progress */}
        {isDownloading && (
          <View style={styles.downloadIndicator}>
            <Ionicons name="download" size={16} color="#fff" />
          </View>
        )}
      </View>

      {/* Enhanced Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Skip Controls */}
        <View style={styles.skipControls}>
          <Pressable
            style={[styles.skipButton, !controlsEnabled && styles.skipButtonDisabled]}
            onPress={() => skipBy(-skipSeconds)}
            disabled={!controlsEnabled}
          >
            <Text style={styles.skipText}>⟲ {skipSeconds}s</Text>
          </Pressable>
          
          <Pressable
            style={[styles.skipButton, !controlsEnabled && styles.skipButtonDisabled]}
            onPress={() => skipBy(skipSeconds)}
            disabled={!controlsEnabled}
          >
            <Text style={styles.skipText}>{skipSeconds}s ⟳</Text>
          </Pressable>
        </View>

        {/* Safe Progress Timeline with touch-based seeking */}
        <Pressable style={styles.timeline} onLayout={onTimelineLayout} onPress={handleTimelinePress}>
          {/* Background Track */}
          <View 
            style={[
              styles.track,
              { backgroundColor: colors.track || 'rgba(255,255,255,0.3)' }
            ]} 
          />
          
          {/* Buffered Progress */}
          <Animated.View
            style={[
              styles.progressBar,
              { backgroundColor: colors.buffered || 'rgba(255,255,255,0.5)' },
              bufferedStyle,
            ]}
          />
          
          {/* Played Progress */}
          <Animated.View
            style={[
              styles.progressBar,
              { backgroundColor: colors.played || '#FF0000' },
              playedStyle,
            ]}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#1A1A1F",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 16,
  },
  video: {
    width: "100%",
    height: 400,
  },
  controlsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 60, // Leave space for bottom controls
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  playButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 25,
    padding: 10,
  },
  downloadIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 15,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  skipControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  skipButtonDisabled: {
    opacity: 0.4,
  },
  skipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  timeline: {
    height: 20, // Larger touch target
    justifyContent: "center",
  },
  track: {
    position: "absolute",
    height: 4,
    borderRadius: 2,
    left: 0,
    right: 0,
  },
  progressBar: {
    position: "absolute",
    height: 4,
    borderRadius: 2,
    left: 0,
    width: "100%",
    transformOrigin: "left",
  },
});
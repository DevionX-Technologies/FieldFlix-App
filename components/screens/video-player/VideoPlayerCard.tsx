import { useVideoPlayer } from 'expo-video';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PerformantVideoPlayerControls } from './components/PerformantVideoPlayerControls';

interface VideoPlayerCardProps {
  source: string;
  filename: string;
  autoplay?: boolean;
  loop?: boolean;
  /** Optional callback for time progress (currentSeconds, durationSeconds) */
  onProgress?: (current: number, duration: number) => void;
  /** Custom styling options */
  style?: any;
  /** Custom colors for progress bar */
  colors?: {
    track?: string;
    buffered?: string;
    played?: string;
  };
}

/**
 * Complete VideoPlayerCard with high-performance controls
 * 
 * This component provides:
 * - Smooth scrubbing without React re-renders
 * - Optimized time updates to prevent performance issues
 * - Gesture-based seeking with transform animations
 * - Compatible with your existing video player architecture
 * 
 * Usage:
 * ```tsx
 * <VideoPlayerCard 
 *   source="https://your-video-url.mp4"
 *   filename="My Video"
 *   onProgress={(current, duration) => {
 *     console.log(`${current}s / ${duration}s`);
 *   }}
 *   colors={{
 *     played: '#FF6B6B',
 *     buffered: 'rgba(255,255,255,0.5)',
 *     track: 'rgba(255,255,255,0.3)'
 *   }}
 * />
 * ```
 */
export const VideoPlayerCard: React.FC<VideoPlayerCardProps> = ({
  source,
  filename,
  autoplay = false,
  loop = false,
  onProgress,
  style,
  colors,
}) => {
  // Create video player instance
  const player = useVideoPlayer(source, (player) => {
    player.loop = loop;
    
    if (autoplay) {
      player.play();
    }
  });

  // Track play state
  const [isPlaying, setIsPlaying] = React.useState(autoplay);
  
  React.useEffect(() => {
    if (!player) return;

    const playingListener = player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying);
    });

    return () => {
      playingListener?.remove();
    };
  }, [player]);

  return (
    <View style={[styles.container, style]}>
      <PerformantVideoPlayerControls
        player={player}
        isPlaying={isPlaying}
        source={source}
        filename={filename}
        skipSeconds={10}
        timeUpdateHz={2} // 2 updates per second for performance
        onProgress={onProgress}
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
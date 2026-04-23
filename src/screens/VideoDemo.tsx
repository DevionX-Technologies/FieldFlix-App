import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import VideoPlayer from '../components/VideoPlayer';

/**
 * Demo screen showcasing the high-performance VideoPlayer component
 * 
 * This example demonstrates:
 * - Remote HLS/MP4 video playback
 * - Custom skip intervals
 * - Progress callbacks
 * - Performance monitoring-friendly setup
 */
export default function VideoDemo() {
  const handleProgress = React.useCallback((current: number, duration: number) => {
    // Keep this light - called 2-4 times per second
    // Perfect for analytics or UI badges, but avoid heavy operations
    console.log(`Progress: ${current.toFixed(1)}s / ${duration.toFixed(1)}s`);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>High-Performance Video Player Demo</Text>
        <Text style={styles.subtitle}>
          Smooth scrubbing • 60fps animations • No React re-renders during playback
        </Text>
      </View>

      <VideoPlayer
        source={{ uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" }}
        skipSeconds={10}
        timeUpdateHz={2}
        nativeControls={false}
        onProgress={handleProgress}
        colors={{
          track: 'rgba(255,255,255,0.3)',
          buffered: 'rgba(255,255,255,0.5)',
          played: '#FF6B6B'
        }}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🎯 Performance features:
        </Text>
        <Text style={styles.featureText}>
          • Reanimated shared values (no setState per frame){'\n'}
          • Transform-based progress bars (no layout thrashing){'\n'}
          • Throttled time updates (2 Hz by default){'\n'}
          • Gesture-based scrubbing with conflict prevention{'\n'}
          • Optimized for mid-range Android devices
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#0a0a0a',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 20,
  },
});
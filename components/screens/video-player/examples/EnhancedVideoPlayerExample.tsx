import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import VideoPlayer from "../VideoPlayer";
import { RecordingHighlight } from "../type";

/**
 * Example of how to use the enhanced VideoPlayer with performance optimizations
 */
export default function EnhancedVideoPlayerExample() {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  
  // Example video source - replace with your actual video URL
  const videoSource = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  
  // Example recording highlights - using proper RecordingHighlight interface
  const recordingHighlights: RecordingHighlight[] = [
    {
      id: "highlight-1",
      recordingId: "recording-123",
      button_click_timestamp: new Date().toISOString(),
      source_asset_id: "source-asset-1",
      asset_id: "asset-1",
      status: "ready",
      failed_message: null,
      playback_id: "playback-1",
      mux_public_playback_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "highlight-2",
      recordingId: "recording-123",
      button_click_timestamp: new Date().toISOString(),
      source_asset_id: "source-asset-2",
      asset_id: "asset-2",
      status: "ready",
      failed_message: null,
      playback_id: "playback-2",
      mux_public_playback_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  // Progress callback for tracking playback
  const handleProgress = (current: number, dur: number) => {
    setCurrentTime(current);
    setDuration(dur);
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enhanced Video Player with Performance Optimizations</Text>
      
      {/* Progress Display */}
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
        <Text style={styles.featuresText}>
          ✅ No React re-renders during playback{'\n'}
          ✅ 60fps smooth scrubbing{'\n'}
          ✅ Transform-based animations{'\n'}
          ✅ Throttled time updates (2Hz){'\n'}
          ✅ Gesture-based seeking
        </Text>
      </View>

      {/* Enhanced Video Player */}
      <VideoPlayer
        source={videoSource}
        filename="Enhanced Video Demo"
        recordingHighlights={recordingHighlights}
        onProgress={handleProgress}
        performance={{
          skipSeconds: 15, // 15-second skip buttons
          timeUpdateHz: 3, // 3 updates per second (slightly faster)
          colors: {
            track: 'rgba(255,255,255,0.3)',
            buffered: 'rgba(255,255,255,0.5)', 
            played: '#FF6B6B', // Custom red color
          }
        }}
      />

      {/* Performance Notes */}
      <View style={styles.notes}>
        <Text style={styles.notesTitle}>Performance Features:</Text>
        <Text style={styles.notesText}>
          • <Text style={styles.bold}>Zero Re-renders:</Text> Uses react-native-reanimated shared values{'\n'}
          • <Text style={styles.bold}>Smooth Scrubbing:</Text> Gesture-based progress control{'\n'}
          • <Text style={styles.bold}>Optimized Updates:</Text> Configurable timeUpdateHz prevents max depth errors{'\n'}
          • <Text style={styles.bold}>Transform Animations:</Text> Better performance than layout-based progress{'\n'}
          • <Text style={styles.bold}>Worklet Processing:</Text> UI-thread gesture handling for 60fps
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressInfo: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  progressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  featuresText: {
    color: '#4CAF50',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  notes: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  notesTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notesText: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 18,
  },
  bold: {
    fontWeight: 'bold',
    color: '#fff',
  },
});
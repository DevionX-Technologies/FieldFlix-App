import { Ionicons } from "@expo/vector-icons";
import { VideoView } from "expo-video";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface DebugVideoPlayerControlsProps {
  player: any;
  isPlaying: boolean;
  source: string;
  filename: string;
  skipSeconds?: number;
}

/**
 * Debug version to test basic functionality
 */
export const DebugVideoPlayerControls: React.FC<DebugVideoPlayerControlsProps> = ({
  player,
  isPlaying,
  source,
  filename,
  skipSeconds = 10,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [debugInfo, setDebugInfo] = useState('');

  // Track player state changes
  useEffect(() => {
    if (!player) return;

    const sourceLoadListener = player.addListener('sourceLoad', () => {
      const dur = player.duration || 0;
      setDuration(dur);
      setDebugInfo(`Source loaded. Duration: ${dur}s`);
      console.log('Source loaded, duration:', dur);
    });

    const timeUpdateListener = player.addListener('timeUpdate', (event: any) => {
      const currentTime = event.currentTime ?? 0;
      setCurrentTime(currentTime);
      console.log('Time update:', currentTime);
    });

    return () => {
      sourceLoadListener?.remove();
      timeUpdateListener?.remove();
    };
  }, [player]);

  // Simple skip function
  const skipBy = useCallback((deltaSeconds: number) => {
    if (!player) {
      console.log('No player available');
      return;
    }

    const playerDuration = player.duration || 0;
    const playerCurrentTime = player.currentTime || 0;
    
    console.log(`Skip ${deltaSeconds}s - Current: ${playerCurrentTime}, Duration: ${playerDuration}`);
    
    if (playerDuration <= 0) {
      console.log('No duration available');
      return;
    }
    
    const targetTime = Math.min(playerDuration, Math.max(0, playerCurrentTime + deltaSeconds));
    console.log(`Target time: ${targetTime}`);
    
    try {
      player.currentTime = targetTime;
      setCurrentTime(targetTime);
      setDebugInfo(`Skipped to ${targetTime}s`);
    } catch (error) {
      console.error('Skip error:', error);
      setDebugInfo(`Skip error: ${error}`);
    }
  }, [player]);

  // Simple seek function
  const seekToPercent = useCallback((percent: number) => {
    if (!player || duration <= 0) {
      console.log('Cannot seek - no player or duration');
      return;
    }
    
    const targetTime = Math.min(duration, Math.max(0, duration * percent));
    console.log(`Seeking to ${percent * 100}% = ${targetTime}s`);
    
    try {
      player.currentTime = targetTime;
      setCurrentTime(targetTime);
      setDebugInfo(`Seeked to ${targetTime}s`);
    } catch (error) {
      console.error('Seek error:', error);
      setDebugInfo(`Seek error: ${error}`);
    }
  }, [player, duration]);

  return (
    <View style={styles.card}>
      <VideoView
        style={styles.video}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />

      {/* Debug Info */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          Time: {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
        </Text>
        <Text style={styles.debugText}>
          Player: {player ? 'Available' : 'Not Available'}
        </Text>
        <Text style={styles.debugText}>
          {debugInfo}
        </Text>
      </View>

      {/* Simple Controls */}
      <View style={styles.controls}>
        {/* Play/Pause */}
        <TouchableOpacity
          onPress={() => {
            if (isPlaying) {
              player?.pause();
            } else {
              player?.play();
            }
          }}
          style={styles.controlButton}
        >
          <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#fff" />
        </TouchableOpacity>

        {/* Skip Buttons */}
        <Pressable
          style={styles.controlButton}
          onPress={() => {
            console.log('Skip backward pressed');
            skipBy(-skipSeconds);
          }}
        >
          <Text style={styles.buttonText}>-{skipSeconds}s</Text>
        </Pressable>

        <Pressable
          style={styles.controlButton}
          onPress={() => {
            console.log('Skip forward pressed');
            skipBy(skipSeconds);
          }}
        >
          <Text style={styles.buttonText}>+{skipSeconds}s</Text>
        </Pressable>
      </View>

      {/* Simple Progress Bar with Touch */}
      <View style={styles.progressContainer}>
        <Pressable
          style={styles.progressBar}
          onPress={(event) => {
            const { locationX } = event.nativeEvent;
            const percent = locationX / 300; // Assume 300px width
            console.log('Progress bar tapped at', locationX, 'px =', percent * 100, '%');
            seekToPercent(percent);
          }}
        >
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }
              ]}
            />
          </View>
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
    marginTop: 16,
  },
  video: {
    width: "100%",
    height: 200,
  },
  debugInfo: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  debugText: {
    color: "#fff",
    fontSize: 12,
    marginBottom: 2,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  controlButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    padding: 12,
    minWidth: 60,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  progressContainer: {
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  progressBar: {
    height: 30,
    justifyContent: "center",
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: "#FF0000",
    borderRadius: 2,
  },
});
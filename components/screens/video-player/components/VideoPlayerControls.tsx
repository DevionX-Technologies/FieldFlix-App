import { VideoView } from "expo-video";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

interface VideoPlayerControlsProps {
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

export const VideoPlayerControls: React.FC<VideoPlayerControlsProps> = ({
  player,
  isPlaying,
  source,
  filename,
  skipSeconds = 10,
  timeUpdateHz = 2,
  onProgress,
  colors = {},
}) => {
  // Track progress state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  /** HLS: manifest + first segment fetch can take several seconds; show a real overlay, not a black rectangle. */
  const [isVideoReady, setIsVideoReady] = useState(false);
  /** `sourceLoad` is unreliable for some HLS/signed builds — show help instead of an infinite spinner. */
  const [stallHint, setStallHint] = useState<string | null>(null);

  useEffect(() => {
    setIsVideoReady(false);
    setStallHint(null);
  }, [source]);

  useEffect(() => {
    if (!source) return;
    const t = setTimeout(() => {
      setIsVideoReady((ready) => {
        if (ready) return true;
        setStallHint(
          "Playback didn't start in 90s. Check Wi‑Fi, VPN, and that the Mux signed URL is valid (server signing keys). You can go back and open Preview again.",
        );
        return true;
      });
    }, 90_000);
    return () => clearTimeout(t);
  }, [source]);

  // Setup time update interval for performance
  useEffect(() => {
    if (player?.timeUpdateEventInterval !== undefined) {
      player.timeUpdateEventInterval = 1 / timeUpdateHz;
    }
  }, [player, timeUpdateHz]);

  // Listen to video events for progress tracking
  useEffect(() => {
    if (!player) return;

    const sourceLoadListener = player.addListener('sourceLoad', () => {
      const dur = player.duration || 0;
      setDuration(dur);
      setIsVideoReady(true);
    });

    // Also listen for playbackStatusUpdate which might contain duration
    const statusUpdateListener = player.addListener('playbackStatusUpdate', (status: any) => {
      if (status.duration && status.duration > 0) {
        setDuration((d) => (status.duration !== d ? status.duration : d));
        setIsVideoReady(true);
        setStallHint(null);
      }
      if (status.currentTime !== undefined) {
        setCurrentTime(status.currentTime);
      }
    });

    const timeUpdateListener = player.addListener('timeUpdate', (event: any) => {
      const currentTime = event.currentTime ?? 0;
      setCurrentTime(currentTime);
      if (currentTime > 0.02) {
        setIsVideoReady(true);
        setStallHint(null);
      }
      
      // Also try to get duration here in case it wasn't available before
      const playerDuration = player.duration || 0;
      if (playerDuration > 0) {
        setDuration((d) => (playerDuration !== d ? playerDuration : d));
        setIsVideoReady(true);
        setStallHint(null);
      }
      
      if (onProgress) {
        onProgress(currentTime, playerDuration || duration);
      }
    });

    // Try to get initial duration if player is already loaded
    const initialDuration = player.duration || 0;
    if (initialDuration > 0) {
      setDuration(initialDuration);
      setIsVideoReady(true);
    }

    let playingChangeSub: { remove: () => void } | null = null;
    try {
      const sub = (player as { addListener?: (n: string, cb: (e: any) => void) => { remove: () => void } })
        .addListener?.("playingChange", (e: { isPlaying?: boolean }) => {
          if (e?.isPlaying) {
            setIsVideoReady(true);
            setStallHint(null);
          }
        });
      if (sub) playingChangeSub = sub;
    } catch {
      // older expo-video
    }

    return () => {
      sourceLoadListener?.remove();
      statusUpdateListener?.remove();
      timeUpdateListener?.remove();
      playingChangeSub?.remove();
    };
  }, [player, onProgress]);

  // Simple skip controls that work directly with player
  const skipBy = useCallback((deltaSeconds: number) => {
    if (!player) {
      return;
    }

    const playerDuration = player.duration || 0;
    const playerCurrentTime = player.currentTime || 0;

    if (playerDuration <= 0) {
      return;
    }

    const targetTime = Math.min(playerDuration, Math.max(0, playerCurrentTime + deltaSeconds));

    try {
      player.currentTime = targetTime;
    } catch (error) {
      console.error('Skip error:', error);
    }
  }, [player]);

  const controlsEnabled = player && (player.duration || 0) > 0;

  // Format time for display
  const formatTime = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.card}>
      <View style={styles.videoWrap}>
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
          showsTimecodes={false}
          contentFit="contain"
        />
        {!isVideoReady || stallHint ? (
          <View style={styles.bufferingOverlay} pointerEvents="none">
            {!stallHint ? <ActivityIndicator size="large" color="#fff" /> : null}
            <Text style={stallHint ? styles.stallHintText : styles.bufferingText}>
              {stallHint ??
                "Loading stream — HLS often needs 10–30s the first time (manifest + first segment)."}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Progress Bar Below Video */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressTrack,
              { backgroundColor: colors.track || 'rgba(255,255,255,0.3)' }
            ]} 
          />
          <View
            style={[
              styles.progressFill,
              { 
                backgroundColor: colors.played || '#FF0000',
                width: `${progressPercentage}%`
              }
            ]}
          />
        </View>
        
        {/* Time Display with Skip Buttons */}
        <View style={styles.controlsRow}>
          <Pressable
            style={[styles.skipButtonSmall, !controlsEnabled && styles.skipButtonDisabled]}
            onPress={() => {
              skipBy(-skipSeconds);
            }}
            disabled={!controlsEnabled}
          >
            <Text style={styles.skipTextSmall}>-{skipSeconds}s</Text>
          </Pressable>
          
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>
              {duration > 0 ? (
                `${formatTime(currentTime)} / ${formatTime(duration)}`
              ) : (
                `${formatTime(currentTime)} / Loading...`
              )}
            </Text>
          </View>
          
          <Pressable
            style={[styles.skipButtonSmall, !controlsEnabled && styles.skipButtonDisabled]}
            onPress={() => {
              skipBy(skipSeconds);
            }}
            disabled={!controlsEnabled}
          >
            <Text style={styles.skipTextSmall}>+{skipSeconds}s</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 20,
  },
  videoWrap: {
    position: 'relative',
    width: '100%',
    minHeight: 250,
  },
  video: {
    width: '100%',
    height: 250,
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  bufferingText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  stallHintText: {
    color: 'rgba(254, 202, 202, 0.95)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF0000',
    borderRadius: 2,
    minWidth: 2,
    maxWidth: '100%',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  timeDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  timeText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.9,
  },
  skipButtonSmall: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  skipTextSmall: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
  skipButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    opacity: 0.5,
  },
});
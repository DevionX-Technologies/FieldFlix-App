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
    });

    const timeUpdateListener = player.addListener('timeUpdate', (event: any) => {
      const currentTimeEvent = event.currentTime ?? 0;
      if (currentTimeEvent > 0.02) {
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
        onProgress(currentTimeEvent, playerDuration || duration);
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
});
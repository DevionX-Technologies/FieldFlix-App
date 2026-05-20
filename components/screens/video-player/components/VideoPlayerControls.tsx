import { Ionicons } from "@expo/vector-icons";
import { VideoView } from "expo-video";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  safeLockPortraitUp,
  safeUnlockOrientations,
} from "@/utils/safeScreenOrientation";

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
  /** Toolbar under video in fullscreen (e.g. share actions). */
  fullscreenFooter?: React.ReactNode;
  /** Fired when immersive fullscreen modal opens / closes — parent can swap inline chrome. */
  onImmersiveChange?: (open: boolean) => void;
}

export const VideoPlayerControls: React.FC<VideoPlayerControlsProps> = ({
  player,
  source,
  timeUpdateHz = 2,
  onProgress,
  filename,
  fullscreenFooter,
  onImmersiveChange,
}) => {
  const [duration, setDuration] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [stallHint, setStallHint] = useState<string | null>(null);
  const [immersiveOpen, setImmersiveOpen] = useState(false);
  const insets = useSafeAreaInsets();

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

  useEffect(() => {
    if (player?.timeUpdateEventInterval !== undefined) {
      player.timeUpdateEventInterval = 1 / timeUpdateHz;
    }
  }, [player, timeUpdateHz]);

  useEffect(() => {
    if (!player) return;

    const sourceLoadListener = player.addListener("sourceLoad", () => {
      const dur = player.duration || 0;
      setDuration(dur);
      setIsVideoReady(true);
    });

    const statusUpdateListener = player.addListener(
      "playbackStatusUpdate",
      (status: any) => {
        if (status.duration && status.duration > 0) {
          setDuration((d) => (status.duration !== d ? status.duration : d));
          setIsVideoReady(true);
          setStallHint(null);
        }
      },
    );

    const timeUpdateListener = player.addListener(
      "timeUpdate",
      (event: any) => {
        const currentTimeEvent = event.currentTime ?? 0;
        if (currentTimeEvent > 0.02) {
          setIsVideoReady(true);
          setStallHint(null);
        }

        const playerDuration = player.duration || 0;
        if (playerDuration > 0) {
          setDuration((d) => (playerDuration !== d ? playerDuration : d));
          setIsVideoReady(true);
          setStallHint(null);
        }

        if (onProgress) {
          onProgress(currentTimeEvent, playerDuration || duration);
        }
      },
    );

    const initialDuration = player.duration || 0;
    if (initialDuration > 0) {
      setDuration(initialDuration);
      setIsVideoReady(true);
    }

    let playingChangeSub: { remove: () => void } | null = null;
    try {
      const sub = (
        player as {
          addListener?: (
            n: string,
            cb: (e: any) => void,
          ) => { remove: () => void };
        }
      ).addListener?.(
        "playingChange",
        (e: { isPlaying?: boolean }) => {
          if (e?.isPlaying) {
            setIsVideoReady(true);
            setStallHint(null);
          }
        },
      );
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
  }, [player, onProgress, duration]);

  useEffect(() => () => void safeLockPortraitUp(), []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      if (immersiveOpen) StatusBar.setHidden(true, "fade");
      else StatusBar.setHidden(false, "fade");
    }
  }, [immersiveOpen]);

  const openImmersive = async () => {
    await safeUnlockOrientations();
    setImmersiveOpen(true);
    onImmersiveChange?.(true);
  };

  const closeImmersive = async () => {
    setImmersiveOpen(false);
    onImmersiveChange?.(false);
    await safeLockPortraitUp();
  };

  const buffering = !isVideoReady || stallHint;

  return (
    <View style={styles.card}>
      {!immersiveOpen ? (
        <View style={styles.videoWrap}>
          <VideoView
            style={styles.video}
            player={player}
            allowsFullscreen={false}
            allowsPictureInPicture
            showsTimecodes={false}
            contentFit="contain"
          />
          {buffering ? (
            <View style={styles.bufferingOverlay} pointerEvents="none">
              {!stallHint ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : null}
              {stallHint ? (
                <Text style={styles.stallHintText}>{stallHint}</Text>
              ) : null}
            </View>
          ) : null}
          <Pressable
            style={styles.expandBtn}
            onPress={() => void openImmersive()}
            hitSlop={12}
            accessibilityLabel="Fullscreen"
          >
            <Ionicons name="expand" size={22} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <View style={styles.placeholderWhenFs} accessibilityElementsHidden />
      )}

      <Modal
        visible={immersiveOpen}
        animationType="fade"
        transparent={false}
        supportedOrientations={[
          "portrait",
          "landscape-left",
          "landscape-right",
          "portrait-upside-down",
        ]}
        onRequestClose={() => void closeImmersive()}
        presentationStyle={
          Platform.OS === "android" ? "fullScreen" : "fullScreen"
        }
      >
        <View
          style={[
            styles.modalRoot,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <View style={styles.modalTopBar}>
            <Pressable
              onPress={() => void closeImmersive()}
              style={styles.closeFs}
              hitSlop={12}
              accessibilityLabel="Exit fullscreen"
            >
              <Ionicons name="close-circle" size={34} color="#e2e8f0" />
            </Pressable>
            <Text style={styles.fsTitle} numberOfLines={2}>
              {filename}
            </Text>
          </View>
          <View style={styles.modalVideoPane}>
            <VideoView
              style={StyleSheet.absoluteFill}
              player={player}
              allowsFullscreen={false}
              allowsPictureInPicture={Platform.OS === "ios"}
              showsTimecodes={false}
              contentFit="contain"
            />
            {buffering ? (
              <View style={styles.bufferingOverlay} pointerEvents="none">
                {!stallHint ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : null}
                {stallHint ? (
                  <Text style={styles.stallHintText}>{stallHint}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
          {fullscreenFooter ? (
            <View style={[styles.fsFooterWrap, { paddingBottom: insets.bottom + 8 }]}>
              {fullscreenFooter}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#000000",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 20,
  },
  videoWrap: {
    position: "relative",
    width: "100%",
    minHeight: 250,
  },
  video: {
    width: "100%",
    height: 250,
    backgroundColor: "#000",
  },
  placeholderWhenFs: {
    width: "100%",
    height: 250,
    backgroundColor: "#000",
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  stallHintText: {
    color: "rgba(254, 202, 202, 0.95)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  expandBtn: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15,23,42,0.82)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(226,232,240,0.25)",
    zIndex: 20,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "#000",
  },
  modalTopBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(15,23,42,0.98)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  closeFs: {
    paddingVertical: 2,
  },
  fsTitle: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "600",
  },
  modalVideoPane: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  fsFooterWrap: {
    backgroundColor: "rgba(15,23,42,0.98)",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
});

import { useEvent } from "expo";
import { useVideoPlayer } from "expo-video";
import React from "react";
import { RecordingHighlight } from "../type";

export type PreviewCapOptions = {
  /** Whether the user has paid; capping is disabled when true. */
  isPaid: boolean;
  /** Cap in seconds. Defaults to 150 (2:30) per product spec. */
  capSeconds?: number;
  /** Fired the first time the cap is hit while `isPaid` is false. */
  onPaywall?: () => void;
};

/**
 * Custom hook for managing video player state and controls.
 *
 * When `previewCap.isPaid` is `false`, the hook enforces a hard pause once playback
 * crosses the cap (default 2.5 minutes) and invokes `onPaywall()` so the surrounding
 * screen can show its paywall sheet.
 */
export const useVideoPlayerState = (
  initialSource: string,
  previewCap?: PreviewCapOptions,
) => {
  const [currentVideoSource, setCurrentVideoSource] = React.useState(initialSource);
  const [activeHighlightIndex, setActiveHighlightIndex] = React.useState<number | null>(null);
  const [paywallTriggered, setPaywallTriggered] = React.useState(false);

  // Create video player. VOD: no loop (full-match replays are long; looping is confusing).
  const player = useVideoPlayer(currentVideoSource, (p) => {
    p.loop = false;
    p.play();
  });

  // Update player source when currentVideoSource changes
  React.useEffect(() => {
    if (player) {
      player.replace(currentVideoSource);
      player.play();
      setPaywallTriggered(false);
    }
  }, [currentVideoSource, player]);

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  // Enforce preview cap for free users: only for videos *longer* than the cap (default 2:30).
  // If total duration ≤ cap, allow the full clip in preview (no paywall mid-video).
  const isPaid = previewCap?.isPaid ?? true;
  const onPaywall = previewCap?.onPaywall;
  const capSeconds = previewCap?.capSeconds ?? 150;

  React.useEffect(() => {
    if (isPaid || !player) return;
    let cancelled = false;
    const timer = setInterval(() => {
      if (cancelled) return;
      try {
        const current = player.currentTime ?? 0;
        const total = (player as { duration?: number }).duration ?? 0;
        if (total > 0 && total <= capSeconds) {
          return;
        }
        if (current >= capSeconds) {
          try {
            player.pause();
          } catch {
            // ignore — best-effort
          }
          if (!paywallTriggered) {
            setPaywallTriggered(true);
            onPaywall?.();
          }
        }
      } catch {
        // expo-video transient state — ignore
      }
    }, 500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [player, isPaid, capSeconds, onPaywall, paywallTriggered]);

  /**
   * Handles switching to a highlight video
   */
  const handleHighlightPress = (highlight: RecordingHighlight, index: number) => {
    if (highlight.mux_public_playback_url && highlight.status === "ready") {
      setCurrentVideoSource(highlight.mux_public_playback_url);
      setActiveHighlightIndex(index);
    }
  };

  /**
   * Handles switching back to the main video
   */
  const handleMainVideoPress = () => {
    setCurrentVideoSource(initialSource);
    setActiveHighlightIndex(null);
  };

  return {
    player,
    isPlaying,
    currentVideoSource,
    activeHighlightIndex,
    handleHighlightPress,
    handleMainVideoPress,
    paywallTriggered,
  };
};
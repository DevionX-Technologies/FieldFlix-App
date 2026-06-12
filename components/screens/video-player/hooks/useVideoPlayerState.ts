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
  // The initial source is loaded by `useVideoPlayer` itself; we MUST NOT call
  // `player.replace()` again on first mount with the same URL — that resets
  // expo-video mid-load and triggers a "plays then immediately pauses at 00:00"
  // bug where the play() call lands before the buffer is ready.
  const player = useVideoPlayer(currentVideoSource, (p) => {
    p.loop = false;
    p.play();
  });

  /**
   * Tracks whether the *initial* source has already been consumed by
   * `useVideoPlayer`. The follow-up effect uses this ref to skip the
   * redundant replace+play on first mount, which would otherwise re-load
   * the same source mid-flight and cause expo-video to halt at 00:00 with
   * the user unable to start playback. We only call `player.replace()`
   * when the source genuinely changes (e.g. user taps a highlight).
   */
  const initialSourceConsumedRef = React.useRef(false);

  React.useEffect(() => {
    if (!player) return;
    if (!initialSourceConsumedRef.current) {
      // First fire — `useVideoPlayer` has already loaded `currentVideoSource`.
      // Don't replace; just mark that we've now seen the initial source.
      initialSourceConsumedRef.current = true;
      return;
    }
    // Subsequent source change (user opened a highlight, etc.) — swap sources.
    player.replace(currentVideoSource);
    player.play();
    setPaywallTriggered(false);
  }, [currentVideoSource, player]);

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  // Enforce preview cap for free users: only for videos *longer* than the cap (default 2:30).
  // If total duration ≤ cap, allow the full clip in preview (no paywall mid-video).
  const isPaid = previewCap?.isPaid ?? true;
  const onPaywall = previewCap?.onPaywall;
  const capSeconds = previewCap?.capSeconds ?? 150;

  /** After purchase / sync, unlock so the cap watcher can idle and overlays can dismiss cleanly. */
  React.useEffect(() => {
    if (isPaid) setPaywallTriggered(false);
  }, [isPaid]);

  React.useEffect(() => {
    if (isPaid || !player) return;
    let cancelled = false;
    /**
     * Soft-trigger guard. The cap-watch interval used to call `player.pause()`
     * every 500ms while `current >= capSeconds`, which produced two ugly side
     * effects in practice:
     *   1. After a forward seek that landed past the cap, the very next tick
     *      pause-trapped the player; the user could never escape the cap zone.
     *   2. During early buffering, transient `duration === 0` reads combined
     *      with phantom `currentTime` values occasionally tripped the cap at
     *      0:00, halting the player before it had a chance to start.
     * We now (a) require a strictly positive current time, (b) require the
     * cap was actually breached (not just touched at boundary), and (c) call
     * pause + paywall *once* via the `paywallTriggered` flag rather than on
     * every interval tick. That preserves the paywall UX without trapping a
     * paid user whose entitlement hasn't propagated yet.
     */
    const timer = setInterval(() => {
      if (cancelled) return;
      try {
        const current = player.currentTime ?? 0;
        const total = (player as { duration?: number }).duration ?? 0;
        if (total > 0 && total <= capSeconds) {
          return;
        }
        // Ignore the first half-second of buffering — `currentTime` can read
        // as a non-zero garbage value before the player is actually ready.
        if (current <= 0.5) return;
        if (current >= capSeconds && !paywallTriggered) {
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
    const st = String(highlight.status ?? "").toLowerCase();
    const playable =
      highlight.mux_public_playback_url &&
      (st === "ready" || st === "clip_created");
    if (playable) {
      setCurrentVideoSource(highlight.mux_public_playback_url!);
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
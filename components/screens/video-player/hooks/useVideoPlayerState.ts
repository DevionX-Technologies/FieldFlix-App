import { useEvent } from "expo";
import { useVideoPlayer } from "expo-video";
import React from "react";
import { RecordingHighlight } from "../type";

/**
 * Custom hook for managing video player state and controls
 */
export const useVideoPlayerState = (initialSource: string) => {
  const [currentVideoSource, setCurrentVideoSource] = React.useState(initialSource);
  const [activeHighlightIndex, setActiveHighlightIndex] = React.useState<number | null>(null);

  // Create video player
  const player = useVideoPlayer(currentVideoSource, (p) => {
    p.loop = true;
    p.play();
  });

  // Update player source when currentVideoSource changes
  React.useEffect(() => {
    if (player) {
      player.replace(currentVideoSource);
      player.play();
    }
  }, [currentVideoSource, player]);

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

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
  };
};
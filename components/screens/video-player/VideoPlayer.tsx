import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { HighlightList, VideoPlayerControls } from "./components";
import { DebugVideoPlayerControls } from "./components/DebugVideoPlayerControls";
import { SafeVideoPlayerControls } from "./components/SafeVideoPlayerControls";
import { useVideoPlayerState } from "./hooks";
import { RecordingHighlight } from "./type";

interface VideoPlayerProps {
  source: string;
  filename?: string;
  recordingHighlights?: RecordingHighlight[];
  /** Optional performance configuration */
  performance?: {
    /** seconds to jump on ± buttons, default 10 */
    skipSeconds?: number;
    /** time updates per second, default 2 */
    timeUpdateHz?: number;
    /** custom colors for the progress bar */
    colors?: {
      track?: string;
      buffered?: string;
      played?: string;
    };
  };
  /** Optional callback for time progress */
  onProgress?: (current: number, duration: number) => void;
  /** Use safe mode without gesture handler if experiencing crashes */
  safeMode?: boolean;
  /** Use debug mode for testing basic functionality */
  debugMode?: boolean;
}

export default function VideoPlayer({
  source,
  filename = "Full Video",
  recordingHighlights = [],
  performance,
  onProgress,
  safeMode = false,
  debugMode = false,
}: VideoPlayerProps) {
  const {
    player,
    isPlaying,
    currentVideoSource,
    activeHighlightIndex,
    handleHighlightPress,
    handleMainVideoPress,
  } = useVideoPlayerState(source);

  // Choose which controls component to use
  const ControlsComponent = debugMode 
    ? DebugVideoPlayerControls 
    : safeMode 
    ? SafeVideoPlayerControls 
    : VideoPlayerControls;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <ControlsComponent
        player={player}
        isPlaying={isPlaying}
        source={currentVideoSource}
        filename={filename}
        skipSeconds={performance?.skipSeconds}
        timeUpdateHz={performance?.timeUpdateHz}
        colors={performance?.colors}
        onProgress={onProgress}
      />

      <HighlightList
        recordingHighlights={recordingHighlights}
        activeHighlightIndex={activeHighlightIndex}
        onHighlightPress={handleHighlightPress}
        originalVideoSource={source}
        filename={filename}
        onMainVideoPress={handleMainVideoPress}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0C0C11",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});


import VideoPlayer from "@/components/screens/video-player/VideoPlayer";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { RecordingHighlight } from "./type";

// Types
interface VideoPlayerScreenParams {
  source?: string;
  filename?: string;
  recordingHighlights?: string; // JSON stringified array
}

export default function VideoPlayerScreen() {
  const params = useLocalSearchParams() as VideoPlayerScreenParams;
  const { source, filename, recordingHighlights: recordingHighlightsParam } = params;

  // Parse recordingHighlights from JSON string
  let recordingHighlights: RecordingHighlight[] = [];
  if (recordingHighlightsParam) {
    try {
      recordingHighlights = JSON.parse(recordingHighlightsParam);
    } catch (error) {
      console.error("Error parsing recordingHighlights:", error);
    }
  }
  
  // Ensure source is provided and is a string
  if (!source || typeof source !== 'string') {
    console.error("VideoPlayerScreen: Invalid or missing source parameter");
    return null;
  }
  
  return (
    <VideoPlayer 
      source={source} 
      filename={filename} 
      recordingHighlights={recordingHighlights}
      safeMode={false} // Use the cleaned up VideoPlayerControls
      performance={{
        skipSeconds: 10,
        timeUpdateHz: 2,
      }}
    />
  );
}

export { extractMuxStreamId } from "@/utils/muxStreamId";
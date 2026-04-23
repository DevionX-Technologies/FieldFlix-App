
import { RecordingHighlight } from "@/components/screens/video-player/type";
import VideoPlayer from "@/components/screens/video-player/VideoPlayer";
import { useLocalSearchParams } from "expo-router";
import React from "react";

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
    />
  );
}

export function extractMuxStreamId(url: string): string | null {
  try {
    if (!url || typeof url !== 'string') {
      return null;
    }

    const { pathname } = new URL(url);
    // pathname might be "/<id>.m3u8"
    const segments = pathname.split("/");
    const last = segments.pop() || "";
    
    if (!last.toLowerCase().endsWith(".m3u8")) {
      return null;
    }
    
    // Strip the extension
    const streamId = last.slice(0, -".m3u8".length);
    return streamId.length > 0 ? streamId : null;
  } catch (error) {
    console.warn("Failed to extract Mux stream ID from URL:", url, error);
    return null;
  }
}
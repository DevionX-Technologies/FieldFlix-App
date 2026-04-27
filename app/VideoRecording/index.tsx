
import { PaywallSheet } from "@/components/screens/video-player/components/PaywallSheet";
import { RecordingHighlight } from "@/components/screens/video-player/type";
import VideoPlayer from "@/components/screens/video-player/VideoPlayer";
import { useEntitlement } from "@/lib/fieldflix-entitlement";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";

interface VideoPlayerScreenParams {
  source?: string;
  filename?: string;
  recordingHighlights?: string;
  /** When `'1'`, force preview mode regardless of entitlement (used by share-link landings). */
  previewMode?: string;
  /** Originating recording id (highlights / preview flow). */
  recordingId?: string;
}

export default function VideoPlayerScreen() {
  const params = useLocalSearchParams() as VideoPlayerScreenParams;
  const { source, filename, recordingHighlights: recordingHighlightsParam, previewMode, recordingId: rid } =
    params;
  const recordingId =
    typeof rid === "string" ? rid : Array.isArray(rid) ? rid[0] : undefined;
  const { isPaid: rawIsPaid } = useEntitlement();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const forcedPreview = previewMode === '1';
  const isPaid = forcedPreview ? false : rawIsPaid;

  const onPaywall = useCallback(() => {
    setPaywallVisible(true);
  }, []);

  let recordingHighlights: RecordingHighlight[] = [];
  if (recordingHighlightsParam) {
    try {
      recordingHighlights = JSON.parse(recordingHighlightsParam);
    } catch (error) {
      console.error("Error parsing recordingHighlights:", error);
    }
  }

  if (!source || typeof source !== 'string') {
    console.error("VideoPlayerScreen: Invalid or missing source parameter");
    return null;
  }

  return (
    <>
      <VideoPlayer
        source={source}
        filename={filename}
        recordingHighlights={recordingHighlights}
        recordingId={recordingId}
        previewCap={{ isPaid, onPaywall }}
      />
      <PaywallSheet
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
      />
    </>
  );
}

export { extractMuxStreamId } from "@/utils/muxStreamId";

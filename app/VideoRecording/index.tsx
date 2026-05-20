
import { PaywallSheet } from "@/components/screens/video-player/components/PaywallSheet";
import { RecordingHighlight } from "@/components/screens/video-player/type";
import VideoPlayer from "@/components/screens/video-player/VideoPlayer";
import { useEntitlement } from "@/lib/fieldflix-entitlement";
import { mergeServerUnlockedRecordingIds } from "@/lib/unlockedRecordingSync";
import { useFocusEffect } from "@react-navigation/native";
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
  /** When `'1'`, hide the carousel (Saved-clips / single-highlight playback via solo mode). */
  soloHighlight?: string;
  /** When `'1'`, show the Videos / highlights list below the player (Hero from Highlights). Omit for carousel-only Recording. */
  showVideosList?: string;
}

export default function VideoPlayerScreen() {
  const params = useLocalSearchParams() as VideoPlayerScreenParams;
  const {
    source,
    filename,
    recordingHighlights: recordingHighlightsParam,
    previewMode,
    recordingId: rid,
    soloHighlight: soloParam,
    showVideosList: showVideosParam,
  } = params;
  const recordingId =
    typeof rid === "string" ? rid : Array.isArray(rid) ? rid[0] : undefined;
  const { isPaid: rawIsPaid } = useEntitlement();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const forcedPreview = previewMode === '1';
  const isPaid = forcedPreview ? false : rawIsPaid;
  const soloHighlight =
    soloParam === "1" || (Array.isArray(soloParam) && soloParam[0] === "1");

  const showVideosRaw =
    typeof showVideosParam === "string"
      ? showVideosParam
      : Array.isArray(showVideosParam)
        ? showVideosParam[0]
        : undefined;
  const showVideosListBelow = showVideosRaw === "1";

  const [unlockedRecordingIds, setUnlockedRecordingIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      void mergeServerUnlockedRecordingIds().then(setUnlockedRecordingIds);
    }, []),
  );

  const allowShareClips = Boolean(
    recordingId && unlockedRecordingIds.includes(String(recordingId).trim()),
  );

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
        soloHighlight={soloHighlight}
        showVideosListBelow={showVideosListBelow}
        allowShareClips={allowShareClips}
      />
      <PaywallSheet
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
      />
    </>
  );
}

export { extractMuxStreamId } from "@/utils/muxStreamId";

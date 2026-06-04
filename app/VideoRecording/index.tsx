
import { RecordingUnlockSheet } from "@/components/recording/RecordingUnlockSheet";
import { RecordingHighlight } from "@/components/screens/video-player/type";
import VideoPlayer from "@/components/screens/video-player/VideoPlayer";
import { mergeServerUnlockedRecordingIds } from "@/lib/unlockedRecordingSync";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";

interface VideoPlayerScreenParams {
  source?: string;
  filename?: string;
  recordingHighlights?: string;
  /** When `'1'`, opener intended preview UX (Hero without access); effective paywall follows `recordingUnlocked` merge. */
  previewMode?: string;
  /** Originating recording id (highlights / preview flow). */
  recordingId?: string;
  /** When `'1'`, hide the carousel (Saved-clips / single-highlight playback via solo mode). */
  soloHighlight?: string;
  /** When `soloHighlight`, backend highlight id — drives Share highlight below the player. */
  highlightShareId?: string;
  /** When `'1'`, show the Videos / highlights list below the player (Hero from Highlights). Omit for carousel-only Recording. */
  showVideosList?: string;
}

export default function VideoPlayerScreen() {
  const params = useLocalSearchParams() as VideoPlayerScreenParams;
  const {
    source,
    filename,
    recordingHighlights: recordingHighlightsParam,
    recordingId: rid,
    soloHighlight: soloParam,
    showVideosList: showVideosParam,
    highlightShareId: hidParam,
  } = params;
  const recordingId =
    typeof rid === "string" ? rid : Array.isArray(rid) ? rid[0] : undefined;
  const highlightShareIdRaw =
    typeof hidParam === "string"
      ? hidParam
      : Array.isArray(hidParam)
        ? hidParam[0]
        : undefined;
  const highlightShareId =
    typeof highlightShareIdRaw === "string" && highlightShareIdRaw.trim()
      ? highlightShareIdRaw.trim()
      : undefined;
  const [unlockSheetVisible, setUnlockSheetVisible] = useState(false);

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

  /** Per-recording unlock only — sport subscription must not imply full-match access here. */
  const recordingUnlocked = Boolean(
    recordingId &&
      unlockedRecordingIds.includes(String(recordingId).trim()),
  );
  const isPaidPlayback = recordingUnlocked;

  useEffect(() => {
    if (recordingUnlocked) setUnlockSheetVisible(false);
  }, [recordingUnlocked]);

  const onPaywall = useCallback(() => {
    if (!recordingId) return;
    setUnlockSheetVisible(true);
  }, [recordingId]);

  const refreshUnlocked = useCallback(() => {
    void mergeServerUnlockedRecordingIds().then(setUnlockedRecordingIds);
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
        previewCap={{ isPaid: isPaidPlayback, onPaywall }}
        soloHighlight={soloHighlight}
        soloHighlightShareId={
          soloHighlight ? highlightShareId ?? undefined : undefined
        }
        showVideosListBelow={showVideosListBelow}
        allowShareClips={allowShareClips}
      />
      {recordingId ? (
        <RecordingUnlockSheet
          visible={unlockSheetVisible}
          recordingId={String(recordingId)}
          onClose={() => setUnlockSheetVisible(false)}
          onUnlocked={refreshUnlocked}
        />
      ) : null}
    </>
  );
}

export { extractMuxStreamId } from "@/utils/muxStreamId";

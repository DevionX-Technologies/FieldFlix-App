import { BASE_URL } from "@/data/constants";
import { FieldflixScreenHeader } from "@/screens/fieldflix/FieldflixScreenHeader";
import { extractMuxStreamId } from "@/utils/muxStreamId";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HighlightList, VideoPlayerControls } from "./components";
import { DebugVideoPlayerControls } from "./components/DebugVideoPlayerControls";
import { SafeVideoPlayerControls } from "./components/SafeVideoPlayerControls";
import { useVideoPlayerState } from "./hooks";
import { RecordingHighlight } from "./type";

const SHOW_RECORDINGS_LOGS_BUTTON = false;

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
  /**
   * Paywall preview configuration. When `isPaid` is `false`, playback is paused once
   * `capSeconds` (default 150 / 2:30) elapses and `onPaywall` is invoked.
   */
  previewCap?: {
    isPaid: boolean;
    capSeconds?: number;
    onPaywall?: () => void;
  };
  /** Recording id when opened from highlights / preview (for debug logs). */
  recordingId?: string;
}

export default function VideoPlayer({
  source,
  filename = "Full Video",
  recordingHighlights = [],
  performance,
  onProgress,
  safeMode = false,
  debugMode = false,
  previewCap,
  recordingId,
}: VideoPlayerProps) {
  const insets = useSafeAreaInsets();
  const [logOpen, setLogOpen] = useState(false);
  const {
    player,
    isPlaying,
    currentVideoSource,
    activeHighlightIndex,
    handleHighlightPress,
    handleMainVideoPress,
  } = useVideoPlayerState(source, previewCap);

  const logText = useMemo(() => {
    const paid = previewCap?.isPaid ?? true;
    const p = player as { duration?: number; currentTime?: number } | undefined;
    const dur = p?.duration;
    const cur = p?.currentTime;
    const fmtUrl = (label: string, u: string) => {
      const sid = extractMuxStreamId(u);
      let parsed = "";
      try {
        const x = new URL(u);
        parsed = [
          `  host: ${x.host}`,
          `  pathname: ${x.pathname}`,
          x.search ? `  search: ${x.search}` : "  search: (none)",
        ].join("\n");
      } catch {
        parsed = "  (invalid URL for URL parser)";
      }
      return [
        label,
        u,
        `  mux .m3u8 path id: ${sid ?? "(n/a — URL may be unsigned Mux, non-mux, or not …/….m3u8)"
        }`,
        parsed,
      ].join("\n");
    };
    return [
      `Time: ${new Date().toISOString()}`,
      `FieldFlicks — playback / preview debug`,
      "",
      "— App / entitlement —",
      `API BASE_URL: ${BASE_URL}`,
      `filename: ${filename}`,
      `recordingId: ${recordingId ?? "(not in route params)"}`,
      `entitlement: paid / full length (not preview-capped): ${String(paid)}`,
      `expo-video player.duration: ${dur != null && !Number.isNaN(dur) ? String(dur) : "unknown"}`,
      `expo-video player.currentTime: ${cur != null && !Number.isNaN(cur) ? String(cur) : "unknown"}`,
      `initial vs active source same: ${String(source === currentVideoSource)}`,
      activeHighlightIndex != null ? `active highlight index: ${activeHighlightIndex}` : "active: main video",
      "",
      fmtUrl("— Initial source (screen param, hero / full match) —", source),
      "",
      fmtUrl("— Active source (expo-video, changes if you open a highlight) —", currentVideoSource),
      "",
      "If load stalls, compare URLs to Mux dashboard; signed URLs expire. Check 90s timeout message vs signing keys on server.",
    ].join("\n");
  }, [
    source,
    currentVideoSource,
    filename,
    recordingId,
    previewCap?.isPaid,
    player,
    activeHighlightIndex,
  ]);

  const onCopyLog = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(logText);
      Alert.alert("Copied", "Playback debug log copied to the clipboard.");
    } catch {
      Alert.alert("Copy failed", "Could not copy to the clipboard.");
    }
  }, [logText]);

  // Choose which controls component to use
  const ControlsComponent = debugMode
    ? DebugVideoPlayerControls
    : safeMode
      ? SafeVideoPlayerControls
      : VideoPlayerControls;

  return (
    <View style={styles.root}>
      {SHOW_RECORDINGS_LOGS_BUTTON ? (
        <View style={[styles.logsRow, { paddingTop: insets.top + 6 }]}>
          <View style={styles.logsSpacer} />
          <Pressable
            onPress={() => setLogOpen(true)}
            hitSlop={8}
            accessibilityLabel="View playback URL and debug log"
            style={styles.logsBtn}
          >
            <Text style={styles.logsBtnText}>Logs</Text>
          </Pressable>
        </View>
      ) : null}
      <FieldflixScreenHeader
        title="Highlights"
        onBack={() => router.back()}
        backAccessibilityLabel="Back to home"
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
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

      {SHOW_RECORDINGS_LOGS_BUTTON ? (
        <Modal
          visible={logOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setLogOpen(false)}
        >
          <View style={styles.logModalRoot}>
            <Pressable
              style={styles.logModalBackdrop}
              onPress={() => setLogOpen(false)}
              accessibilityLabel="Close log"
            />
            <View style={styles.logPanel}>
              <View style={styles.logPanelHeader}>
                <Text style={styles.logPanelTitle} numberOfLines={2}>
                  Preview / playback debug
                </Text>
                <View style={styles.logPanelActions}>
                  <Pressable
                    onPress={() => void onCopyLog()}
                    hitSlop={10}
                    accessibilityLabel="Copy log"
                  >
                    <Text style={styles.logPanelAction}>Copy</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setLogOpen(false)}
                    hitSlop={10}
                    accessibilityLabel="Close"
                  >
                    <Text style={styles.logPanelAction}>Close</Text>
                  </Pressable>
                </View>
              </View>
              <ScrollView
                style={styles.logScroll}
                contentContainerStyle={styles.logScrollContent}
                nestedScrollEnabled
              >
                <Text selectable style={styles.logBody}>
                  {logText}
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const LOG_GREEN = "#22C55E";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020617",
  },
  logsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  logsSpacer: {
    flex: 1,
  },
  logsBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  logsBtnText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: LOG_GREEN,
  },
  logModalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  logModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  logPanel: {
    maxHeight: "88%",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.35)",
    padding: 12,
  },
  logPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  logPanelTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#f8fafc",
  },
  logPanelActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logPanelAction: {
    fontSize: 15,
    fontWeight: "600",
    color: LOG_GREEN,
  },
  logScroll: {
    maxHeight: 480,
  },
  logScrollContent: {
    paddingBottom: 8,
  },
  logBody: {
    fontFamily: "monospace",
    fontSize: 11,
    lineHeight: 16,
    color: "rgba(255,255,255,0.9)",
  },
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});

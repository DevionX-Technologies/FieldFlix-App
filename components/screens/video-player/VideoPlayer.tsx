import { BASE_URL } from "@/data/constants";
import {
  getFieldflixApiErrorMessage,
  toggleRecordingHighlightLike,
  toggleRecordingHighlightSave,
} from "@/lib/fieldflix-api";
import { FieldflixScreenHeader } from "@/screens/fieldflix/FieldflixScreenHeader";
import { extractMuxStreamId } from "@/utils/muxStreamId";
import { navigateBackOrHome } from "@/utils/navigateBackOrHome";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

  const activeEngageHighlight = useMemo((): RecordingHighlight | null => {
    if (
      activeHighlightIndex == null ||
      activeHighlightIndex < 0 ||
      !recordingHighlights.length
    )
      return null;
    const h = recordingHighlights[activeHighlightIndex];
    const hid = h?.id;
    if (
      !hid ||
      hid === "main-video" ||
      String(hid).startsWith("flick-")
    ) {
      return null;
    }
    return h;
  }, [activeHighlightIndex, recordingHighlights]);

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
        onBack={() => navigateBackOrHome(router)}
        backAccessibilityLabel="Go back"
      />
      <HighlightPlaybackEngageBar highlight={activeEngageHighlight} />
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

function HighlightPlaybackEngageBar({
  highlight,
}: {
  highlight: RecordingHighlight | null;
}) {
  const hid = highlight?.id;
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!highlight || !hid) return;
    setLiked(Boolean(highlight.viewerLiked));
    setSaved(Boolean(highlight.viewerSaved));
    setLikesCount(
      Number(highlight.likesCount ?? highlight.likes_count ?? 0),
    );
  }, [hid, highlight]);

  if (!highlight || !hid) return null;

  const runLike = async () => {
    const token = await SecureStore.getItemAsync("token");
    if (!token?.trim()) {
      Alert.alert("Sign in", "Log in to like highlights.");
      return;
    }
    setBusy(true);
    try {
      const r = await toggleRecordingHighlightLike(String(hid));
      setLiked(r.liked);
      setLikesCount(r.likesCount);
    } catch (e) {
      Alert.alert(
        "Like",
        getFieldflixApiErrorMessage(e, "Could not update like."),
      );
    } finally {
      setBusy(false);
    }
  };

  const runSave = async () => {
    const token = await SecureStore.getItemAsync("token");
    if (!token?.trim()) {
      Alert.alert("Sign in", "Log in to save highlights.");
      return;
    }
    setBusy(true);
    try {
      const r = await toggleRecordingHighlightSave(String(hid));
      setSaved(r.saved);
    } catch (e) {
      Alert.alert(
        "Save",
        getFieldflixApiErrorMessage(e, "Could not update save."),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={engageStyles.strip}>
      <Text style={engageStyles.meta}>{likesCount} likes</Text>
      <View style={engageStyles.actions}>
        <Pressable
          onPress={() => void runLike()}
          disabled={busy}
          style={engageStyles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={liked ? "Unlike" : "Like"}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={24}
            color={liked ? "#f43f5e" : "#e2e8f0"}
          />
        </Pressable>
        <Pressable
          onPress={() => void runSave()}
          disabled={busy}
          style={engageStyles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={saved ? "Unsave" : "Save"}
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={24}
            color={saved ? LOG_GREEN : "#e2e8f0"}
          />
        </Pressable>
      </View>
    </View>
  );
}

const engageStyles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#0f172a",
  },
  meta: {
    fontSize: 13,
    color: "rgba(226,232,240,0.85)",
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});

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

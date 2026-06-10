import { Paths } from "@/data/paths";
import {
  getSavedRecordingHighlights,
  type SavedRecordingHighlightSummary,
} from "@/lib/fieldflix-api";
import { mergeServerUnlockedRecordingIds } from "@/lib/unlockedRecordingSync";
import { FieldflixBottomNav } from "@/screens/fieldflix/BottomNav";
import { FieldflixScreenHeader } from "@/screens/fieldflix/FieldflixScreenHeader";
import { FF } from "@/screens/fieldflix/fonts";
import { WebShell } from "@/screens/fieldflix/WebShell";
import { BG } from "@/screens/fieldflix/bundledBackgrounds";
import { ShareProgressModal } from "@/components/ui/ShareProgressModal";
import { SubmitToFlickShortSheet } from "@/components/screens/video-player/components/SubmitToFlickShortSheet";
import {
  shareHighlightAsMp4File,
  type ShareHighlightProgressUpdate,
} from "@/utils/shareHighlightClip";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";

const ACCENT = "#22C55E";
const BG_COLOR = "#020617";

/**
 * "View All" landing for saved highlights — single-column, rich-card layout
 * matching the figma reference (thumbnail with duration badge, title, like
 * count, Share & Save row). Re-fetches on focus so newly bookmarked clips
 * appear without forcing a manual refresh.
 */
export default function SavedHighlightsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<SavedRecordingHighlightSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockedRecordingIds, setUnlockedRecordingIds] = useState<string[]>([]);
  const [shareProgressVisible, setShareProgressVisible] = useState(false);
  const [shareProgress, setShareProgress] = useState({
    title: 'Preparing highlight',
    message: 'Getting your MP4 ready to share…',
    progress: null as number | null,
  });
  /** Open SubmitToFlickShorts sheet for the highlight id stored here. */
  const [submitFlickHighlightId, setSubmitFlickHighlightId] = useState<
    string | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getSavedRecordingHighlights();
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void mergeServerUnlockedRecordingIds().then(setUnlockedRecordingIds);
      void load();
    }, [load]),
  );

  const onShareHighlight = useCallback(
    async (recordingId: string, highlightId: string) => {
      if (!recordingId || !highlightId) return;
      if (!unlockedRecordingIds.includes(String(recordingId))) {
        Alert.alert(
          'Unlock required',
          'Unlock this recording on its Highlights page to share clips as video files.',
        );
        return;
      }
      setShareProgress({
        title: 'Preparing highlight',
        message: 'Getting your MP4 ready to share…',
        progress: null,
      });
      setShareProgressVisible(true);
      const onProgress = (update: ShareHighlightProgressUpdate) => {
        setShareProgress({
          title:
            update.stage === 'preparing'
              ? 'Preparing highlight'
              : update.stage === 'downloading'
                ? 'Downloading video'
                : 'Almost ready',
          message: update.message,
          progress: update.progress,
        });
      };
      try {
        const result = await shareHighlightAsMp4File(highlightId, onProgress);
        if (!result.ok) {
          Alert.alert('Share', result.message);
        }
      } finally {
        setShareProgressVisible(false);
      }
    },
    [unlockedRecordingIds],
  );

  return (
    <WebShell backgroundColor={BG_COLOR}>
      <View style={styles.flex}>
        <FieldflixScreenHeader title="Saved" />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="bookmark-outline"
              size={42}
              color="rgba(255,255,255,0.35)"
            />
            <Text style={styles.emptyTitle}>No saved highlights yet</Text>
            <Text style={styles.emptyBody}>
              Bookmark highlights you love and they'll show up here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => `${it.recordingId}-${it.highlightId}`}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.gap} />}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: Paths.highlights,
                    params: {
                      id: item.recordingId,
                      autoPlayHighlight: item.highlightId,
                      soloHighlight: '1',
                    },
                  })
                }
                accessibilityRole="button"
              >
                <View style={styles.thumbWrap}>
                  <Image
                    source={
                      (item.thumbnailUrl
                        ? { uri: item.thumbnailUrl }
                        : BG.arena) as ImageSourcePropType
                    }
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                  {/* Like count pill, bottom-left of the thumbnail (mirrors
                   *  the figma "230K" badge). Hidden when there are no likes. */}
                  {Number(item.likesCount ?? 0) > 0 ? (
                    <View style={styles.thumbLikes}>
                      <Ionicons name="heart" size={11} color="#f43f5e" />
                      <Text style={styles.thumbLikesText}>
                        {formatCompact(Number(item.likesCount))}
                      </Text>
                    </View>
                  ) : null}
                  {/* Duration pill, bottom-right. FlickShorts (id prefixed
                   *  `flick-`) are 15s; everything else also defaults to 15s
                   *  here because the saved-summaries endpoint doesn't carry a
                   *  per-clip duration. We bias toward under-promising rather
                   *  than over-promising "30s" on a clip that may be shorter. */}
                  <View style={styles.thumbDur}>
                    <Text style={styles.thumbDurText}>15s</Text>
                  </View>
                  {/* Subtle play overlay so the user knows it's playable. */}
                  <View style={styles.thumbPlay} pointerEvents="none">
                    <Ionicons name="play" size={20} color="#fff" />
                  </View>
                </View>

                <View style={styles.body}>
                  <Text style={styles.title} numberOfLines={2}>
                    Saved Highlight
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.relativeTimestamp
                      ? `at ${item.relativeTimestamp}`
                      : "Tap to watch"}
                  </Text>

                  <View style={styles.actionsRow}>
                    <View style={styles.action}>
                      <Ionicons name="heart" size={14} color="#f43f5e" />
                      <Text style={styles.actionText}>
                        {formatCompact(Number(item.likesCount ?? 0))}
                      </Text>
                    </View>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        void onShareHighlight(item.recordingId, item.highlightId);
                      }}
                      hitSlop={6}
                      style={styles.action}
                      accessibilityRole="button"
                      accessibilityLabel="Share saved highlight"
                    >
                      <Ionicons name="share-outline" size={14} color="#cbd5e1" />
                      <Text style={styles.actionText}>Share</Text>
                    </Pressable>
                    <View style={styles.action}>
                      <Ionicons name="bookmark" size={14} color={ACCENT} />
                      <Text style={[styles.actionText, { color: ACCENT }]}>
                        Saved
                      </Text>
                    </View>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setSubmitFlickHighlightId(String(item.highlightId));
                      }}
                      hitSlop={6}
                      style={styles.action}
                      accessibilityRole="button"
                      accessibilityLabel="Submit highlight to FlickShorts"
                    >
                      <Ionicons name="film-outline" size={14} color="#fde68a" />
                      <Text style={[styles.actionText, { color: '#fde68a' }]}>
                        Submit
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            )}
          />
        )}

        {/* Submit-to-FlickShorts bottom sheet — opened from the gold Submit
            pill on each saved highlight card. */}
        <SubmitToFlickShortSheet
          visible={submitFlickHighlightId !== null}
          highlightId={submitFlickHighlightId}
          onClose={() => setSubmitFlickHighlightId(null)}
        />

        <ShareProgressModal
          visible={shareProgressVisible}
          title={shareProgress.title}
          message={shareProgress.message}
          progress={shareProgress.progress}
        />

        <FieldflixBottomNav active="recordings" />
      </View>
    </WebShell>
  );
}

/** "230" → "230", "12300" → "12.3K", "1530000" → "1.5M". */
function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: FF.bold,
    fontSize: 16,
    color: "#fff",
    marginTop: 6,
  },
  emptyBody: {
    fontFamily: FF.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  list: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 120,
  },
  gap: { height: 14 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  thumbWrap: {
    width: 130,
    aspectRatio: 16 / 11,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    position: "relative",
  },
  thumb: { width: "100%", height: "100%" },
  thumbPlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 28,
    height: 28,
    borderRadius: 14,
    transform: [{ translateX: -14 }, { translateY: -14 }],
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbDur: {
    position: "absolute",
    bottom: 6,
    right: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  thumbDurText: {
    fontFamily: FF.semiBold,
    fontSize: 11,
    color: "#fff",
  },
  thumbLikes: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  thumbLikesText: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    color: "#fff",
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 4,
    justifyContent: "center",
    gap: 6,
  },
  title: {
    fontFamily: FF.bold,
    fontSize: 15,
    color: "#fff",
  },
  meta: {
    fontFamily: FF.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 4,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: "rgba(203,213,225,0.9)",
  },
});

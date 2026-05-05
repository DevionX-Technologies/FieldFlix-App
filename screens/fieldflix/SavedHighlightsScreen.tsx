import { Paths } from "@/data/paths";
import {
  getSavedRecordingHighlights,
  type SavedRecordingHighlightSummary,
} from "@/lib/fieldflix-api";
import { FieldflixBottomNav } from "@/screens/fieldflix/BottomNav";
import { FieldflixScreenHeader } from "@/screens/fieldflix/FieldflixScreenHeader";
import { FF } from "@/screens/fieldflix/fonts";
import { WebShell } from "@/screens/fieldflix/WebShell";
import { BG } from "@/screens/fieldflix/bundledBackgrounds";
import { useFocusEffect } from "@react-navigation/native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
 * "View All" landing for saved highlights — opens from the HighlightsScreen
 * `Saved highlights` carousel header. Re-fetches on focus so newly bookmarked
 * clips appear without forcing a manual refresh.
 */
export default function SavedHighlightsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<SavedRecordingHighlightSummary[]>([]);
  const [loading, setLoading] = useState(true);

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
      void load();
    }, [load]),
  );

  return (
    <WebShell backgroundColor={BG_COLOR}>
      <View style={styles.flex}>
        <FieldflixScreenHeader title="Saved Highlights" />

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
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: Paths.highlights,
                    params: { id: item.recordingId },
                  })
                }
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
                  <View style={styles.thumbDur}>
                    <Text style={styles.thumbDurText}>30s</Text>
                  </View>
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  Highlight
                </Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {item.relativeTimestamp ?? "Saved"}
                </Text>
              </Pressable>
            )}
          />
        )}

        <FieldflixBottomNav active="recordings" />
      </View>
    </WebShell>
  );
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
  list: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 120, gap: 14 },
  row: { gap: 14 },
  card: { flex: 1, gap: 6 },
  thumbWrap: {
    aspectRatio: 16 / 10,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  thumb: { width: "100%", height: "100%" },
  thumbDur: {
    position: "absolute",
    bottom: 6,
    right: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  thumbDurText: {
    fontFamily: FF.semiBold,
    fontSize: 11,
    color: "#fff",
  },
  cardTitle: { fontFamily: FF.semiBold, fontSize: 13, color: "#fff" },
  cardSub: {
    fontFamily: FF.regular,
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
  },
});

import { FlickReelCell } from "@/components/fieldflix/FlickReelCell";
import { Paths } from "@/data/paths";
import {
    commentOnFlickShort,
    getFieldflixApiErrorMessage,
    getPublicFlickShorts,
    likeFlickShort,
    type FlickShortDto,
} from "@/lib/fieldflix-api";
import { FF } from "@/screens/fieldflix/fonts";
import { FieldflixScreenHeader, FIELD_FLIX_HEADER_HEIGHT } from "@/screens/fieldflix/FieldflixScreenHeader";
import { WEB } from "@/screens/fieldflix/webDesign";
import { WebShell } from "@/screens/fieldflix/WebShell";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Pressable,
  ScrollView,
    StyleSheet,
    Text,
    TextInput,
  useWindowDimensions,
    View,
    type ViewToken,
} from "react-native";

const SPORT_TILES_H = 54;

const SPORT_TILES = [
  { id: "all" as const, label: "All", icon: null as number | null },
  {
    id: "pickleball" as const,
    label: "Pickleball",
    icon: require("@/assets/fieldflix-web/pickleball.png"),
  },
  {
    id: "padel" as const,
    label: "Padel",
    icon: require("@/assets/fieldflix-web/padel.png"),
  },
  {
    id: "cricket" as const,
    label: "Cricket",
    icon: require("@/assets/fieldflix-web/coming-soon.png"),
  },
] as const;

type SportId = (typeof SPORT_TILES)[number]["id"];

/**
 * FlickShorts: server-backed approved shorts, filtered by sport tab.
 */
export default function FieldflixFlixShortsScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const [listViewportHeight, setListViewportHeight] = useState(0);
  const reelHeight =
    listViewportHeight > 0
      ? listViewportHeight
      : Math.max(320, windowHeight - FIELD_FLIX_HEADER_HEIGHT - SPORT_TILES_H);
  const [items, setItems] = useState<FlickShortDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState<SportId>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [likingId, setLikingId] = useState<string | null>(null);
  const [commentItem, setCommentItem] = useState<FlickShortDto | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPublicFlickShorts(
        sport === "all" ? undefined : sport,
      );
      setItems(list);
      setActiveIndex(0);
    } catch (e) {
      Alert.alert(
        "FlickShorts",
        getFieldflixApiErrorMessage(e, "Could not load"),
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [sport]);

  useEffect(() => {
    void load();
  }, [load]);

  const onViewable = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index!);
      }
    },
    [],
  );

  const onLike = async (row: FlickShortDto) => {
    if (likingId === row.id) return;
    const wasLiked = !!liked[row.id];
    const nextLiked = !wasLiked;
    const delta = nextLiked ? 1 : -1;

    setLikingId(row.id);
    // Optimistic UX: instantly reflect toggle and count change.
    setLiked((prev) => ({ ...prev, [row.id]: nextLiked }));
    setItems((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, likesCount: Math.max(0, Number(r.likesCount || 0) + delta) }
          : r,
      ),
    );

    try {
      const u = await likeFlickShort(row.id);
      setItems((prev) => prev.map((r) => (r.id === u.id ? u : r)));
      setLiked((prev) => {
        const current = !!prev[row.id];
        if (!u || typeof u.likesCount !== "number") return prev;
        // Infer final liked state from count movement when backend returns toggled row.
        const oldCount = Number(row.likesCount || 0);
        const newCount = Number(u.likesCount || 0);
        if (newCount > oldCount) return { ...prev, [row.id]: true };
        if (newCount < oldCount) return { ...prev, [row.id]: false };
        return { ...prev, [row.id]: current };
      });
    } catch (e) {
      // Rollback optimistic state on failure.
      setLiked((prev) => ({ ...prev, [row.id]: wasLiked }));
      setItems((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, likesCount: Math.max(0, Number(r.likesCount || 0) - delta) }
            : r,
        ),
      );
      Alert.alert("Like", getFieldflixApiErrorMessage(e, "Failed"));
    } finally {
      setLikingId(null);
    }
  };

  const submitComment = async () => {
    if (!commentItem || commentSubmitting) return;
    const t = commentText.trim();
    if (!t) {
      setCommentItem(null);
      return;
    }
    setCommentSubmitting(true);
    try {
      const u = await commentOnFlickShort(commentItem.id, t);
      setItems((prev) => prev.map((r) => (r.id === u.id ? u : r)));
      setCommentText("");
      setCommentItem(null);
    } catch (e) {
      Alert.alert("Comment", getFieldflixApiErrorMessage(e, "Failed"));
    } finally {
      setCommentSubmitting(false);
    }
  };

  return (
    <WebShell backgroundColor="#000000">
      <View style={styles.flex}>
        <FieldflixScreenHeader
          title="FlickShorts"
          onBack={() => router.replace(Paths.home)}
          backAccessibilityLabel="Back to home"
        />
        <View style={styles.sportsStrip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sportsStripContent}
          >
            {SPORT_TILES.map((tile) => (
              <Pressable
                key={tile.id}
                style={[
                  styles.sportTile,
                  sport === tile.id && styles.sportTileOn,
                ]}
                onPress={() => setSport(tile.id)}
              >
                {tile.icon != null ? (
                  <Image
                    source={tile.icon}
                    style={styles.sportIcon}
                    resizeMode="contain"
                  />
                ) : null}
                <Text style={styles.sportTileLabel}>{tile.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View
          style={styles.listViewport}
          onLayout={(e) => {
            const h = Math.floor(e.nativeEvent.layout.height);
            if (h > 0 && h !== listViewportHeight) setListViewportHeight(h);
          }}
        >
          {loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={WEB.greenBright} size="large" />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No FlickShorts in this filter yet.
              </Text>
              <Text style={styles.emptySub}>
                Admins can publish highlights from the admin dashboard. Approve a
                short to show it here for everyone.
              </Text>
            </View>
          ) : (
            <FlatList
              style={styles.list}
              data={items}
              keyExtractor={(it) => it.id}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={reelHeight}
              snapToAlignment="start"
              disableIntervalMomentum
              onViewableItemsChanged={onViewable}
              viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
              initialNumToRender={2}
              maxToRenderPerBatch={3}
              windowSize={5}
              removeClippedSubviews
              getItemLayout={(_, index) => ({
                length: reelHeight,
                offset: reelHeight * index,
                index,
              })}
              renderItem={({ item, index }) => (
                <FlickReelCell
                  item={item}
                  height={reelHeight}
                  isActive={index === activeIndex}
                  liked={!!liked[item.id]}
                  isLiking={likingId === item.id}
                  onLike={() => onLike(item)}
                  onComment={() => setCommentItem(item)}
                />
              )}
            />
          )}
        </View>
      </View>

      <Modal
        visible={commentItem != null}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentItem(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Comments</Text>
            <FlatList
              style={styles.commentList}
              data={commentItem?.comments ?? []}
              keyExtractor={(c) => c.id}
              ListEmptyComponent={
                <Text style={styles.emptySub}>
                  No comments yet. Be the first.
                </Text>
              }
              renderItem={({ item: c }) => (
                <View style={styles.commentRow}>
                  <Text style={styles.commentName}>
                    {c.userName ?? "Player"}
                  </Text>
                  <Text style={styles.commentBody}>{c.text}</Text>
                </View>
              )}
            />
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment…"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={commentText}
              onChangeText={setCommentText}
              editable={!commentSubmitting}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setCommentItem(null)}
                style={styles.modalBtn}
              >
                <Text style={styles.modalBtnTxt}>Close</Text>
              </Pressable>
              <Pressable
                onPress={submitComment}
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  commentSubmitting && styles.modalBtnPrimaryDisabled,
                ]}
                disabled={commentSubmitting}
              >
                <Text style={styles.modalBtnPrimaryTxt}>
                  {commentSubmitting ? "Posting..." : "Post"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { flex: 1 },
  listViewport: { flex: 1 },
  sportsStrip: {
    height: SPORT_TILES_H,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#020617",
  },
  sportsStripContent: {
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
  },
  sportTile: {
    minWidth: 88,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(15,23,42,0.78)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    gap: 6,
  },
  sportTileOn: {
    borderColor: WEB.greenBright,
    backgroundColor: "rgba(34,197,94,0.16)",
  },
  sportIcon: {
    width: 16,
    height: 16,
  },
  sportTileLabel: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontFamily: FF.semiBold,
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: FF.regular,
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#0b1220",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "55%",
  },
  modalTitle: {
    fontFamily: FF.bold,
    color: "#fff",
    fontSize: 18,
    marginBottom: 8,
  },
  commentList: { maxHeight: 180, marginBottom: 8 },
  commentRow: { marginBottom: 10 },
  commentName: {
    fontFamily: FF.semiBold,
    color: WEB.greenBright,
    fontSize: 12,
  },
  commentBody: {
    fontFamily: FF.regular,
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginTop: 2,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: 10,
    color: "#fff",
    fontFamily: FF.regular,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  modalBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  modalBtnTxt: { color: "rgba(255,255,255,0.75)", fontFamily: FF.semiBold },
  modalBtnPrimary: { backgroundColor: WEB.greenBright, borderRadius: 10 },
  modalBtnPrimaryDisabled: { opacity: 0.65 },
  modalBtnPrimaryTxt: {
    color: "#04130d",
    fontFamily: FF.bold,
    paddingHorizontal: 8,
  },
});

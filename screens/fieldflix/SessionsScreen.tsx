import ErrorBoundary from "@/components/organisms/ErrorBoundary/ErrorBoundary";
import { Paths } from "@/data/paths";
import {
  useSessionsMyRecordings,
  type SessionRowForUi,
} from "@/hooks/useSessionsMyRecordings";
import { mergeServerUnlockedRecordingIds } from "@/lib/unlockedRecordingSync";
import { FieldflixBottomNav } from "@/screens/fieldflix/BottomNav";
import { WebShell } from "@/screens/fieldflix/WebShell";
import { FF } from "@/screens/fieldflix/fonts";
import {
  SESSIONS_BACK_ARROW,
  SESSIONS_ROW,
  SESSIONS_SPORT_TEMPLATES,
  type SessionRowLocal,
} from "@/screens/fieldflix/sessionsData";
import { WEB } from "@/screens/fieldflix/webDesign";
import { navigateMainTabBackToHome } from "@/utils/navigateBackOrHome";
import {
  formatRecordingListWhen,
  recordingDurationLabel,
  recordingIsReady,
  recordingSportUi,
  recordingThumbUrl,
} from "@/utils/recordingDisplay";
import { readPreferredHomeSport, writePreferredHomeSport } from "@/utils/homeSportPreference";
import type { HomeSportKey } from "@/utils/turfSports";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function sessionTemplate(keys: HomeSportKey[], sportLabel: string): SessionRowLocal {
  if (keys.length === 1) {
    const k = keys[0];
    if (k === "cricket") return SESSIONS_SPORT_TEMPLATES.cricket;
    if (k === "padel") return SESSIONS_SPORT_TEMPLATES.padel;
    return SESSIONS_ROW[0];
  }
  const s = sportLabel.toLowerCase();
  if (s.includes("cricket")) return SESSIONS_SPORT_TEMPLATES.cricket;
  if (s.includes("padel") || s.includes("paddle")) return SESSIONS_SPORT_TEMPLATES.padel;
  if (s.includes("pickle")) return SESSIONS_ROW[0];
  return SESSIONS_ROW[0];
}

type SessionRowExtended = SessionRowForUi;

function getSportIconName(
  sport: string,
): React.ComponentProps<typeof MaterialCommunityIcons>["name"] {
  const s = sport.toLowerCase();
  if (s.includes("cricket")) return "cricket";
  if (s.includes("padel") || s.includes("paddle")) return "tennis-ball";
  if (s.includes("pickle")) return "racquetball";
  return "trophy";
}

type SessionsSportFilter = HomeSportKey | "all";

function sessionRowMatchesFilter(
  row: Pick<SessionRowExtended, "sportFilterKeys">,
  filter: SessionsSportFilter,
): boolean {
  if (filter === "all") return true;
  if (row.sportFilterKeys.length === 0) return false;
  return row.sportFilterKeys.includes(filter);
}

const FILTER_CHIP_OPTIONS: ReadonlyArray<{
  key: SessionsSportFilter;
  label: string;
}> = [
  { key: "all", label: "All sports" },
  { key: "pickleball", label: "Pickleball" },
  { key: "padel", label: "Padel" },
  { key: "cricket", label: "Cricket" },
];

function mapRecordingToSessionRow(r: any): SessionRowExtended {
  const ui = recordingSportUi(r);
  const sport = ui.sportLabel;
  const sportFilterKeys = ui.sportFilterKeys;
  const t = sessionTemplate(sportFilterKeys, sport);
  const when = formatRecordingListWhen(r?.startTime);
  const cityLine = [r?.turf?.city, r?.turf?.state].filter(Boolean).join(", ");
  const area = cityLine || r?.turf?.address_line || "—";

  return {
    id: String(r.id),
    recordingId: String(r.id),
    sport,
    sportFilterKeys,
    arena: r?.turf?.name ?? "Arena",
    area,
    when,
    sportIcon: t.sportIcon,
    pinIcon: t.pinIcon,
    clockIcon: t.clockIcon,
    playIcon: t.playIcon,
    thumbUrl: recordingThumbUrl(r),
    duration: recordingDurationLabel(r),
    status: String(r?.status ?? "").toLowerCase(),
    isReady: recordingIsReady(r),
  };
}

export default function FieldflixSessionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomNavClearance = Math.max(14, insets.bottom + 6) + 76 + 48;

  const { rows, loading, error, load } = useSessionsMyRecordings(
    mapRecordingToSessionRow,
  );

  const prefHydratedRef = useRef(false);
  const [sportFilter, setSportFilter] = useState<SessionsSportFilter>("all");
  /** Recordings the user has paid to unlock — drives the lock/unlock badge on each card,
   *  mirroring the same source of truth used on RecordingsScreen. */
  const [unlockedRecordingIds, setUnlockedRecordingIds] = useState<string[]>([]);
  const refreshUnlockedIds = useCallback(() => {
    void mergeServerUnlockedRecordingIds().then(setUnlockedRecordingIds);
  }, []);
  useEffect(() => {
    refreshUnlockedIds();
  }, [refreshUnlockedIds]);

  useEffect(() => {
    if (prefHydratedRef.current) return;
    prefHydratedRef.current = true;
    void readPreferredHomeSport().then((p) => {
      if (p) setSportFilter(p);
    });
  }, []);

  const filteredRows = useMemo(
    () => rows.filter((r) => sessionRowMatchesFilter(r, sportFilter)),
    [rows, sportFilter],
  );

  const commitSportFilter = useCallback((next: SessionsSportFilter) => {
    setSportFilter(next);
    if (next !== "all") void writePreferredHomeSport(next);
  }, []);

  const renderSessionItem = useCallback(
    ({ item }: { item: SessionRowExtended }) => (
      <View style={styles.listItemContainer}>
        <View style={styles.listItemCardWrap}>
          <SessionCard
            row={item}
            unlocked={unlockedRecordingIds.includes(String(item.recordingId))}
            onPress={() =>
              router.push({
                pathname: Paths.highlights as never,
                params: { id: item.recordingId },
              })
            }
          />
        </View>
      </View>
    ),
    [router, unlockedRecordingIds],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      refreshUnlockedIds();
    }, [load, refreshUnlockedIds]),
  );

  return (
    <ErrorBoundary>
      <WebShell backgroundColor={WEB.sessionsBg}>
        <View style={{ flex: 1 }}>
          <FlatList
            data={loading || error ? [] : filteredRows}
            keyExtractor={(item) => item.id}
            renderItem={renderSessionItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: bottomNavClearance + 16,
              paddingHorizontal: 15,
            }}
            ItemSeparatorComponent={() => <View style={styles.listGap} />}
            ListHeaderComponent={
              <>
                {/* Header */}
                <View style={styles.header}>
                  <Pressable onPress={() => navigateMainTabBackToHome(router)}>
                    <Image
                      source={SESSIONS_BACK_ARROW}
                      style={styles.backIcon}
                    />
                  </Pressable>
                  <Text style={styles.title}>Sessions</Text>
                </View>

                {/* Section */}
                <Text style={styles.sectionTitle}>Completed Sessions</Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sportFilterRow}
                  style={styles.sportFilterScroll}
                >
                  {FILTER_CHIP_OPTIONS.map((opt) => {
                    const sel = sportFilter === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => commitSportFilter(opt.key)}
                        style={[
                          styles.sportFilterChip,
                          sel ? styles.sportFilterChipSel : styles.sportFilterChipIdle,
                        ]}
                      >
                        <Text
                          style={
                            sel
                              ? styles.sportFilterChipTextSel
                              : styles.sportFilterChipTextIdle
                          }
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {loading ? (
                  <ActivityIndicator color={WEB.green} />
                ) : error ? (
                  <Text style={{ color: "white" }}>{error}</Text>
                ) : null}
              </>
            }
            ListEmptyComponent={
              !loading && !error ? (
                <Text style={{ color: "white", textAlign: "center" }}>
                  {filteredRows.length === 0 &&
                  rows.length > 0 &&
                  sportFilter !== "all"
                    ? "No sessions for this sport. Try “All sports” or pick another sport on Home."
                    : "No completed sessions yet."}
                </Text>
              ) : null
            }
          />

          <FieldflixBottomNav active="sessions" />
        </View>
      </WebShell>
    </ErrorBoundary>
  );
}

/* ================= CARD ================= */

function SessionCard({
  row,
  unlocked,
  onPress,
}: {
  row: SessionRowExtended;
  /** True when the user has paid to unlock this recording. Drives the same lock badge
   *  used on RecordingsScreen so paid/unpaid state is visually consistent across screens. */
  unlocked: boolean;
  onPress: () => void;
}) {
  const isProcessing = !row.isReady;
  const sportIconName = getSportIconName(row.sport);
  const onShare = async () => {
    try {
      await Share.share({
        message: `${row.sport} session at ${row.arena}\n${row.area}\n${row.when}`,
        title: `${row.sport} Session`,
      });
    } catch {
      // non-fatal: keep UI responsive if native share is unavailable
    }
  };

  return (
    <Pressable
      onPress={() => !isProcessing && onPress()}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        isProcessing && styles.cardDisabled,
      ]}
    >
      <View style={styles.content}>
        {/* Top */}
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name={sportIconName}
                size={22}
                color="#22C55E"
              />
            </View>
            <Text style={styles.sport}>{row.sport}</Text>
          </View>

          <View style={styles.topRightCluster}>
            <View
              style={styles.lockBadge}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <MaterialCommunityIcons
                name={unlocked ? "lock-open-outline" : "lock-outline"}
                size={14}
                color="#ffffff"
              />
            </View>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                void onShare();
              }}
              style={({ pressed }) => [
                styles.shareChip,
                pressed && styles.shareChipPressed,
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Share ${row.sport} session`}
            >
              <MaterialCommunityIcons
                name="share-variant-outline"
                size={18}
                color="#cbd5e1"
              />
            </Pressable>
          </View>
        </View>

        {/* Arena */}
        <Text style={styles.arena} numberOfLines={2}>
          {row.arena}
        </Text>

        {/* Bottom */}
        <View style={styles.rowBetween}>
          <View style={styles.metaCol}>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={13}
                color="#cbd5e1"
              />
              <Text style={styles.meta} numberOfLines={1}>
                {row.area}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={13}
                color="#cbd5e1"
              />
              <Text style={styles.meta} numberOfLines={1}>
                {row.when}
              </Text>
            </View>
          </View>

          <View style={[styles.badge, isProcessing && styles.badgeProcessing]}>
            <Text style={styles.badgeText}>
              {isProcessing ? "Processing" : "Completed"}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 22,
    gap: 10,
    paddingHorizontal: 2,
  },
  backIcon: { width: 24, height: 24 },
  title: {
    fontFamily: FF.bold,
    fontSize: 20,
    color: "white",
  },
  sectionTitle: {
    color: "white",
    textAlign: "center",
    borderBottomWidth: 2,
    borderBottomColor: WEB.green,
    paddingBottom: 9,
    marginBottom: 18,
  },

  sportFilterScroll: {
    marginBottom: 20,
    maxHeight: 44,
    flexGrow: 0,
  },
  sportFilterRow: {
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 2,
  },
  sportFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  sportFilterChipIdle: {
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.45)",
    backgroundColor: "rgba(15,23,42,0.6)",
  },
  sportFilterChipSel: {
    borderWidth: 1.6,
    borderColor: "rgba(74,222,128,0.9)",
    backgroundColor: "rgba(22,163,74,0.38)",
  },
  sportFilterChipTextIdle: {
    fontFamily: FF.medium,
    fontSize: 13,
    color: "#cbd5e1",
  },
  sportFilterChipTextSel: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: "#f0fdf4",
  },

  /* Card */
  card: {
    minHeight: 170,
    borderRadius: 13,
    marginBottom: 0,
    overflow: "hidden",
    backgroundColor: "rgba(11,18,27,0.96)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
    shadowOpacity: 0.14,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.66,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "space-between",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(74,222,128,0.2)",
    borderWidth: 1,
    borderColor: "rgba(110,231,183,0.28)",
    justifyContent: "center",
    alignItems: "center",
  },
  icon: { width: 21, height: 21 },

  sport: {
    color: "white",
    fontSize: 17,
    fontFamily: FF.semiBold,
    letterSpacing: -0.15,
  },

  arena: {
    color: "#f8fafc",
    fontSize: 14.5,
    lineHeight: 20,
    fontFamily: FF.medium,
    marginTop: 4,
    marginBottom: 2,
  },

  shareChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.1,
    borderColor: "rgba(148,163,184,0.5)",
    backgroundColor: "rgba(2,6,23,0.45)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
  },
  shareChipPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  /** Same visual treatment as `thumbLockState` on RecordingsScreen — a small dark
   *  circular badge that shows lock-outline (unpaid) or lock-open-outline (paid). */
  topRightCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lockBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.52)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  metaCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  meta: {
    color: "#cbd5e1",
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },

  badge: {
    backgroundColor: "rgba(20,83,45,0.5)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.5)",
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeProcessing: {
    backgroundColor: "rgba(245,158,11,0.22)",
    borderColor: "rgba(251,191,36,0.5)",
    shadowColor: "#f59e0b",
  },
  badgeText: {
    color: "#bbf7d0",
    fontSize: 11,
    fontFamily: FF.semiBold,
    letterSpacing: 0.2,
  },
  listItemCardWrap: {
    width: "100%",
    alignSelf: "stretch",
    borderRadius: 14,
    borderWidth: 1.6,
    borderColor: "rgba(34,197,94,0.9)",
    backgroundColor: "rgba(34,197,94,0.08)",
    padding: 1,
  },
  listItemContainer: {
    width: "100%",
    alignSelf: "stretch",
  },
  listGap: {
    height: 14,
  },
});

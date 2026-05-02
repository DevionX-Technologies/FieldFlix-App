import { Paths } from "@/data/paths";
import { useRecordingReadyToast } from "@/hooks/useRecordingReadyToast";
import { mergeServerUnlockedRecordingIds } from "@/lib/unlockedRecordingSync";
import {
  createShareLink,
  getMyRecordings,
  getSharedByMe,
  getPublicFlickShorts,
  getSharedWithMe,
  getTurfsPage,
  getCameras,
  findAndClaimRecording,
  type Camera,
} from "@/lib/fieldflix-api";
import {
  FIELD_FLIX_BOTTOM_NAV_SPACE,
  FieldflixBottomNav,
} from "@/screens/fieldflix/BottomNav";
import { FieldflixScreenHeader } from "@/screens/fieldflix/FieldflixScreenHeader";
import { WebShell } from "@/screens/fieldflix/WebShell";
import { BG } from "@/screens/fieldflix/bundledBackgrounds";
import { FF } from "@/screens/fieldflix/fonts";
import { RECORDINGS_REC_LOCAL } from "@/screens/fieldflix/recordingsAssets";
import {
  formatRecordingListWhen,
  highlightCountFromRecording,
  recordingDurationLabel,
  recordingIsReady,
  recordingThumbUrl,
} from "@/utils/recordingDisplay";
import { buildHighlightsAppLink } from "@/utils/highlightsAppLink";
import { navigateMainTabBackToHome } from "@/utils/navigateBackOrHome";
import { useFocusEffect } from "@react-navigation/native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import type { ComponentProps, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  InteractionManager,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

const REC_BG = "#020617";
const ACCENT = "#22C55E";
const MUTED = "#94a3b8";

type TabId = "my" | "shared" | "find";
type SharedSubTabId = "withMe" | "to";

/** Long single-line TextInputs on Android pin the viewport at the trailing end — jump selection to start so the beginning is readable. */
function scheduleScrollFilledInputToStart(ref: RefObject<TextInput | null>) {
  const apply = () => {
    ref.current?.setNativeProps?.({ selection: { start: 0, end: 0 } });
  };
  InteractionManager.runAfterInteractions(() => {
    requestAnimationFrame(() => {
      apply();
      if (Platform.OS === "android") {
        setTimeout(apply, 48);
      }
    });
  });
}

function parseClockOnDay(base: Date, clock: string): number | null {
  const t = clock.trim().toLowerCase();
  const m = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  const d = new Date(base);
  d.setHours(h, min, 0, 0);
  return d.getTime();
}

function compactText(v: unknown): string {
  return String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Matches backend camera UUID — never show raw in "court" UI. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidCourtLabel(label: string): boolean {
  const rest = label.replace(/^court\s+/i, "").trim();
  return UUID_RE.test(rest);
}

function recordingGroundLabel(r: any): string {
  const turf = r?.turf;
  const camName = compactText(r?.camera?.name ?? "");
  const fromFields = compactText(
    r?.GroundNumber ??
      turf?.ground_number ??
      r?.GroundDescription ??
      turf?.ground_description ??
      "",
  );
  if (fromFields) {
    if (/^court\b/i.test(fromFields) || /^ground\b/i.test(fromFields)) {
      return fromFields;
    }
    return `Court ${fromFields}`;
  }
  if (camName) {
    const m = camName.match(/(\d+)/);
    if (m) return `Court ${m[1]}`;
    return camName;
  }
  const rawId = compactText(r?.cameraId ?? "");
  if (rawId && !UUID_RE.test(rawId)) {
    if (/^court\b/i.test(rawId) || /^ground\b/i.test(rawId)) return rawId;
    return `Court ${rawId}`;
  }
  return "";
}

function recordingArenaLabel(r: any): string {
  const turf = r?.turf;
  return compactText(turf?.name ?? r?.recording_name ?? r?.name ?? "");
}

export default function FieldflixRecordingsScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const findVenueInputRef = useRef<TextInput>(null);
  const findGroundInputRef = useRef<TextInput>(null);
  const [tab, setTab] = useState<TabId>("my");
  const [sharedSubTab, setSharedSubTab] = useState<SharedSubTabId>("withMe");
  const [my, setMy] = useState<any[]>([]);
  const [shared, setShared] = useState<any[]>([]);
  const [sharedByMe, setSharedByMe] = useState<any[]>([]);
  /** Approved FlickShorts are a separate table from `recordingHighlights` — tally per recording for counts. */
  const [shortsPerRecording, setShortsPerRecording] = useState<
    Record<string, number>
  >({});
  const [unlockedRecordingIds, setUnlockedRecordingIds] = useState<string[]>(
    [],
  );

  const refreshUnlockedIds = useCallback(() => {
    void mergeServerUnlockedRecordingIds().then(setUnlockedRecordingIds);
  }, []);

  useEffect(() => {
    refreshUnlockedIds();
  }, [refreshUnlockedIds]);

  useFocusEffect(
    useCallback(() => {
      refreshUnlockedIds();
    }, [refreshUnlockedIds]),
  );

  useEffect(() => {
    const t = String(params.tab ?? "").toLowerCase();
    if (t === "shared" || t === "find" || t === "my") {
      setTab(t as TabId);
    }
  }, [params.tab]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      const onBack = () => {
        if (tab === "shared" || tab === "find") {
          setTab("my");
          return true;
        }
        navigateMainTabBackToHome(router);
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [router, tab]),
  );

  const recordingUnlockedPlayback = useCallback(
    (recordingId: string) => unlockedRecordingIds.includes(String(recordingId)),
    [unlockedRecordingIds],
  );

  const [findVenue, setFindVenue] = useState("");
  const [findVenueId, setFindVenueId] = useState<string | null>(null);
  const [findGround, setFindGround] = useState("");
  const [findGroundId, setFindGroundId] = useState<string | null>(null);
  const [systemTurfs, setSystemTurfs] = useState<any[]>([]);
  const [systemCameras, setSystemCameras] = useState<Camera[]>([]);
  const [findPickDate, setFindPickDate] = useState(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [showFindDatePicker, setShowFindDatePicker] = useState(false);
  const [findStart, setFindStart] = useState("");
  const [findEnd, setFindEnd] = useState("");
  const [findPhone, setFindPhone] = useState("");
  const [findMatches, setFindMatches] = useState<any[] | null>(null);
  const [showVenueOptions, setShowVenueOptions] = useState(false);
  const [showGroundOptions, setShowGroundOptions] = useState(false);

  const findDateLabel = useMemo(
    () => findPickDate.toDateString(),
    [findPickDate],
  );

  const venueDropdownOptions = useMemo(() => {
    const q = findVenue.trim().toLowerCase();
    return systemTurfs
      .filter((x) => !q || (x.name || "").toLowerCase().includes(q))
      .slice(0, 12);
  }, [findVenue, systemTurfs]);

  useEffect(() => {
    if (findVenueId) {
      getCameras(findVenueId).then(setSystemCameras).catch(() => setSystemCameras([]));
    } else {
      setSystemCameras([]);
    }
  }, [findVenueId]);

  const groundOptions = useMemo(() => {
    const q = findGround.trim().toLowerCase();
    return systemCameras
      .filter((x) => !q || (x.name || "").toLowerCase().includes(q))
      .slice(0, 12);
  }, [findGround, systemCameras]);

  const isLocationComplete = !!findVenueId;
  const isScheduleComplete =
    !!findVenueId &&
    findStart.trim().length > 0 &&
    findEnd.trim().length > 0;
  const isVerifyComplete = findPhone.trim().length === 10;

  const onFindDateChange = (_e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowFindDatePicker(false);
    if (selected) {
      const d = new Date(selected);
      d.setHours(12, 0, 0, 0);
      setFindPickDate(d);
    }
  };

  const findDateFormatted = findPickDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const onShareRecording = useCallback(
    async (recordingId: string, title: string) => {
      try {
        const { shareableLink } = await createShareLink(recordingId);
        await Share.share({
          message: `Watch my game on FieldFlicks: ${shareableLink}`,
          url: shareableLink,
          title,
        });
      } catch {
        // Fallback to in-app deep link when share token generation fails.
        const appLink = buildHighlightsAppLink(recordingId);
        await Share.share({
          message: `Watch my game on FieldFlicks: ${appLink}`,
          title,
        }).catch(() => null);
      }
    },
    [],
  );

  const runFindGame = useCallback(async () => {
    if (!findVenueId || !findStart.trim() || !findEnd.trim() || findPhone.trim().length !== 10) return;
    try {
      const fd = new Date(findPickDate);
      const m = String(fd.getMonth() + 1).padStart(2, "0");
      const d = String(fd.getDate()).padStart(2, "0");
      const payload = {
        turfId: findVenueId,
        cameraId: findGroundId || undefined,
        date: `${fd.getFullYear()}-${m}-${d}`,
        startTime: findStart.trim(),
        endTime: findEnd.trim(),
        phoneLast10: findPhone.trim(),
      };
      const res = await findAndClaimRecording(payload);
      setFindMatches(res);
      // Automatically refresh the library/shared tabs so the claimed recording shows up
      load();
    } catch (e) {
      console.warn("Error finding game", e);
      setFindMatches([]);
    }
    setShowVenueOptions(false);
    setShowGroundOptions(false);
  }, [findVenueId, findGroundId, findPickDate, findStart, findEnd, findPhone, load]);

  const load = useCallback(async () => {
    try {
      const [a, b, c, flickList, turfsRes] = await Promise.all([
        getMyRecordings(),
        getSharedWithMe(),
        getSharedByMe().catch(() => []),
        getPublicFlickShorts(undefined).catch(() => []),
        getTurfsPage(1, 100).catch(() => ({ items: [] })),
      ]);
      setMy(a);
      setShared(b);
      setSharedByMe(c);
      setSystemTurfs(Array.isArray(turfsRes) ? turfsRes : (turfsRes.items || turfsRes.data || []));
      const tally: Record<string, number> = {};
      const mine = Array.isArray(a)
        ? new Set<string>(
            a.map((r: unknown) => String((r as { id?: string })?.id ?? "")),
          )
        : new Set<string>();
      const arr = Array.isArray(flickList) ? flickList : [];
      for (const fs of arr) {
        const rid = String((fs as { recordingId?: string }).recordingId ?? "");
        if (!rid || !mine.has(rid)) continue;
        tally[rid] = (tally[rid] ?? 0) + 1;
      }
      setShortsPerRecording(tally);
    } catch {
      setMy([]);
      setShared([]);
      setSharedByMe([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const myRows =
    my.length > 0
      ? my.map((s: any, i: number) => {
          const hid = String(s?.id ?? "");
          const h =
            highlightCountFromRecording(s) +
            (hid ? (shortsPerRecording[hid] ?? 0) : 0);
          return {
            id: String(s?.id ?? i),
            recordingId: s?.id ? String(s.id) : null,
            title: s?.turf?.name ?? s?.recording_name ?? s?.name ?? "Recording",
            location: s?.turf?.city ?? s?.turf?.location ?? s?.location ?? "",
            when: formatRecordingListWhen(s?.startTime),
            duration: recordingDurationLabel(s),
            thumbUrl: recordingThumbUrl(s),
            highlights: h > 0 ? h : null,
            status: String(s?.status ?? "").toLowerCase(),
            isReady: recordingIsReady(s),
            tags: [] as string[],
            moreTags: 0,
          };
        })
      : [];

  const sharedRows = useMemo(() => {
    if (!Array.isArray(shared) || shared.length === 0) return [];
    const byRec = new Map<string, any[]>();
    for (const s of shared) {
      const rec = s?.recording;
      const rid = String(rec?.id ?? "");
      if (!rid) continue;
      byRec.set(rid, [...(byRec.get(rid) ?? []), s]);
    }
    return [...byRec.values()].map((group, i) => {
      const s = group[0];
      const rec = s?.recording;
      const td = rec?.turf_detail;
      const loc =
        [td?.city, td?.state].filter(Boolean).join(", ") ||
        td?.address_line ||
        "";
      const sharerIds = new Set(
        group.map((x: any) => x?.recording?.userId).filter(Boolean),
      );
      const peopleCount = Math.max(1, sharerIds.size || group.length);
      return {
        id: String(rec?.id ?? i),
        recordingId: rec?.id ? String(rec.id) : null,
        shareToken: s?.share_token ?? rec?.share_token ?? null,
        title: td?.name ?? rec?.owner_name ?? `Recording #${i + 1}`,
        highlights: highlightCountFromRecording(rec),
        location: loc,
        thumbUrl: recordingThumbUrl(rec),
        duration: recordingDurationLabel(rec),
        peopleCount,
      };
    });
  }, [shared]);

  const sharedToRows = useMemo(() => {
    if (!Array.isArray(sharedByMe) || sharedByMe.length === 0) return [];
    const byRec = new Map<string, any[]>();
    for (const s of sharedByMe) {
      const rid = String(s?.recording?.id ?? "");
      if (!rid) continue;
      byRec.set(rid, [...(byRec.get(rid) ?? []), s]);
    }
    return [...byRec.values()].map((group, i) => {
      const s = group[0];
      const rec = s?.recording;
      const td = rec?.turf_detail;
      const loc =
        [td?.city, td?.state].filter(Boolean).join(", ") ||
        td?.address_line ||
        "";
      const recipientIds = new Set(
        group.map((x: any) => String(x?.shared_to_user_id ?? "")).filter(Boolean),
      );
      const peopleCount = Math.max(1, recipientIds.size);
      return {
        id: String(rec?.id ?? i),
        recordingId: rec?.id ? String(rec.id) : null,
        title: td?.name ?? rec?.owner_name ?? `Recording #${i + 1}`,
        highlights: highlightCountFromRecording(rec),
        location: loc,
        thumbUrl: recordingThumbUrl(rec),
        duration: recordingDurationLabel(rec),
        peopleCount,
      };
    });
  }, [sharedByMe]);

  const { state: readyState, dismiss: dismissReady } = useRecordingReadyToast();

  return (
    <WebShell backgroundColor={REC_BG}>
      <View style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
        <FieldflixScreenHeader
          title="Your Recordings"
          onBack={() => {
            if (tab === "shared" || tab === "find") {
              setTab("my");
              return;
            }
            navigateMainTabBackToHome(router);
          }}
          backAccessibilityLabel={
            tab === "my" ? "Back to home" : "Back to my recordings"
          }
        />

        <View style={styles.segOuter}>
          <View style={[styles.segTrack, isCompact && styles.segTrackCompact]}>
            <SegTab
              active={tab === "my"}
              onPress={() => setTab("my")}
              iconName="video-outline"
              label="My Recordings"
              compact={isCompact}
            />
            <SegTab
              active={tab === "shared"}
              onPress={() => setTab("shared")}
              iconName="share-variant-outline"
              label="Shared Recordings"
              compact={isCompact}
            />
            <SegTab
              active={tab === "find"}
              onPress={() => setTab("find")}
              iconName="magnify"
              label="Find Recordings"
              compact={isCompact}
            />
          </View>
        </View>

        {readyState.kind !== "idle" ? (
          <View style={styles.readyToast}>
            <View style={styles.readyToastDot} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.readyToastTitle} numberOfLines={1}>
                {readyState.kind === "ready"
                  ? "Your recording is ready"
                  : readyState.kind === "failed"
                    ? "Recording failed to process"
                    : "Processing your recording…"}
              </Text>
              <Text style={styles.readyToastBody} numberOfLines={2}>
                {readyState.kind === "ready"
                  ? "Open Highlights to watch the preview and unlock the full match."
                  : readyState.kind === "failed"
                    ? "Something went wrong on our side. Please try again."
                    : "Hang tight — we'll let you know the moment it's ready."}
              </Text>
            </View>
            {readyState.kind === "ready" ? (
              <Pressable
                style={styles.readyToastCta}
                onPress={() => {
                  router.push({
                    pathname: Paths.highlights,
                    params: { id: readyState.recordingId },
                  });
                  void dismissReady();
                }}
              >
                <Text style={styles.readyToastCtaText}>Open</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.readyToastClose}
              hitSlop={10}
              onPress={() => void dismissReady()}
              accessibilityLabel="Dismiss"
            >
              <Text style={styles.readyToastCloseText}>×</Text>
            </Pressable>
          </View>
        ) : null}

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.main,
            { paddingBottom: FIELD_FLIX_BOTTOM_NAV_SPACE },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {tab === "my" && (
            <View style={styles.myList}>
              {myRows.length === 0 ? (
                <Text style={styles.emptyList}>
                  No recordings yet. Scan a court QR and start a session to
                  build your library.
                </Text>
              ) : null}
              {myRows.map((row) => (
                <Pressable
                  key={row.id}
                  style={styles.myRow}
                  onPress={() => {
                    if (!row.recordingId) return;
                    router.push({
                      pathname: Paths.highlights,
                      params: { id: row.recordingId },
                    });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${row.title} highlights`}
                >
                  <View style={styles.thumb}>
                    <Image
                      source={row.thumbUrl ? { uri: row.thumbUrl } : BG.arena}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                    <View style={styles.thumbBar} />
                    <View style={styles.thumbDur}>
                      <Text style={styles.thumbDurText}>{row.duration}</Text>
                    </View>
                    <Pressable
                      style={styles.thumbShare}
                      onPress={() => {
                        if (row.recordingId) {
                          void onShareRecording(row.recordingId, row.title);
                        }
                      }}
                      accessibilityLabel="Share recording"
                      hitSlop={8}
                    >
                      <ShareIcon color="#fff" size={14} />
                    </Pressable>
                    <View style={styles.thumbPlayOverlay}>
                      <View style={styles.thumbPlayBtn}>
                        <PlayIcon color="#0a0a0a" size={18} />
                      </View>
                    </View>
                    {row.recordingId ? (
                      <View
                        style={styles.thumbLockState}
                        pointerEvents="none"
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        <MaterialCommunityIcons
                          name={
                            recordingUnlockedPlayback(row.recordingId)
                              ? "lock-open-outline"
                              : "lock-outline"
                          }
                          size={14}
                          color="#ffffff"
                        />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.myBody}>
                    <Text style={styles.myTitle} numberOfLines={2}>
                      {row.title}
                    </Text>
                    <View style={styles.myLine}>
                      <MapPinIcon color={ACCENT} size={14} />
                      <Text style={styles.myLineText} numberOfLines={1}>
                        {row.location}
                      </Text>
                    </View>
                    <View style={styles.myLine}>
                      <CalendarIcon color={ACCENT} size={14} />
                      <Text style={styles.myLineTextMuted} numberOfLines={1}>
                        {row.when}
                      </Text>
                    </View>
                    {row.highlights != null ? (
                      <View style={styles.myLine}>
                        <TrophyIcon color={ACCENT} size={14} />
                        <Text style={styles.myLineAccent}>
                          {row.highlights} Highlights
                        </Text>
                      </View>
                    ) : null}
                    {!row.isReady ? (
                      <View style={styles.myLine}>
                        <Text style={styles.myLineProcessing} numberOfLines={1}>
                          Processing — your highlights will appear here shortly.
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {tab === "shared" && (
            <View style={styles.sharedList}>
              <View style={styles.sharedSubTabs}>
                <Pressable
                  style={[
                    styles.sharedSubTab,
                    sharedSubTab === "to" && styles.sharedSubTabActive,
                  ]}
                  onPress={() => setSharedSubTab("to")}
                >
                  <Text
                    style={[
                      styles.sharedSubTabText,
                      sharedSubTab === "to" && styles.sharedSubTabTextActive,
                    ]}
                  >
                    Shared To
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.sharedSubTab,
                    sharedSubTab === "withMe" && styles.sharedSubTabActive,
                  ]}
                  onPress={() => setSharedSubTab("withMe")}
                >
                  <Text
                    style={[
                      styles.sharedSubTabText,
                      sharedSubTab === "withMe" && styles.sharedSubTabTextActive,
                    ]}
                  >
                    Shared With Me
                  </Text>
                </Pressable>
              </View>

              {sharedSubTab === "withMe" && sharedRows.length === 0 ? (
                <Text style={styles.emptyList}>
                  Nothing shared with you yet. When someone shares a recording,
                  it will show here.
                </Text>
              ) : null}
              {sharedSubTab === "to" && sharedToRows.length === 0 ? (
                <Text style={styles.emptyList}>
                  You have not shared any recordings yet.
                </Text>
              ) : null}
              {(sharedSubTab === "withMe" ? sharedRows : sharedToRows).map(
                (card) => (
                <Pressable
                  key={card.id}
                  style={styles.sharedCard}
                  onPress={() => {
                    if (card.recordingId) {
                      router.push({
                        pathname: Paths.highlights,
                        params: { id: card.recordingId },
                      });
                    } else if (card.shareToken) {
                      router.push({
                        pathname: Paths.sharedMedia,
                        params: { token: card.shareToken },
                      });
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${card.title}`}
                >
                  <Image
                    source={card.thumbUrl ? { uri: card.thumbUrl } : BG.arena}
                    style={styles.sharedMedia}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={[
                      "rgba(0,0,0,0.15)",
                      "rgba(0,0,0,0.45)",
                      "rgba(0,0,0,0.94)",
                    ]}
                    locations={[0, 0.55, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.sharedOverlay}>
                    <View style={styles.sharedTop}>
                      <View style={styles.sharedReady}>
                        <Text style={styles.sharedReadyText}>Ready</Text>
                      </View>
                      <View style={styles.sharedDur}>
                        <ClockIcon color="rgba(255,255,255,0.92)" size={14} />
                        <Text style={styles.sharedDurText}>
                          {card.duration}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.sharedMid}>
                      <Text style={styles.sharedTitle} numberOfLines={1}>
                        {card.title}
                      </Text>
                      <Text style={styles.sharedMeta} numberOfLines={2}>
                        {card.location || "No location available"}
                      </Text>
                    </View>
                    <View style={styles.sharedActions}>
                      <View style={styles.sharedPills}>
                        <View style={styles.sharedPill}>
                          <TrophyIcon color={ACCENT} size={16} />
                          <Text style={styles.sharedPillText}>
                            {card.highlights} Highlights
                          </Text>
                        </View>
                        <View style={styles.sharedPill}>
                          <Text style={styles.sharedPillText} numberOfLines={1}>
                            {card.peopleCount}{" "}
                            {card.peopleCount === 1 ? "person" : "people"}
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        style={styles.sharedFab}
                        accessibilityLabel="Share"
                        onPress={() => {
                          if (card.recordingId) {
                            void onShareRecording(card.recordingId, card.title);
                          }
                        }}
                        hitSlop={8}
                      >
                        <ShareIcon color="#0a0a0a" size={18} />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              ),
              )}
            </View>
          )}

          {tab === "find" && (
            <View style={styles.findWrap}>
              <View style={styles.findHeroOuter}>
                <Image
                  source={RECORDINGS_REC_LOCAL.hero}
                  style={styles.findHeroImg}
                  resizeMode="cover"
                />
                <View
                  style={[
                    styles.findHeroInner,
                    isCompact && styles.findHeroInnerCompact,
                  ]}
                >
                  <View style={styles.findBadge}>
                    <Image
                      source={RECORDINGS_REC_LOCAL.gameFinderIcon}
                      style={{ width: 16, height: 16 }}
                      resizeMode="contain"
                    />
                    <Text style={styles.findBadgeText}>GAME FINDER</Text>
                  </View>
                  <Text style={styles.findHeadline}>
                    Missed your <Text style={styles.findEm}>game?</Text>
                  </Text>
                  <Text style={styles.findSub}>
                    Enter your match details and find your recording instantly.
                  </Text>
                </View>
                <View style={styles.findPlayRing}>
                  <View style={styles.findPlayCore}>
                    <PlayIcon color={ACCENT} size={22} />
                  </View>
                </View>
              </View>

              <View style={styles.findSteps}>
                <View
                  style={[
                    styles.findStep,
                    !isLocationComplete && styles.findStepMuted,
                  ]}
                >
                  <View
                    style={[
                      styles.findStepDot,
                      !isLocationComplete && styles.findStepDotMuted,
                    ]}
                  />
                  <Text
                    style={[
                      styles.findStepText,
                      !isLocationComplete && styles.findStepTextMuted,
                    ]}
                  >
                    Location
                  </Text>
                </View>
                <View
                  style={[
                    styles.findStep,
                    !isScheduleComplete && styles.findStepMuted,
                  ]}
                >
                  <View
                    style={[
                      styles.findStepDot,
                      !isScheduleComplete && styles.findStepDotMuted,
                    ]}
                  />
                  <Text
                    style={[
                      styles.findStepText,
                      !isScheduleComplete && styles.findStepTextMuted,
                    ]}
                  >
                    Schedule
                  </Text>
                </View>
                <View
                  style={[
                    styles.findStep,
                    !isVerifyComplete && styles.findStepMuted,
                  ]}
                >
                  <View
                    style={[
                      styles.findStepDot,
                      !isVerifyComplete && styles.findStepDotMuted,
                    ]}
                  />
                  <Text
                    style={[
                      styles.findStepText,
                      !isVerifyComplete && styles.findStepTextMuted,
                    ]}
                  >
                    Verify
                  </Text>
                </View>
              </View>

              <View style={styles.findPanel}>
                <View style={styles.findLabelRow}>
                  <MapPinIcon color={MUTED} size={14} />
                  <Text style={styles.findLabel}>VENUES</Text>
                </View>

                <TextInput
                  ref={findVenueInputRef}
                  value={findVenue}
                  onFocus={() => setShowVenueOptions(true)}
                  onBlur={() => scheduleScrollFilledInputToStart(findVenueInputRef)}
                  onChangeText={(v) => {
                    setFindVenue(v);
                    setFindVenueId(null);
                    setShowVenueOptions(true);
                    setFindGround("");
                  }}
                  style={styles.findInput}
                  placeholder="Select venue"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
                {showVenueOptions && venueDropdownOptions.length > 0 ? (
                  <View style={styles.findDropdown}>
                    {venueDropdownOptions.map((opt) => (
                      <Pressable
                        key={`venue-${opt.id}`}
                        style={styles.findDropdownItem}
                        onPress={() => {
                          setFindVenue(opt.name);
                          setFindVenueId(opt.id);
                          setFindGround("");
                          setShowVenueOptions(false);
                          scheduleScrollFilledInputToStart(findVenueInputRef);
                        }}
                      >
                        <Text style={styles.findDropdownItemText}>{opt.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>

              <View style={styles.findPanel}>
                <View style={styles.findLabelRow}>
                  <CalendarIcon color={MUTED} size={14} />
                  <Text style={styles.findLabel}>DATE</Text>
                </View>
                <Pressable
                  onPress={() => setShowFindDatePicker(true)}
                  style={styles.findInputPressable}
                  accessibilityRole="button"
                  accessibilityLabel="Choose date"
                >
                  <Text style={styles.findInputPressableText}>
                    {findDateFormatted}
                  </Text>
                </Pressable>
                {showFindDatePicker && Platform.OS === "android" ? (
                  <DateTimePicker
                    value={findPickDate}
                    mode="date"
                    display="default"
                    themeVariant="dark"
                    maximumDate={new Date()}
                    onChange={onFindDateChange}
                  />
                ) : null}
              </View>

              <Modal
                visible={showFindDatePicker && Platform.OS === "ios"}
                transparent
                animationType="slide"
                onRequestClose={() => setShowFindDatePicker(false)}
              >
                <View style={styles.findDateModalRoot}>
                  <Pressable
                    style={styles.findDateModalTouchOut}
                    onPress={() => setShowFindDatePicker(false)}
                  />
                  <View style={styles.findDateModalSheet}>
                    <View style={styles.findDateModalHeader}>
                      <Pressable
                        onPress={() => setShowFindDatePicker(false)}
                        hitSlop={12}
                      >
                        <Text style={styles.findDateModalDone}>Done</Text>
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={findPickDate}
                      mode="date"
                      display="spinner"
                      themeVariant="dark"
                      maximumDate={new Date()}
                      onChange={onFindDateChange}
                    />
                  </View>
                </View>
              </Modal>

              <View style={styles.findPanel}>
                <View style={styles.findLabelRow}>
                  <View style={styles.findSmallIcon}>
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                      <Circle cx={12} cy={12} r={9} stroke={MUTED} strokeWidth={2} />
                    </Svg>
                  </View>
                  <Text style={styles.findLabel}>GROUND / COURT NO.</Text>
                </View>
                <TextInput
                  ref={findGroundInputRef}
                  value={findGround}
                  onFocus={() => setShowGroundOptions(true)}
                  onBlur={() => {
                    scheduleScrollFilledInputToStart(findGroundInputRef);
                    const g = findGround.trim();
                    if (g && (isUuidCourtLabel(g) || UUID_RE.test(g))) {
                      setFindGround("");
                    }
                  }}
                  onChangeText={(v) => {
                    setFindGround(v);
                    setFindGroundId(null);
                    setShowGroundOptions(true);
                  }}
                  style={styles.findInput}
                  placeholder={
                    findVenue.trim()
                      ? "Select or type court"
                      : "Select venue first"
                  }
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  editable={findVenue.trim().length > 0}
                />
                {showGroundOptions && groundOptions.length > 0 ? (
                  <View style={styles.findDropdown}>
                    {groundOptions.map((opt) => (
                      <Pressable
                        key={`ground-${opt.id}`}
                        style={styles.findDropdownItem}
                        onPress={() => {
                          setFindGround(opt.name);
                          setFindGroundId(opt.id);
                          setShowGroundOptions(false);
                          scheduleScrollFilledInputToStart(findGroundInputRef);
                        }}
                      >
                        <Text style={styles.findDropdownItemText}>{opt.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>

              <View style={styles.findPanel}>
                <View
                  style={[styles.findGrid2, isCompact && styles.findGridStack]}
                >
                  <View style={styles.findGridCol}>
                    <View style={styles.findLabelRow}>
                      <ClockIcon color={MUTED} size={14} />
                      <Text style={styles.findLabel}>START TIME</Text>
                    </View>
                    <TextInput
                      value={findStart}
                      onChangeText={setFindStart}
                      style={styles.findInput}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                    />
                  </View>
                  <View style={styles.findGridCol}>
                    <View style={styles.findLabelRow}>
                      <ClockIcon color={MUTED} size={14} />
                      <Text style={styles.findLabel}>END TIME</Text>
                    </View>
                    <TextInput
                      value={findEnd}
                      onChangeText={setFindEnd}
                      style={styles.findInput}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.findPanel, styles.findPanelVerify]}>
                <View style={styles.findVerifyTitle}>
                  <View style={styles.verifyIconBox}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M12 2L3 7v5c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z"
                        stroke={ACCENT}
                        strokeWidth={1.6}
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M9 12l2 2 4-4"
                        stroke={ACCENT}
                        strokeWidth={1.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                  <Text style={styles.verifyTitleText}>Verify access</Text>
                </View>
                <Text style={styles.verifyHint}>
                  (Enter the mobile number of the player who started the
                  recording)
                </Text>
                <View style={styles.phoneRow}>
                  <Text style={styles.phoneCc}>+91</Text>
                  <TextInput
                    value={findPhone}
                    onChangeText={(v) =>
                      setFindPhone(v.replace(/\D/g, "").slice(0, 10))
                    }
                    keyboardType="number-pad"
                    placeholder="Enter your mobile..."
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={styles.phoneInput}
                  />
                </View>
              </View>

              <Pressable style={styles.findCta} onPress={runFindGame}>
                <PlayIcon color="#fff" size={18} />
                <Text style={styles.findCtaText}>Find My Game</Text>
              </Pressable>

              {findMatches !== null ? (
                <View style={styles.findResults}>
                  <Text style={styles.findResultsTitle}>
                    {findMatches.length === 0
                      ? "No matches in your recordings for those details."
                      : `${findMatches.length} match${findMatches.length === 1 ? "" : "es"} in your library`}
                  </Text>
                  {findMatches.map((r: any) => {
                    const title = r?.turf?.name ?? r?.name ?? "Recording";
                    const when = formatRecordingListWhen(r?.startTime);
                    return (
                      <View key={String(r.id)} style={styles.findResultRow}>
                        <Text style={styles.findResultName} numberOfLines={2}>
                          {title}
                        </Text>
                        <Text style={styles.findResultWhen}>{when}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>

        </KeyboardAvoidingView>
        <FieldflixBottomNav active="recordings" />
      </View>
    </WebShell>
  );
}

function SegTab({
  active,
  onPress,
  iconName,
  label,
  compact = false,
}: {
  active: boolean;
  onPress: () => void;
  iconName: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  compact?: boolean;
}) {
  const iconSize = compact ? 22 : 24;
  const iconColor = active ? ACCENT : MUTED;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segTab,
        compact && styles.segTabCompact,
        active && styles.segTabActive,
      ]}
    >
      <MaterialCommunityIcons
        name={iconName}
        size={iconSize}
        color={iconColor}
      />
      <Text
        style={[
          styles.segLabel,
          compact && styles.segLabelCompact,
          active && styles.segLabelActive,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MapPinIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M5 11h14M5 21h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrophyIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 21h8M12 17v4M7 4h10v3a5 5 0 01-10 0V4zM17 4h2a2 2 0 012 2v1a2 2 0 01-2 2h-2M7 4H5a2 2 0 00-2 2v1a2 2 0 002 2h2"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
      <Path
        d="M12 7v6l3 2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function PlayIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7z" />
    </Svg>
  );
}

function ShareIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  segOuter: {
    paddingHorizontal: 16,
    marginTop: 20,
    width: "100%",
  },
  segTrack: {
    flexDirection: "row",
    borderRadius: 20,
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    padding: 5,
    minHeight: 70,
    width: "100%",
    maxWidth: 370,
    alignSelf: "center",
  },
  segTrackCompact: {
    minHeight: 64,
    padding: 4,
  },
  segTab: {
    flex: 1,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 4,
  },
  segTabCompact: {
    minHeight: 56,
    gap: 4,
    paddingHorizontal: 3,
  },
  segTabActive: {
    backgroundColor: REC_BG,
    borderTopWidth: 1,
    borderTopColor: ACCENT,
  },
  segLabel: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
    color: MUTED,
  },
  segLabelCompact: {
    fontSize: 9,
    lineHeight: 12,
  },
  segLabelActive: {
    color: "#fff",
  },
  main: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 128,
    width: "100%",
  },

  myList: { gap: 20, marginTop: 8 },
  myRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#0c1218",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  thumb: {
    width: 120,
    height: 104,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    flexShrink: 0,
  },
  thumbBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: ACCENT,
    zIndex: 10,
  },
  thumbDur: {
    position: "absolute",
    left: 8,
    bottom: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 10,
  },
  thumbDurText: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    color: "#fff",
    fontVariant: ["tabular-nums"],
  },
  thumbShare: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 10,
  },
  thumbPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  thumbPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbLockState: {
    position: "absolute",
    top: 6,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.52)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 11,
  },
  myBody: { flex: 1, minWidth: 0, gap: 6 },
  myTitle: {
    fontFamily: FF.bold,
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.14,
    color: "#fff",
  },
  myLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  myLineText: {
    flex: 1,
    fontFamily: FF.regular,
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(255,255,255,0.78)",
  },
  myLineTextMuted: {
    flex: 1,
    fontFamily: FF.regular,
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(255,255,255,0.65)",
  },
  myLineAccent: {
    flex: 1,
    fontFamily: FF.semiBold,
    fontSize: 12,
    lineHeight: 17,
    color: ACCENT,
  },
  myLineProcessing: {
    flex: 1,
    fontFamily: FF.semiBold,
    fontSize: 11,
    lineHeight: 16,
    color: "rgba(234,179,8,0.95)",
  },
  readyToast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(34,197,94,0.14)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.45)",
  },
  readyToastDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT,
  },
  readyToastTitle: {
    fontFamily: FF.bold,
    fontSize: 13,
    color: "#fff",
  },
  readyToastBody: {
    marginTop: 2,
    fontFamily: FF.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.78)",
  },
  readyToastCta: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  readyToastCtaText: {
    fontFamily: FF.bold,
    fontSize: 12,
    color: "#fff",
  },
  readyToastClose: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  readyToastCloseText: {
    fontFamily: FF.bold,
    fontSize: 22,
    lineHeight: 26,
    color: "rgba(255,255,255,0.7)",
  },
  tagRow: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#1e3521",
  },
  tagText: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    color: ACCENT,
  },
  tagMore: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tagMoreText: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
  },

  sharedList: { gap: 24, marginTop: 8 },
  sharedCard: {
    position: "relative",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    height: 200,
    backgroundColor: "#0a0f14",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
  sharedMedia: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  sharedOverlay: {
    position: "absolute",
    inset: 0 as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingHorizontal: 20,
    paddingBottom: 18,
    justifyContent: "space-between",
  },
  sharedTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sharedReady: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  sharedReadyText: {
    fontFamily: FF.bold,
    fontSize: 12,
    color: "#171717",
  },
  sharedDur: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sharedDurText: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: "rgba(255,255,255,0.92)",
  },
  sharedMid: {
    justifyContent: "center",
    paddingVertical: 4,
  },
  sharedTitle: {
    fontFamily: FF.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.36,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  sharedMeta: {
    marginTop: 6,
    fontFamily: FF.medium,
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255,255,255,0.62)",
  },
  sharedActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 4,
  },
  sharedPills: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  sharedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.22)",
    backgroundColor: "rgba(30, 53, 33, 0.92)",
  },
  sharedPillText: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: ACCENT,
  },
  sharedFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  sharedSubTabs: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  sharedSubTab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(15,23,42,0.55)",
  },
  sharedSubTabActive: {
    borderColor: ACCENT,
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  sharedSubTabText: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: "rgba(203,213,225,0.85)",
  },
  sharedSubTabTextActive: {
    color: ACCENT,
  },

  findWrap: { gap: 14, marginTop: 8 },
  findHeroOuter: {
    position: "relative",
    overflow: "hidden",
    minHeight: 182,
    width: "100%",
    maxWidth: 370,
    alignSelf: "center",
    borderRadius: 20,
    backgroundColor: "#05111a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  findHeroImg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  findHeroInner: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingRight: 96,
    zIndex: 2,
  },
  findHeroInnerCompact: {
    paddingRight: 78,
  },
  findBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(34,197,94,0.1)",
  },
  findBadgeText: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    letterSpacing: 1,
    color: ACCENT,
  },
  findHeadline: {
    marginTop: 10,
    maxWidth: 200,
    fontFamily: FF.bold,
    fontSize: 20,
    lineHeight: 27,
    color: "#fff",
  },
  findEm: {
    color: ACCENT,
  },
  findSub: {
    marginTop: 8,
    maxWidth: 220,
    fontFamily: FF.medium,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(226,232,240,0.85)",
  },
  findPlayRing: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -43,
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "rgba(100,116,139,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    zIndex: 3,
  },
  findPlayCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(15,23,42,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  findSteps: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    width: "100%",
    maxWidth: 370,
    alignSelf: "center",
  },
  findStep: {
    flex: 1,
    minWidth: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.18)",
  },
  findStepMuted: {
    backgroundColor: "rgba(148,163,184,0.08)",
    borderColor: "rgba(148,163,184,0.2)",
  },
  findStepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  findStepDotMuted: {
    backgroundColor: MUTED,
  },
  findStepText: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: ACCENT,
  },
  findStepTextMuted: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: MUTED,
  },
  findPanel: {
    width: "100%",
    maxWidth: 370,
    alignSelf: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.24)",
    backgroundColor: "rgba(15,23,42,0.88)",
  },
  findPanelVerify: {
    borderColor: "rgba(148,163,184,0.24)",
    backgroundColor: "rgba(15,23,42,0.88)",
  },
  findGrid2: {
    flexDirection: "row",
    gap: 10,
  },
  findGridStack: {
    flexDirection: "column",
    gap: 12,
  },
  findGridCol: { flex: 1, minWidth: 0 },
  findLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  findSmallIcon: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  findLabel: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: MUTED,
  },
  findVenueHint: {
    fontFamily: FF.regular,
    fontSize: 11,
    lineHeight: 16,
    color: "rgba(255,255,255,0.45)",
    marginBottom: 10,
  },
  findInput: {
    width: "100%",
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
    backgroundColor: "rgba(2,6,23,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: "#fff",
    textAlign: "left",
    ...Platform.select({
      ios: { writingDirection: "ltr" as const },
      android: { textAlignVertical: "center" },
      default: {},
    }),
  },
  findInputPressable: {
    width: "100%",
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
    backgroundColor: "rgba(2,6,23,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
  },
  findInputPressableText: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: "#fff",
    textAlign: "left",
  },
  findDateModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  findDateModalTouchOut: {
    flex: 1,
  },
  findDateModalSheet: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
  },
  findDateModalHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148,163,184,0.2)",
  },
  findDateModalDone: {
    fontFamily: FF.semiBold,
    fontSize: 15,
    color: ACCENT,
  },
  findDropdown: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
    backgroundColor: "rgba(2,6,23,0.98)",
    overflow: "hidden",
  },
  findDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148,163,184,0.25)",
  },
  findDropdownItemText: {
    fontFamily: FF.medium,
    fontSize: 13,
    color: "#fff",
  },
  findCta: {
    width: "100%",
    maxWidth: 370,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 20,
    minHeight: 48,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 7,
  },
  findCtaText: {
    fontFamily: FF.bold,
    fontSize: 16,
    lineHeight: 22,
    color: "#fff",
  },
  findResults: {
    width: "100%",
    maxWidth: 370,
    alignSelf: "center",
    gap: 10,
  },
  findResultsTitle: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    color: MUTED,
    marginBottom: 4,
  },
  findResultRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(15,23,42,0.7)",
  },
  findResultName: {
    fontFamily: FF.semiBold,
    fontSize: 15,
    color: "#fff",
  },
  findResultWhen: {
    marginTop: 4,
    fontFamily: FF.regular,
    fontSize: 13,
    color: MUTED,
  },
  emptyList: {
    fontFamily: FF.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    marginBottom: 12,
  },

  findVerifyTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  verifyIconBox: {
    width: 24,
    height: 24,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyTitleText: {
    fontFamily: FF.semiBold,
    fontSize: 16,
    color: "#fff",
  },
  verifyHint: {
    marginTop: 8,
    fontFamily: FF.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
  },
  phoneRow: {
    marginTop: 10,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(18,25,38,0.95)",
    paddingHorizontal: 12,
  },
  phoneCc: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    color: "rgba(255,255,255,0.9)",
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: "#fff",
    paddingVertical: 0,
  },
});

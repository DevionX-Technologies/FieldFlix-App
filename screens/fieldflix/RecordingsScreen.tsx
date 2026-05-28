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
  findRecordings,
  getRecordingPlayback,
  claimRecording,
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
  explicitCourtNumberFromCamera,
} from "@/utils/cameraCourtLabel";
import {
  formatRecordingListWhen,
  highlightCountFromRecording,
  recordingDurationLabel,
  recordingIsReady,
  recordingThumbUrl,
} from "@/utils/recordingDisplay";
import { buildHighlightsAppLink } from "@/utils/highlightsAppLink";
import { navigateMainTabBackToHome } from "@/utils/navigateBackOrHome";
import { presentEventNotification } from "@/utils/presentEventNotification";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { ResizeMode, type AVPlaybackStatus, Video } from "expo-av";
import type { ComponentProps, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Easing,
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

/** Last 10 digits for find-and-claim (handles +91…, spaces, leading country code). */
function digitsLast10(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/** Matches backend camera UUID — never show raw in "court" UI. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidCourtLabel(label: string): boolean {
  const rest = label.replace(/^court\s+/i, "").trim();
  return UUID_RE.test(rest);
}

function recordingCourtLabel(r: any): string {
  const turf = r?.turf;
  const cam = (r?.camera ?? null) as Camera | null;
  if (cam) {
    const n = explicitCourtNumberFromCamera(cam);
    if (n != null) return `Court ${n}`;
    const rawStr = compactText(
      cam.court_number != null ? String(cam.court_number) : "",
    );
    if (rawStr) {
      if (/^court\b/i.test(rawStr)) return rawStr;
      return `Court ${rawStr}`;
    }
  }
  const camName = compactText(r?.camera?.name ?? "");
  /** Legacy payloads may still send ground* — show as Court in UI only. */
  const fromFields = compactText(
    r?.GroundNumber ??
      turf?.ground_number ??
      r?.GroundDescription ??
      turf?.ground_description ??
      "",
  );
  if (fromFields) {
    if (/^ground\b/i.test(fromFields)) {
      const asCourt = fromFields
        .replace(/^ground\b/i, "Court")
        .replace(/\s+/g, " ")
        .trim();
      return /^court\b/i.test(asCourt) ? asCourt : `Court ${asCourt}`;
    }
    if (/^court\b/i.test(fromFields)) return fromFields;
    return `Court ${fromFields}`;
  }
  if (camName) {
    const m = camName.match(/(\d+)/);
    if (m) return `Court ${m[1]}`;
    return camName;
  }
  const rawId = compactText(r?.cameraId ?? "");
  if (rawId && !UUID_RE.test(rawId)) {
    if (/^court\b/i.test(rawId)) return rawId;
    if (/^ground\b/i.test(rawId)) {
      return rawId.replace(/^ground\b/i, "Court").replace(/\s+/g, " ").trim();
    }
    return `Court ${rawId}`;
  }
  return "";
}

const FIND_PREVIEW_MAX_SEC = 90;

function estimateRecordingDurationSec(rec: any): number | null {
  const start = rec?.startTime ? new Date(rec.startTime).getTime() : NaN;
  const end = rec?.endTime ? new Date(rec.endTime).getTime() : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return Math.max(1, Math.floor((end - start) / 1000));
}

function FindMatchPreviewPlayer({
  recordingId,
  recording,
}: {
  recordingId: string;
  recording: any;
}) {
  const fallbackUrl = String(
    recording?.mux_media_url ?? recording?.mux_public_url ?? "",
  ).trim();
  const estimatedDuration = estimateRecordingDurationSec(recording);
  const [uri, setUri] = useState(fallbackUrl);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewLimitSec, setPreviewLimitSec] = useState<number>(
    estimatedDuration != null
      ? Math.min(FIND_PREVIEW_MAX_SEC, estimatedDuration)
      : FIND_PREVIEW_MAX_SEC,
  );
  const videoRef = useRef<Video | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setUri(fallbackUrl);
    setPreviewLimitSec(
      estimatedDuration != null
        ? Math.min(FIND_PREVIEW_MAX_SEC, estimatedDuration)
        : FIND_PREVIEW_MAX_SEC,
    );
    (async () => {
      try {
        const playback = await getRecordingPlayback(recordingId);
        if (cancelled) return;
        const resolved = String(
          playback?.signed_url ?? playback?.mux_public_url ?? fallbackUrl,
        ).trim();
        if (!resolved) {
          setLoadError("Preview unavailable");
          setLoading(false);
          return;
        }
        setUri(resolved);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Preview unavailable");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recordingId, fallbackUrl, estimatedDuration]);

  const onPlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      const durationSec = Number.isFinite(status.durationMillis)
        ? (status.durationMillis ?? 0) / 1000
        : 0;
      if (durationSec > 0) {
        const capped = Math.min(FIND_PREVIEW_MAX_SEC, durationSec);
        if (Math.abs(capped - previewLimitSec) > 0.25) {
          setPreviewLimitSec(capped);
        }
      }
      const capMs = previewLimitSec * 1000;
      if (status.positionMillis >= capMs && status.isPlaying) {
        videoRef.current
          ?.setStatusAsync({ shouldPlay: false, positionMillis: capMs })
          .catch(() => null);
      }
    },
    [previewLimitSec],
  );

  if (!uri) {
    return (
      <View style={styles.findPreviewUnavailable}>
        <Text style={styles.findPreviewUnavailableText}>
          Preview unavailable for this recording.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.findPreviewWrap}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.findPreviewVideo}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping={false}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
      />
      {loading ? (
        <View style={styles.findPreviewLoading}>
          <ActivityIndicator color={ACCENT} />
          <Text style={styles.findPreviewLoadingText}>Loading preview...</Text>
        </View>
      ) : null}
      {!loading && loadError ? (
        <Text style={styles.findPreviewHint}>
          Preview fallback used ({loadError}).
        </Text>
      ) : null}
      <Text style={styles.findPreviewHint}>
        Preview capped to {Math.max(1, Math.round(previewLimitSec))}s. If the
        recording is shorter, full video is shown.
      </Text>
    </View>
  );
}

function FindSearchingIndicator() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  return (
    <Animated.View style={[styles.findSearchingWrap, { opacity }]}>
      <ActivityIndicator color={ACCENT} />
      <Text style={styles.findSearchingText}>Searching for your video...</Text>
    </Animated.View>
  );
}

function recordingArenaLabel(r: any): string {
  const turf = r?.turf;
  return compactText(turf?.name ?? r?.recording_name ?? r?.name ?? "");
}

/** Paginated `/turfs` without `sports_supported` — backend returns every active arena with exact DB `name`. */
const FIND_TURF_PAGE_LIMIT = 100;
const FIND_MAX_TURF_PAGES = 40;

type TurfsFetchDiag = {
  pages: Array<{ page: number; raw: unknown }>;
  rawCount: number;
  afterIdDedupeCount: number;
  finalCount: number;
  duplicateNameGroups: Array<{ name: string; ids: string[] }>;
};

async function fetchAllTurfsForFindRecording(): Promise<{
  turfs: any[];
  diag: TurfsFetchDiag;
}> {
  const merged: any[] = [];
  const diag: TurfsFetchDiag = {
    pages: [],
    rawCount: 0,
    afterIdDedupeCount: 0,
    finalCount: 0,
    duplicateNameGroups: [],
  };
  for (let page = 1; page <= FIND_MAX_TURF_PAGES; page++) {
    let turfRes: unknown;
    try {
      turfRes = await getTurfsPage(page, FIND_TURF_PAGE_LIMIT);
    } catch (err) {
      diag.pages.push({ page, raw: { error: String(err) } });
      break;
    }
    diag.pages.push({ page, raw: turfRes });
    let itemsRaw: unknown;
    let declaredTotalPages: number | null = null;
    if (Array.isArray(turfRes)) {
      itemsRaw = turfRes;
    } else if (turfRes && typeof turfRes === "object") {
      const bag = turfRes as {
        items?: unknown;
        data?: unknown;
        meta?: { totalPages?: number };
      };
      itemsRaw = bag.items ?? bag.data ?? [];
      if (typeof bag.meta?.totalPages === "number" && bag.meta.totalPages >= 1) {
        declaredTotalPages = bag.meta.totalPages;
      }
    } else {
      itemsRaw = [];
    }
    const chunk = (Array.isArray(itemsRaw) ? itemsRaw : []) as any[];
    merged.push(...chunk);
    if (chunk.length === 0) break;
    if (chunk.length < FIND_TURF_PAGE_LIMIT) break;
    if (declaredTotalPages != null && page >= declaredTotalPages) break;
  }
  diag.rawCount = merged.length;
  const byId = dedupeTurfsByIdForFind(merged);
  diag.afterIdDedupeCount = byId.length;
  const { unique, duplicates } = dedupeTurfsByNormalizedNameForFind(byId);
  diag.finalCount = unique.length;
  diag.duplicateNameGroups = duplicates;
  return { turfs: unique, diag };
}

/** One row per turf UUID. */
function dedupeTurfsByIdForFind(rows: any[]): any[] {
  const byId = new Map<string, any>();
  for (const t of rows) {
    const id = String(t?.id ?? "").trim();
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, t);
  }
  return [...byId.values()].sort((a, b) =>
    String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, {
      sensitivity: "base",
    }),
  );
}

/**
 * Normalize a venue name for duplicate detection — lowercase, collapse runs
 * of whitespace, strip punctuation differences ("|" vs " | "). Used by
 * `dedupeTurfsByNormalizedNameForFind` to fold duplicate DB rows together.
 */
function normalizeTurfNameForDedupe(name: unknown): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\|\s*/g, " | ")
    .trim();
}

/**
 * Collapse turfs whose names are identical after normalization.
 *
 * Defensive against backend rows that share the same display name but
 * different UUIDs — usually duplicate seed data or `leftJoinAndSelect` row
 * fan-out that the paginate wrapper didn't fully fold.
 *
 * The surviving row is annotated with `aliasIds` — the full list of every
 * duplicate turf UUID that collapsed into it. Downstream code uses
 * `aliasIds` (not just `id`) when querying `/cameras` and `/recording/
 * find-and-claim`, so cameras and recordings attached to a non-canonical
 * sibling turf row still light up the court dropdown and still match.
 *
 * Returns the surviving rows (lowest id wins so the choice is deterministic)
 * AND the list of collapsed duplicate id-groups so the debug button can
 * surface exactly which DB rows are colliding.
 */
function dedupeTurfsByNormalizedNameForFind(rows: any[]): {
  unique: any[];
  duplicates: Array<{ name: string; ids: string[] }>;
} {
  const groups = new Map<string, any[]>();
  for (const t of rows) {
    if (!t?.id) continue;
    const key =
      normalizeTurfNameForDedupe(t?.name) || `__noname__:${String(t.id)}`;
    const existing = groups.get(key) ?? [];
    existing.push(t);
    groups.set(key, existing);
  }
  const unique: any[] = [];
  const duplicates: Array<{ name: string; ids: string[] }> = [];
  for (const [, group] of groups) {
    if (group.length === 0) continue;
    const sorted = [...group].sort((a, b) =>
      String(a.id).localeCompare(String(b.id)),
    );
    const survivor = sorted[0];
    const aliasIds = sorted.map((g) => String(g.id));
    unique.push({ ...survivor, aliasIds });
    if (sorted.length > 1) {
      duplicates.push({
        name: String(survivor?.name ?? ""),
        ids: aliasIds,
      });
    }
  }
  unique.sort((a, b) =>
    String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, {
      sensitivity: "base",
    }),
  );
  return { unique, duplicates };
}

export default function FieldflixRecordingsScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const router = useRouter();
  const navigation = useNavigation();
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

  /** Latest tab in a ref so listeners read the current value without re-subscribing.
   *  Re-registering on every tab change can lose the LIFO race against the
   *  layout-level `BackHandler` in `app/_layout.tsx` (which re-registers on `pathname`
   *  changes and would otherwise call `router.back()` first, popping us to Home). */
  const tabRef = useRef<TabId>(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      const onBack = () => {
        const t = tabRef.current;
        if (t === "shared" || t === "find") {
          setTab("my");
          return true;
        }
        navigateMainTabBackToHome(router);
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [router]),
  );

  /** iOS swipe-back (and any react-navigation `pop` triggered by the root layout's
   *  `BackHandler` on Android) goes through `beforeRemove`. Intercepting here is
   *  platform-agnostic and survives the LIFO race with other hardwareBackPress listeners. */
  useEffect(() => {
    const nav: any = navigation;
    if (!nav?.addListener) return;
    const handler = (e: any) => {
      const t = tabRef.current;
      if (t === "shared" || t === "find") {
        e.preventDefault?.();
        setTab("my");
      }
    };
    const sub = nav.addListener("beforeRemove", handler);
    return () => {
      if (typeof sub === "function") sub();
      else nav.removeListener?.("beforeRemove", handler);
    };
  }, [navigation]);

  const recordingUnlockedPlayback = useCallback(
    (recordingId: string) => unlockedRecordingIds.includes(String(recordingId)),
    [unlockedRecordingIds],
  );

  const [findVenue, setFindVenue] = useState("");
  const [findVenueId, setFindVenueId] = useState<string | null>(null);
  /**
   * Every duplicate turf UUID that name-collapses into the picked venue
   * (including `findVenueId` itself). Cameras and recordings attached to
   * any of these rows are treated as belonging to the same venue. Without
   * this, picking a deduped venue would miss cameras + recordings sitting
   * on a sibling turf row from a buggy seed run.
   */
  const [findVenueAliasIds, setFindVenueAliasIds] = useState<string[]>([]);
  const [findGround, setFindGround] = useState("");
  const [findGroundId, setFindGroundId] = useState<string | null>(null);
  /**
   * The DB-backed `court_number` for the picked court. This is what we send
   * to the backend search — court_number > cameraId because the court might
   * have multiple cameras attached to different (duplicate) turf rows.
   */
  const [findCourtNumber, setFindCourtNumber] = useState<number | null>(null);
  /** UI state for the per-row "this is mine" claim button in the result list. */
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [systemTurfs, setSystemTurfs] = useState<any[]>([]);
  const [systemCameras, setSystemCameras] = useState<Camera[]>([]);
  /** Diagnostics captured during the last `/turfs` pagination — surfaced via
   *  the in-UI "Debug" button next to the venue dropdown so we can tell at a
   *  glance whether duplicate-looking rows are an FE or a BE problem. */
  const [turfsFetchDiag, setTurfsFetchDiag] = useState<TurfsFetchDiag | null>(
    null,
  );
  /** Raw `/cameras` response for the currently selected venue, for the same
   *  debug button next to the COURT NO. dropdown. */
  const [camerasFetchDiag, setCamerasFetchDiag] = useState<unknown>(null);
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
  const [isFindingGame, setIsFindingGame] = useState(false);
  const [showVenueOptions, setShowVenueOptions] = useState(false);
  const [showGroundOptions, setShowGroundOptions] = useState(false);
  /** When non-null, displays the bottom-sheet listing the people a recording
   *  was shared with / by, including their phone numbers. */
  const [peopleModal, setPeopleModal] = useState<
    | { label: string; people: { name: string; phone: string | null }[] }
    | null
  >(null);
  const [claimSuccessModal, setClaimSuccessModal] = useState<{
    title: string;
    when: string;
  } | null>(null);
  /** Native time-picker visibility — independent for start vs end so the
   *  user can re-open one without dismissing the other on iOS modal sheet. */
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  /** Format the JS Date returned by the picker into the HH:mm string the
   *  backend `find-and-claim` DTO expects. */
  const formatHHmm = useCallback((d: Date) => {
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }, []);

  /** HH:mm → today's Date (only hours/minutes used) so the picker has a
   *  defaulted-to-current-value when the user re-opens it. */
  const hmStringToDate = useCallback((hhmm: string): Date => {
    const base = new Date();
    const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      base.setHours(Number(m[1]), Number(m[2]), 0, 0);
    }
    return base;
  }, []);

  const onStartTimeChange = useCallback(
    (_e: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === "android") setShowStartTimePicker(false);
      if (selected) setFindStart(formatHHmm(selected));
    },
    [formatHHmm],
  );
  const onEndTimeChange = useCallback(
    (_e: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === "android") setShowEndTimePicker(false);
      if (selected) setFindEnd(formatHHmm(selected));
    },
    [formatHHmm],
  );

  const findDateLabel = useMemo(
    () => findPickDate.toDateString(),
    [findPickDate],
  );

  const resetFindForm = useCallback(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    setFindVenue("");
    setFindVenueId(null);
    setFindVenueAliasIds([]);
    setFindGround("");
    setFindGroundId(null);
    setFindCourtNumber(null);
    setFindPickDate(d);
    setFindStart("");
    setFindEnd("");
    setFindPhone("");
    setFindMatches(null);
    setShowVenueOptions(false);
    setShowGroundOptions(false);
    setIsFindingGame(false);
  }, []);

  useEffect(() => {
    if (tab !== "find") {
      resetFindForm();
    }
  }, [tab, resetFindForm]);

  /**
   * Venue dropdown — backs the "VENUES" autocomplete.
   *
   * - Every active turf returned by `/turfs` must appear (DB currently has 7).
   *   We no longer drop rows with empty names; we surface the city or a stub
   *   instead so admins can still see — and fix — broken entries.
   * - When a venue is already selected and the input text exactly matches its
   *   name, treat the query as empty so re-opening the dropdown shows the full
   *   list (previously it filtered down to just the selected venue).
   */
  const venueDropdownOptions = useMemo(() => {
    const q = findVenue.trim().toLowerCase();
    const selectedNameLower = findVenueId
      ? String(
          systemTurfs.find((t) => t?.id === findVenueId)?.name ?? "",
        )
          .toLowerCase()
          .trim()
      : "";
    const effectiveQ = q && q === selectedNameLower ? "" : q;

    const decorated = systemTurfs
      .filter((x) => x && x.id)
      .map((x) => {
        const trimmedName = String(x.name ?? "").trim();
        const displayName =
          trimmedName ||
          String(x.city ?? "").trim() ||
          `Venue ${String(x.id).slice(0, 8)}`;
        return { ...x, name: displayName };
      });

    return decorated
      .filter((x) => !effectiveQ || x.name.toLowerCase().includes(effectiveQ))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  }, [findVenue, findVenueId, systemTurfs]);

  /**
   * Camera fetch fanned out across every alias turf UUID the selected venue
   * collapses (see `findVenueAliasIds`). Cameras returned for any alias are
   * merged and de-duplicated by `id`, so cameras attached to a non-canonical
   * sibling turf row still appear in the court dropdown.
   *
   * The aborted-state guard prevents stale fetches from a previous venue
   * stomping the current state when the user switches venues quickly.
   */
  useEffect(() => {
    const ids = findVenueAliasIds.length > 0
      ? findVenueAliasIds
      : findVenueId
        ? [findVenueId]
        : [];
    if (ids.length === 0) {
      setSystemCameras([]);
      setCamerasFetchDiag(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        ids.map((tid) =>
          getCameras(tid)
            .then((cams) => ({ turfId: tid, cams, error: null as string | null }))
            .catch((err) => ({
              turfId: tid,
              cams: [] as Camera[],
              error: String(err),
            })),
        ),
      );
      if (cancelled) return;
      const merged = new Map<string, Camera>();
      for (const r of results) {
        for (const cam of r.cams) {
          if (cam?.id && !merged.has(String(cam.id))) {
            merged.set(String(cam.id), cam);
          }
        }
      }
      setSystemCameras([...merged.values()]);
      setCamerasFetchDiag({ requestedTurfIds: ids, perTurf: results });
    })();
    return () => {
      cancelled = true;
    };
  }, [findVenueId, findVenueAliasIds]);

  /**
   * Courts for the chosen turf (`/cameras?turfId=…`).
   *
   * - Source of truth is `Camera.court_number` from `/cameras` (DB-backed). Each distinct
   *   court_number at the venue produces exactly one dropdown row.
   * - If the API omits or nulls `court_number`, the dropdown stays empty (deploy backend with
   *   the `court_number` column on `Camera` — DB values alone are not enough).
   * - NEVER surface raw camera UUIDs, install serials (e.g. CAM-105), or "Camera xxxx…" labels.
   */
  const groundOptions = useMemo(() => {
    const q = findGround.trim().toLowerCase();
    const venueId = String(findVenueId ?? "").trim();
    if (!venueId) return [];

    // A camera is valid for this venue if its `turfId` matches the picked
    // venue OR any of its alias turf UUIDs (see `findVenueAliasIds`).
    const allowedTurfIds = new Set<string>(
      findVenueAliasIds.length > 0 ? findVenueAliasIds : [venueId],
    );
    const valid = systemCameras.filter((x) => {
      if (!x?.id) return false;
      return allowedTurfIds.has(String(x.turfId ?? "").trim());
    });
    if (valid.length === 0) return [];

    type GroundOpt = Camera & {
      name: string;
      courtSortKey: number;
      dedupeKey: string;
    };

    const rows: GroundOpt[] = [];
    for (const cam of valid) {
      const courtN = explicitCourtNumberFromCamera(cam);
      if (courtN == null) continue;

      rows.push({
        ...cam,
        name: `Court ${courtN}`,
        courtSortKey: courtN,
        dedupeKey: `court:${courtN}`,
      });
    }

    // Multiple cameras can sit on the same physical court — collapse to one row.
    // Pick the lowest camera id so the selection is deterministic.
    const merged = new Map<string, GroundOpt>();
    for (const row of rows) {
      const prev = merged.get(row.dedupeKey);
      const pick =
        prev == null || String(row.id).localeCompare(String(prev.id)) < 0
          ? row
          : prev;
      merged.set(row.dedupeKey, pick);
    }

    return [...merged.values()]
      .filter((x) => !q || x.name.toLowerCase().includes(q))
      .sort((a, b) => a.courtSortKey - b.courtSortKey);
  }, [findGround, findVenueId, findVenueAliasIds, systemCameras]);

  const isLocationComplete = !!findVenueId;
  const isScheduleComplete =
    !!findVenueId &&
    findStart.trim().length > 0 &&
    findEnd.trim().length > 0;
  const isVerifyComplete = digitsLast10(findPhone.trim()) != null;

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

  const load = useCallback(async () => {
    try {
      const [a, b, c, flickList, turfsResult] = await Promise.all([
        getMyRecordings(),
        getSharedWithMe(),
        getSharedByMe().catch(() => []),
        getPublicFlickShorts(undefined).catch(() => []),
        fetchAllTurfsForFindRecording().catch(
          () =>
            ({ turfs: [], diag: null } as unknown as {
              turfs: any[];
              diag: TurfsFetchDiag | null;
            }),
        ),
      ]);
      setMy(a);
      setShared(b);
      setSharedByMe(c);
      setSystemTurfs(
        Array.isArray(turfsResult?.turfs) ? turfsResult.turfs : [],
      );
      setTurfsFetchDiag(turfsResult?.diag ?? null);
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

  /**
   * Search-only flow for the new "Find My Recording" UX.
   *
   * Sends ONE request to `POST /recording/find` with every alias turf UUID
   * for the picked venue plus the picked court_number, a ±1h time window
   * (applied server-side), and the last-10-digit phone filter. The backend
   * does NOT auto-claim. We render the matches and let the user tap "This
   * is my recording" on the row that's actually theirs — that's when we
   * call `claimRecording` to add it to their library.
   */
  const runFindGame = useCallback(async () => {
    if (isFindingGame) {
      console.log("[find-recording] ignored: request already in progress");
      return;
    }
    const phoneLast10 = digitsLast10(findPhone.trim());
    const missingFields = {
      venue: !findVenueId,
      startTime: !findStart.trim(),
      endTime: !findEnd.trim(),
      phoneLast10: !phoneLast10,
    };
    if (
      missingFields.venue ||
      missingFields.startTime ||
      missingFields.endTime ||
      missingFields.phoneLast10
    ) {
      console.log("[find-recording] blocked: missing required fields", {
        missingFields,
        findVenueId,
        findVenueAliasIds,
        findStart,
        findEnd,
        findPhone,
      });
      Alert.alert(
        "Missing details",
        "Please select venue, start time, end time, and enter a valid 10-digit phone number.",
      );
      return;
    }
    setClaimedIds(new Set());
    setClaimingId(null);
    setFindMatches(null);
    setIsFindingGame(true);
    try {
      const fd = new Date(findPickDate);
      const m = String(fd.getMonth() + 1).padStart(2, "0");
      const d = String(fd.getDate()).padStart(2, "0");
      const dateStr = `${fd.getFullYear()}-${m}-${d}`;
      const turfIds =
        findVenueAliasIds.length > 0 ? findVenueAliasIds : [findVenueId];
      console.log("[find-recording] request:start", {
        turfIds,
        findVenueId,
        findVenueAliasIds,
        findGroundId,
        findCourtNumber,
        dateStr,
        findStart,
        findEnd,
        phoneLast10,
      });

      const matches = await findRecordings({
        turfIds,
        date: dateStr,
        startTime: findStart.trim(),
        endTime: findEnd.trim(),
        phoneLast10,
      });

      // De-dupe defensively in case the backend ever returns multiples for
      // the same recording id.
      const merged = new Map<string, any>();
      for (const rec of Array.isArray(matches) ? matches : []) {
        const rid = String(rec?.id ?? "");
        if (!rid || merged.has(rid)) continue;
        merged.set(rid, rec);
      }
      console.log("[find-recording] request:success", {
        rawMatchesCount: Array.isArray(matches) ? matches.length : 0,
        dedupedMatchesCount: merged.size,
      });
      setFindMatches([...merged.values()]);
    } catch (e) {
      console.warn("Error finding game", e);
      console.log("[find-recording] request:failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      setFindMatches([]);
      Alert.alert(
        "Couldn't find recordings",
        "Request failed. Tap Debug next to venue/court and share logs if this continues.",
      );
    } finally {
      setIsFindingGame(false);
    }
    setShowVenueOptions(false);
    setShowGroundOptions(false);
  }, [
    isFindingGame,
    findVenueId,
    findVenueAliasIds,
    findGroundId,
    findCourtNumber,
    findPickDate,
    findStart,
    findEnd,
    findPhone,
  ]);

  /**
   * Per-row "This is my recording" handler. Calls `POST /recording/claim/:id`
   * for the picked match, then reloads the lists so the recording appears
   * in My Recordings (and resyncs unlock state so the lock icon reflects any
   * group-paid status).
   */
  const claimMatch = useCallback(
    async (recordingId: string) => {
      if (!recordingId || claimedIds.has(recordingId) || claimingId) return;
      setClaimingId(recordingId);
      try {
        const claimResult = await claimRecording(recordingId);
        setClaimedIds((prev) => {
          const next = new Set(prev);
          next.add(recordingId);
          return next;
        });
        await load();
        refreshUnlockedIds();
        const rec = claimResult?.recording;
        const title =
          rec?.turf?.name ??
          rec?.turf_detail?.name ??
          rec?.recording_name ??
          "Recording";
        const when = formatRecordingListWhen(rec?.startTime);
        setClaimSuccessModal({
          title: String(title),
          when,
        });
        void presentEventNotification({
          title: "Added to My Recordings",
          body: `${title}${when ? ` · ${when}` : ""}`,
          notificationType: "LOCAL_RECORDING_CLAIMED",
          data: { recording_id: recordingId },
        }).catch(() => null);
      } catch (e) {
        console.warn("Error claiming recording", e);
        Alert.alert(
          "Couldn't add to My Recordings",
          "Please try again in a moment.",
        );
      } finally {
        setClaimingId(null);
      }
    },
    [claimedIds, claimingId, load, refreshUnlockedIds],
  );

  const alreadyInLibraryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const rec of my) {
      const rid = String(rec?.id ?? "").trim();
      if (rid) ids.add(rid);
    }
    for (const row of shared) {
      const rid = String(row?.recording?.id ?? "").trim();
      if (rid) ids.add(rid);
    }
    return ids;
  }, [my, shared]);

  /**
   * My Recordings list.
   *
   * Includes:
   *   1. Recordings the user started themselves (`getMyRecordings`).
   *   2. Recordings claimed via "Find My Recording" — those come back from
   *      `/recording/shared-with-me` as SharedRecording rows whose inner
   *      `.recording` is what the user wants to see here.
   *
   * Both are merged and de-duplicated by recording id so a single recording
   * never appears twice (e.g. when a user is both the owner and somehow also
   * shared with). Lock state is unaffected — `recordingUnlockedPlayback` only
   * returns true for ids the user has actually paid for, so claimed-but-unpaid
   * rows stay locked until the user (or someone in their group) buys them.
   */
  const myRows = useMemo(() => {
    const collected: any[] = [];
    const seen = new Set<string>();

    const pushOnce = (rec: any) => {
      if (!rec) return;
      const rid = String(rec?.id ?? "").trim();
      if (!rid || seen.has(rid)) return;
      seen.add(rid);
      collected.push(rec);
    };

    if (Array.isArray(my)) {
      for (const r of my) pushOnce(r);
    }
    if (Array.isArray(shared)) {
      // `shared` rows wrap the recording — unwrap so the shape matches `my` rows.
      for (const s of shared) pushOnce(s?.recording);
    }

    // Newest first, so a just-claimed recording lands at the top.
    collected.sort((a, b) => {
      const ta = new Date(a?.startTime ?? 0).getTime();
      const tb = new Date(b?.startTime ?? 0).getTime();
      return tb - ta;
    });

    return collected.map((s: any, i: number) => {
      const hid = String(s?.id ?? "");
      const h =
        highlightCountFromRecording(s) +
        (hid ? (shortsPerRecording[hid] ?? 0) : 0);
      const td = s?.turf ?? s?.turf_detail ?? null;
      return {
        id: String(s?.id ?? i),
        recordingId: s?.id ? String(s.id) : null,
        title:
          td?.name ??
          s?.recording_name ??
          s?.name ??
          "Recording",
        location:
          td?.city ??
          td?.location ??
          s?.location ??
          "",
        when: formatRecordingListWhen(s?.startTime),
        duration: recordingDurationLabel(s),
        thumbUrl: recordingThumbUrl(s),
        highlights: h > 0 ? h : null,
        status: String(s?.status ?? "").toLowerCase(),
        isReady: recordingIsReady(s),
        tags: [] as string[],
        moreTags: 0,
      };
    });
  }, [my, shared, shortsPerRecording]);

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
      // The recording owner is the person who shared it with you. The API
      // exposes their name (and sometimes phone) on the recording detail.
      const people = [
        {
          name:
            String(rec?.owner_name ?? "").trim() ||
            String(rec?.user?.name ?? "").trim() ||
            "Unknown",
          phone:
            String(rec?.owner_phone ?? "").trim() ||
            String(rec?.user?.mobile ?? "").trim() ||
            null,
        },
      ];
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
        people,
        peopleLabel: "Shared by",
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
      // De-duplicate by user id so we don't list the same recipient twice if
      // they were granted access through more than one share record.
      const seenIds = new Set<string>();
      const people: { name: string; phone: string | null }[] = [];
      for (const x of group) {
        const id = String(x?.shared_to_user_id ?? "");
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);
        people.push({
          name: String(x?.shared_to_user_name ?? "").trim() || "Unknown",
          phone: String(x?.shared_to_user_phone ?? "").trim() || null,
        });
      }
      return {
        id: String(rec?.id ?? i),
        recordingId: rec?.id ? String(rec.id) : null,
        title: td?.name ?? rec?.owner_name ?? `Recording #${i + 1}`,
        highlights: highlightCountFromRecording(rec),
        location: loc,
        thumbUrl: recordingThumbUrl(rec),
        duration: recordingDurationLabel(rec),
        peopleCount,
        people,
        peopleLabel: "Shared with",
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
              <Text style={styles.readyToastTitle} numberOfLines={2}>
                {readyState.kind === "ready"
                  ? "Your recording is ready"
                  : readyState.kind === "failed"
                    ? "Recording capture failed"
                    : "Processing your recording…"}
              </Text>
              <Text style={styles.readyToastBody} numberOfLines={3}>
                {readyState.kind === "ready"
                  ? "Open Highlights to watch the preview and unlock the full match."
                  : readyState.kind === "failed"
                    ? "Session completed, but recording capture failed due to a technical issue."
                    : "Your highlights and recording will be updated shortly."}
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
                        style={[
                          styles.thumbLockState,
                          recordingUnlockedPlayback(row.recordingId)
                            ? styles.thumbLockStateUnlocked
                            : styles.thumbLockStateLocked,
                        ]}
                        pointerEvents="none"
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        <MaterialCommunityIcons
                          // Distinct icons + colors so locked vs unlocked
                          // are recognisable at a glance, not just outlines.
                          name={
                            recordingUnlockedPlayback(row.recordingId)
                              ? "lock-open-variant"
                              : "lock"
                          }
                          size={16}
                          color={
                            recordingUnlockedPlayback(row.recordingId)
                              ? "#22C55E"
                              : "#F87171"
                          }
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
                        <Pressable
                          style={styles.sharedPillTappable}
                          onPress={(e) => {
                            e.stopPropagation();
                            setPeopleModal({
                              label: card.peopleLabel ?? "People",
                              people: card.people ?? [],
                            });
                          }}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Show people"
                        >
                          <Text style={styles.sharedPillText} numberOfLines={1}>
                            {card.peopleCount}{" "}
                            {card.peopleCount === 1 ? "person" : "people"}
                          </Text>
                          <MaterialCommunityIcons
                            name="information-outline"
                            size={14}
                            color={ACCENT}
                          />
                        </Pressable>
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
                    setFindVenueAliasIds([]);
                    setShowVenueOptions(true);
                    setFindGround("");
                    setFindGroundId(null);
                    setFindCourtNumber(null);
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
                          // Record every duplicate turf UUID the picked
                          // venue collapses (including its own). All
                          // downstream queries (cameras, find-and-claim)
                          // fan out over these so cameras / recordings
                          // attached to a sibling row still match.
                          const aliases: string[] = Array.isArray(
                            (opt as { aliasIds?: unknown }).aliasIds,
                          )
                            ? ((opt as { aliasIds: unknown[] }).aliasIds.map(
                                (x) => String(x ?? ""),
                              ) as string[])
                            : [];
                          const ids = aliases.length > 0 ? aliases : [opt.id];
                          setFindVenueAliasIds(
                            Array.from(new Set(ids.filter((s) => !!s))),
                          );
                          setFindGround("");
                          setFindGroundId(null);
                          setFindCourtNumber(null);
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
                  <Text style={styles.findLabel}>COURT NO.</Text>
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
                    setFindCourtNumber(null);
                    setShowGroundOptions(true);
                  }}
                  style={styles.findInput}
                  placeholder={
                    findVenueId
                      ? "Select or type court"
                      : "Select a venue from the list first"
                  }
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  editable={!!findVenueId}
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
                          // `courtSortKey` is the DB `court_number`.
                          setFindCourtNumber(
                            typeof (opt as { courtSortKey?: number })
                              .courtSortKey === "number"
                              ? (opt as { courtSortKey: number }).courtSortKey
                              : null,
                          );
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
                    <Pressable
                      onPress={() => setShowStartTimePicker(true)}
                      style={styles.findInputPressable}
                      accessibilityRole="button"
                      accessibilityLabel="Choose start time"
                    >
                      <Text
                        style={[
                          styles.findInputPressableText,
                          !findStart && {
                            color: "rgba(255,255,255,0.35)",
                          },
                        ]}
                      >
                        {findStart || "Select start time"}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.findGridCol}>
                    <View style={styles.findLabelRow}>
                      <ClockIcon color={MUTED} size={14} />
                      <Text style={styles.findLabel}>END TIME</Text>
                    </View>
                    <Pressable
                      onPress={() => setShowEndTimePicker(true)}
                      style={styles.findInputPressable}
                      accessibilityRole="button"
                      accessibilityLabel="Choose end time"
                    >
                      <Text
                        style={[
                          styles.findInputPressableText,
                          !findEnd && {
                            color: "rgba(255,255,255,0.35)",
                          },
                        ]}
                      >
                        {findEnd || "Select end time"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Android: inline DateTimePicker — auto-dismisses on selection. */}
                {showStartTimePicker && Platform.OS === "android" ? (
                  <DateTimePicker
                    value={hmStringToDate(findStart)}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    themeVariant="dark"
                    onChange={onStartTimeChange}
                  />
                ) : null}
                {showEndTimePicker && Platform.OS === "android" ? (
                  <DateTimePicker
                    value={hmStringToDate(findEnd)}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    themeVariant="dark"
                    onChange={onEndTimeChange}
                  />
                ) : null}
              </View>

              {/* iOS: spinner-style picker inside a bottom-sheet modal. */}
              <Modal
                visible={showStartTimePicker && Platform.OS === "ios"}
                transparent
                animationType="slide"
                onRequestClose={() => setShowStartTimePicker(false)}
              >
                <View style={styles.findDateModalRoot}>
                  <Pressable
                    style={styles.findDateModalTouchOut}
                    onPress={() => setShowStartTimePicker(false)}
                  />
                  <View style={styles.findDateModalSheet}>
                    <View style={styles.findDateModalHeader}>
                      <Pressable
                        onPress={() => setShowStartTimePicker(false)}
                        hitSlop={12}
                      >
                        <Text style={styles.findDateModalDone}>Done</Text>
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={hmStringToDate(findStart)}
                      mode="time"
                      is24Hour={false}
                      display="spinner"
                      themeVariant="dark"
                      onChange={onStartTimeChange}
                    />
                  </View>
                </View>
              </Modal>
              <Modal
                visible={showEndTimePicker && Platform.OS === "ios"}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEndTimePicker(false)}
              >
                <View style={styles.findDateModalRoot}>
                  <Pressable
                    style={styles.findDateModalTouchOut}
                    onPress={() => setShowEndTimePicker(false)}
                  />
                  <View style={styles.findDateModalSheet}>
                    <View style={styles.findDateModalHeader}>
                      <Pressable
                        onPress={() => setShowEndTimePicker(false)}
                        hitSlop={12}
                      >
                        <Text style={styles.findDateModalDone}>Done</Text>
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={hmStringToDate(findEnd)}
                      mode="time"
                      is24Hour={false}
                      display="spinner"
                      themeVariant="dark"
                      onChange={onEndTimeChange}
                    />
                  </View>
                </View>
              </Modal>

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
                    onChangeText={(v) => {
                      const d = v.replace(/\D/g, "");
                      setFindPhone(d.length > 10 ? d.slice(-10) : d);
                    }}
                    keyboardType="number-pad"
                    placeholder="Enter your mobile..."
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={styles.phoneInput}
                  />
                </View>
                <Text style={styles.phoneHintText}>
                  We match exactly on this number's last 10 digits.
                </Text>
              </View>

              <Pressable
                style={[styles.findCta, isFindingGame && styles.findCtaDisabled]}
                onPress={runFindGame}
                disabled={isFindingGame}
              >
                <PlayIcon color="#fff" size={18} />
                <Text style={styles.findCtaText}>
                  {isFindingGame ? "Finding..." : "Find My Game"}
                </Text>
              </Pressable>
              {isFindingGame ? <FindSearchingIndicator /> : null}

              {findMatches !== null ? (
                <View style={styles.findResults}>
                  <Text style={styles.findResultsTitle}>
                    {findMatches.length === 0
                      ? "No matches for those details. Try widening the time or double-check the phone number."
                      : `${findMatches.length} match${findMatches.length === 1 ? "" : "es"} — tap the one that's yours to add it to My Recordings.`}
                  </Text>
                  {findMatches.map((r: any) => {
                    const rid = String(r?.id ?? "");
                    const title = r?.turf?.name ?? r?.name ?? "Recording";
                    const when = formatRecordingListWhen(r?.startTime);
                    const isClaimed =
                      claimedIds.has(rid) || alreadyInLibraryIds.has(rid);
                    const isClaiming = claimingId === rid;
                    return (
                      <View key={rid || String(Math.random())} style={styles.findResultRow}>
                        <Text style={styles.findResultName} numberOfLines={2}>
                          {title}
                        </Text>
                        <Text style={styles.findResultWhen}>{when}</Text>
                        {rid ? (
                          <FindMatchPreviewPlayer recordingId={rid} recording={r} />
                        ) : null}
                        <Pressable
                          style={[
                            styles.findResultClaimBtn,
                            (isClaimed || isClaiming) &&
                              styles.findResultClaimBtnDisabled,
                          ]}
                          onPress={() => claimMatch(rid)}
                          disabled={
                            !rid || isClaimed || isClaiming || claimingId !== null
                          }
                          accessibilityRole="button"
                          accessibilityLabel={
                            isClaimed
                              ? "Already in My Recordings"
                              : "Add this recording to My Recordings"
                          }
                        >
                          <MaterialCommunityIcons
                            name={isClaimed ? "check-circle" : "plus-circle-outline"}
                            size={16}
                            color={isClaimed ? "#fff" : ACCENT}
                          />
                          <Text
                            style={[
                              styles.findResultClaimText,
                              isClaimed && styles.findResultClaimTextOn,
                            ]}
                          >
                            {isClaimed
                              ? "Added"
                              : isClaiming
                                ? "Adding…"
                                : "This is my recording"}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>

        </KeyboardAvoidingView>

        {/* People list bottom-sheet — shown when an info pill is tapped on a
         *  Shared / Shared-By card. Lists names and phone numbers. */}
        <Modal
          visible={peopleModal !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setPeopleModal(null)}
        >
          <Pressable
            style={styles.peopleModalRoot}
            onPress={() => setPeopleModal(null)}
          >
            <Pressable
              style={styles.peopleModalSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.peopleModalHeader}>
                <Text style={styles.peopleModalTitle}>
                  {peopleModal?.label ?? "People"}
                </Text>
                <Pressable
                  onPress={() => setPeopleModal(null)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Text style={styles.peopleModalDone}>Done</Text>
                </Pressable>
              </View>
              {peopleModal?.people.length === 0 ? (
                <Text style={styles.peopleModalEmpty}>
                  No additional details available.
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {peopleModal?.people.map((p, i) => (
                    <View key={`${p.name}-${i}`} style={styles.peopleRow}>
                      <View style={styles.peopleAvatar}>
                        <Text style={styles.peopleAvatarText}>
                          {(p.name || "?").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.peopleName} numberOfLines={1}>
                          {p.name || "Unknown"}
                        </Text>
                        {p.phone ? (
                          <Text style={styles.peoplePhone} numberOfLines={1}>
                            {p.phone}
                          </Text>
                        ) : (
                          <Text style={styles.peoplePhoneMuted}>
                            Phone unavailable
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={claimSuccessModal !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setClaimSuccessModal(null)}
        >
          <Pressable
            style={styles.claimSuccessModalRoot}
            onPress={() => setClaimSuccessModal(null)}
          >
            <Pressable
              style={styles.claimSuccessModalCard}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.claimSuccessIconWrap}>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={28}
                  color={ACCENT}
                />
              </View>
              <Text style={styles.claimSuccessTitle}>Added to My Recordings</Text>
              <Text style={styles.claimSuccessSubtitle} numberOfLines={2}>
                {claimSuccessModal?.title ?? "Recording"}
                {claimSuccessModal?.when ? `\n${claimSuccessModal.when}` : ""}
              </Text>
              <Pressable
                style={styles.claimSuccessPrimaryBtn}
                onPress={() => {
                  setClaimSuccessModal(null);
                  setTab("my");
                }}
              >
                <Text style={styles.claimSuccessPrimaryBtnText}>
                  Go to My Recordings
                </Text>
              </Pressable>
              <Pressable
                style={styles.claimSuccessSecondaryBtn}
                onPress={() => setClaimSuccessModal(null)}
              >
                <Text style={styles.claimSuccessSecondaryBtnText}>Stay Here</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

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
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 11,
  },
  thumbLockStateLocked: {
    backgroundColor: "rgba(127,29,29,0.78)", // dark red wash so the red lock pops
    borderColor: "rgba(248,113,113,0.65)",
  },
  thumbLockStateUnlocked: {
    backgroundColor: "rgba(20,83,45,0.78)", // dark green wash so the green open lock pops
    borderColor: "rgba(34,197,94,0.65)",
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
  sharedPillTappable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.32)",
    backgroundColor: "rgba(30, 53, 33, 0.92)",
  },
  /* People bottom-sheet */
  peopleModalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  peopleModalSheet: {
    backgroundColor: "#0b1f17",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1.5,
    borderColor: "rgba(34,197,94,0.32)",
  },
  peopleModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  peopleModalTitle: {
    fontFamily: FF.bold,
    fontSize: 18,
    color: "#fff",
  },
  peopleModalDone: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    color: ACCENT,
  },
  peopleModalEmpty: {
    fontFamily: FF.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    paddingVertical: 20,
  },
  peopleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(34,197,94,0.06)",
  },
  peopleAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(34,197,94,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  peopleAvatarText: {
    fontFamily: FF.bold,
    fontSize: 16,
    color: ACCENT,
  },
  peopleName: {
    fontFamily: FF.semiBold,
    fontSize: 15,
    color: "#fff",
  },
  peoplePhone: {
    fontFamily: FF.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  peoplePhoneMuted: {
    fontFamily: FF.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
    fontStyle: "italic",
  },
  claimSuccessModalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.58)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  claimSuccessModalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.28)",
    backgroundColor: "rgba(2,6,23,0.98)",
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: "center",
  },
  claimSuccessIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.42)",
    backgroundColor: "rgba(34,197,94,0.1)",
    marginBottom: 12,
  },
  claimSuccessTitle: {
    fontFamily: FF.bold,
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
  },
  claimSuccessSubtitle: {
    marginTop: 8,
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
  },
  claimSuccessPrimaryBtn: {
    marginTop: 16,
    width: "100%",
    borderRadius: 999,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
  },
  claimSuccessPrimaryBtnText: {
    fontFamily: FF.bold,
    fontSize: 14,
    color: "#fff",
  },
  claimSuccessSecondaryBtn: {
    marginTop: 8,
    width: "100%",
    borderRadius: 999,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(15,23,42,0.85)",
  },
  claimSuccessSecondaryBtnText: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: "rgba(255,255,255,0.86)",
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
  findCtaDisabled: {
    opacity: 0.7,
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
  findResultCourt: {
    marginTop: 2,
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: ACCENT,
  },
  findResultWhen: {
    marginTop: 4,
    fontFamily: FF.regular,
    fontSize: 13,
    color: MUTED,
  },
  findPreviewWrap: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
    backgroundColor: "rgba(2,6,23,0.8)",
  },
  findPreviewVideo: {
    width: "100%",
    height: 190,
    backgroundColor: "#000",
  },
  findPreviewLoading: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(2,6,23,0.72)",
  },
  findPreviewLoadingText: {
    color: "#fff",
    fontFamily: FF.medium,
    fontSize: 11,
  },
  findPreviewHint: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "rgba(255,255,255,0.75)",
    fontFamily: FF.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  findPreviewUnavailable: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.24)",
    backgroundColor: "rgba(2,6,23,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  findPreviewUnavailableText: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: FF.regular,
    fontSize: 12,
  },
  findResultClaimBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.5)",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  findResultClaimBtnDisabled: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
    opacity: 0.95,
  },
  findResultClaimText: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    letterSpacing: 0.3,
    color: ACCENT,
  },
  findResultClaimTextOn: {
    color: "#fff",
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
  phoneHintText: {
    marginTop: 8,
    fontFamily: FF.regular,
    fontSize: 11,
    color: "rgba(255,255,255,0.58)",
  },
  findSearchingWrap: {
    marginTop: 10,
    alignSelf: "center",
    width: "100%",
    maxWidth: 370,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.24)",
    backgroundColor: "rgba(8,20,15,0.82)",
    minHeight: 42,
    paddingHorizontal: 12,
  },
  findSearchingText: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },
});

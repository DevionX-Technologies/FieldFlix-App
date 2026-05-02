import { Paths } from "@/data/paths";
import {
  getMyRecordings,
  getNotifications,
  getPublicFlickShorts,
  getTurfsPage,
} from "@/lib/fieldflix-api";
import { BG } from "@/screens/fieldflix/bundledBackgrounds";
import { FF } from "@/screens/fieldflix/fonts";
import { WEB } from "@/screens/fieldflix/webDesign";
import { WebShell } from "@/screens/fieldflix/WebShell";
import { getUnreadApiNotificationCount } from "@/utils/localNotificationReadStore";
import { writePreferredHomeSport, readPreferredHomeSport } from "@/utils/homeSportPreference";
import {
  formatRecordingTimeLabel,
  highlightCountFromRecording,
  recordingDurationLabel,
  recordingThumbUrl,
} from "@/utils/recordingDisplay";
import {
  coerceSportsSupported,
  homeSportToApiEnum,
  summarizeTurfSportsLine,
  turfSupportsHomeSport,
  type HomeSportKey,
} from "@/utils/turfSports";
import { venueImageForTurfName } from "@/utils/venueArenaImages";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import {
  FIELD_FLIX_BOTTOM_NAV_SPACE,
  FieldflixBottomNav,
} from "@/screens/fieldflix/BottomNav";
import { useIsAdminRole } from "@/hooks/useIsAdminRole";

const LOGO = require("@/assets/fieldflix-web/fieldflix_logo.png");
const CAM_BTN = require("@/assets/fieldflix-web/cam-button.png");
/** Static promos (3) until the API supplies Coming Soon assets. */
const COMING_SOON_CAROUSEL_IMAGES = [
  require("@/assets/fieldflix-web/coming-soon/coming-soon-auto-highlight.png"),
  require("@/assets/fieldflix-web/coming-soon/coming-soon-2.png"),
  require("@/assets/fieldflix-web/coming-soon/coming-soon-3.png"),
] as const;
const COMING_SOON_CARD_HEIGHT = 158;
const EXPLICIT_VENUE_IMAGE_BY_NAME: Record<string, ImageSourcePropType> = {
  "tsg sports arena": BG.homeHero,
  "play sport andheri": BG.sessionCard,
  "playsport andheri": BG.sessionCard,
  "playsports andheri": BG.sessionCard,
  "play sport": BG.sessionCard,
  playsport: BG.sessionCard,
  "fieldflix arena": BG.arena,
};

type TurfRow = {
  id: string;
  name?: string;
  city?: string;
  address_line?: string;
  hourly_rate?: string | number;
  sports_supported?: unknown;
  /** PostGIS / GeoJSON `Point` from API */
  geo_location?: unknown;
};

type ArenaRow = {
  id: string;
  name: string;
  location: string;
  status: string;
  imageSource: ImageSourcePropType;
  /** FieldFlix sports from `turf.sports_supported` (Pickleball / Padel / Cricket). */
  sportsLine: string | null;
};

type RecentRow = {
  id: string;
  recordingId: string;
  arenaName: string;
  location: string;
  timeLabel: string;
  thumbTime: string;
  thumbUrl: string | null;
  duration: string;
  score: number;
};

function extractTurfLngLat(geo: unknown): { lat: number; lng: number } | null {
  if (!geo || typeof geo !== "object") return null;
  const g = geo as { type?: string; coordinates?: number[] };
  if (
    g.type === "Point" &&
    Array.isArray(g.coordinates) &&
    g.coordinates.length >= 2
  ) {
    const lng = Number(g.coordinates[0]);
    const lat = Number(g.coordinates[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

function compactOneLine(s: string): string {
  return String(s).replace(/\s+/g, " ").trim();
}

/** When `city` is null, derive area from turf name (`| Goregaon East`, double-spaced locality, etc.). */
function inferLocationFromTurfName(arenaName: string): string {
  const n = compactOneLine(arenaName);
  if (!n) return "";
  const pipeParts = n.split("|").map((p) => compactOneLine(p));
  if (pipeParts.length >= 2) {
    const tail = pipeParts[pipeParts.length - 1];
    if (tail.length >= 2) return tail;
  }
  const doubleGap = n.match(/\s{2,}([^|]+)$/);
  if (doubleGap?.[1]) return compactOneLine(doubleGap[1]);
  return "";
}

function turfRowLocationLabel(t: TurfRow): string {
  const fromFields = compactOneLine((t.city ?? t.address_line ?? "").split(",")[0] ?? "");
  if (fromFields) return fromFields;
  return inferLocationFromTurfName(t.name ?? "") || "—";
}

/** Fold duplicate turf rows (one per camera/QR UUID) into a single homepage card per venue label. */
function canonicalVenueKey(name?: string): string {
  return compactOneLine(String(name ?? ""))
    .toLowerCase()
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function turfRowQualityScore(t: TurfRow): number {
  let s = 0;
  if (compactOneLine(t.city ?? "")) s += 2;
  if (compactOneLine(t.address_line ?? "")) s += 1;
  if (extractTurfLngLat(t.geo_location)) s += 3;
  return s;
}

function mergeTurfDuplicatesBucket(bucket: TurfRow[]): TurfRow {
  if (bucket.length === 1) return bucket[0];
  const sorted = [...bucket].sort((a, b) => turfRowQualityScore(b) - turfRowQualityScore(a));
  const base = sorted[0];
  const bestName =
    [...bucket]
      .map((b) => compactOneLine(b.name ?? ""))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)[0] ?? base.name;
  const uniq = new Set<string>();
  for (const row of bucket) {
    for (const x of coerceSportsSupported(row.sports_supported)) {
      uniq.add(String(x));
    }
  }
  const mergedSports = [...uniq];
  const withGeo =
    bucket.find((x) => extractTurfLngLat(x.geo_location)) ?? base;
  return {
    ...base,
    id: base.id,
    name: bestName || base.name,
    city:
      compactOneLine(base.city ?? "") ? base.city :
        bucket.map((x) => x.city).find((c) => compactOneLine(c ?? "")) ?? base.city,
    address_line:
      compactOneLine(base.address_line ?? "") ? base.address_line :
        bucket.map((x) => x.address_line).find((a) => compactOneLine(a ?? "")) ?? base.address_line,
    sports_supported: mergedSports.length ? mergedSports : base.sports_supported,
    geo_location: withGeo.geo_location ?? base.geo_location,
  };
}

function dedupeTurfsForHomeDisplay(rows: TurfRow[]): TurfRow[] {
  const groups = new Map<string, TurfRow[]>();
  for (const t of rows) {
    const k = canonicalVenueKey(t.name);
    const gk = k.length > 0 ? k : `id:${String(t.id)}`;
    groups.set(gk, [...(groups.get(gk) ?? []), t]);
  }
  return [...groups.values()].map((bucket) => mergeTurfDuplicatesBucket(bucket));
}

function mapTurfToArena(t: TurfRow, i: number): ArenaRow {
  const loc = turfRowLocationLabel(t);
  const arenaName = t.name ?? "Arena";
  const key = arenaName
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const namedImage: ImageSourcePropType | undefined =
    EXPLICIT_VENUE_IMAGE_BY_NAME[key];
  const venueAsset = venueImageForTurfName(arenaName);
  const fallbackPool: ImageSourcePropType[] = [BG.arena, BG.sessionCard, BG.homeHero];
  const hash = Array.from(key).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const imageSource =
    venueAsset ?? namedImage ?? fallbackPool[hash % fallbackPool.length];

  return {
    id: String(t.id ?? i),
    name: arenaName,
    location: loc,
    status: "Indoor • Available Now",
    imageSource,
    sportsLine: summarizeTurfSportsLine(t.sports_supported),
  };
}

function mapRecordingToRecent(
  s: any,
  idx: number,
  extraHighlights = 0,
): RecentRow {
  const recordingId = String(s?.id ?? idx);
  const raw = s?.startTime ?? s?.endTime ?? s?.created_at;
  const d = raw ? new Date(String(raw)) : null;
  const valid = d != null && !Number.isNaN(d.getTime());

  const duration = recordingDurationLabel(s);
  const timeLabel = valid ? formatRecordingTimeLabel(d!) : "";
  const score = highlightCountFromRecording(s) + Math.max(0, extraHighlights);

  return {
    id: recordingId,
    recordingId,
    arenaName: s?.turf?.name ?? s?.recording_name ?? s?.name ?? "Session",
    location: s?.turf?.city ?? s?.turf?.address_line ?? s?.turf?.location ?? "",
    timeLabel,
    thumbTime: duration,
    thumbUrl: recordingThumbUrl(s, 6),
    duration,
    score,
  };
}

/** Mirrors `web/src/screens/HomeScreen.tsx` — header, hero, sport tiles, arenas,
 *  recent sessions, auto-highlight banner, plus fixed bottom nav. */
export default function FieldflixHomeScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const sidePad = 16;
  const sportsPad = sidePad;
  const sportsGap = 8;
  const sportBoxSize = Math.min(
    120,
    Math.max(88, Math.floor((windowWidth - sportsPad * 2 - sportsGap * 2) / 3)),
  );
  const sportIconMain = Math.min(48, Math.round(sportBoxSize * 0.4));

  const router = useRouter();
  const { isAdmin } = useIsAdminRole();
  const [sport, setSport] = useState<HomeSportKey>("pickleball");
  const [turfs, setTurfs] = useState<TurfRow[]>([]);
  const [sessions, setSessions] = useState<unknown[]>([]);
  const [shortsPerRecording, setShortsPerRecording] = useState<
    Record<string, number>
  >({});
  const [notifCount, setNotifCount] = useState(0);
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationLabel, setLocationLabel] = useState("Locating…");
  const [turfsLoading, setTurfsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status: existing } =
          await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        let status = existing;
        if (status === "undetermined") {
          const r = await Location.requestForegroundPermissionsAsync();
          status = r.status;
        }
        if (cancelled) return;
        if (status !== "granted") {
          setLocationLabel("Location access denied");
          setUserCoords(null);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;
        setUserCoords({ latitude, longitude });
        const places = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (cancelled) return;
        const p = places[0];
        if (p) {
          const city = p.city || p.subregion || p.district || "";
          const country = p.country || "";
          const line = [city, country].filter(Boolean).join(", ");
          setLocationLabel(
            line || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
          );
        } else {
          setLocationLabel(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        }
      } catch {
        if (!cancelled) {
          setLocationLabel("Location unavailable");
          setUserCoords(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void readPreferredHomeSport().then((p) => {
      if (p) setSport(p);
    });
  }, []);

  const setSportPersisted = useCallback((next: HomeSportKey) => {
    setSport(next);
    void writePreferredHomeSport(next);
  }, []);

  const load = useCallback(async () => {
    setTurfsLoading(true);
    try {
      const sportEnum = homeSportToApiEnum(sport);
      const [turfRes, recRes, n, flickList] = await Promise.all([
        getTurfsPage(1, 24, {
          sports_supported: sportEnum,
          ...(userCoords
            ? {
              latitude: userCoords.latitude,
              longitude: userCoords.longitude,
              radiusKm: 100,
            }
            : {}),
        }),
        getMyRecordings(),
        getNotifications(1, 50).catch(() => []),
        getPublicFlickShorts(undefined).catch(() => []),
      ]);
      const items = Array.isArray(turfRes)
        ? turfRes
        : turfRes?.items && Array.isArray(turfRes.items)
          ? turfRes.items
          : [];
      const rawList = items as TurfRow[];
      const filtered = rawList.filter((t) =>
        turfSupportsHomeSport(t.sports_supported, sport),
      );
      const deduped = dedupeTurfsForHomeDisplay(filtered).sort((a, b) =>
        String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, {
          sensitivity: "base",
        }),
      );
      setTurfs(deduped);
      setSessions(Array.isArray(recRes) ? recRes.slice(0, 6) : []);
      const tally: Record<string, number> = {};
      for (const fs of Array.isArray(flickList) ? flickList : []) {
        const rid = String((fs as { recordingId?: string }).recordingId ?? "");
        if (!rid) continue;
        tally[rid] = (tally[rid] ?? 0) + 1;
      }
      setShortsPerRecording(tally);
      const unread = await getUnreadApiNotificationCount(
        (Array.isArray(n) ? n : []).map((e: Record<string, unknown>) => ({
          id: e?.id as string | number | null | undefined,
          created_at:
            typeof e?.created_at === "string" ? e.created_at : undefined,
          title: typeof e?.title === "string" ? e.title : undefined,
          body: typeof e?.body === "string" ? e.body : undefined,
        })),
      );
      setNotifCount(unread);
    } catch {
      setTurfs([]);
      setSessions([]);
      setShortsPerRecording({});
    } finally {
      setTurfsLoading(false);
    }
  }, [sport, userCoords]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefreshHome = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const arenaRows: ArenaRow[] = useMemo(
    () => turfs.map((t, i) => mapTurfToArena(t, i)),
    [turfs],
  );

  const homeSportLabel =
    sport === "pickleball"
      ? "Pickleball"
      : sport === "padel"
        ? "Padel"
        : "Cricket";

  const recentRows: RecentRow[] = useMemo(
    () =>
      (sessions as any[]).map((s, i) =>
        mapRecordingToRecent(
          s,
          i,
          shortsPerRecording[String((s as { id?: string })?.id ?? "")] ?? 0,
        ),
      ),
    [sessions, shortsPerRecording],
  );

  const navReserve = FIELD_FLIX_BOTTOM_NAV_SPACE;

  const bannerSidePad = sidePad;
  const comingSoonGap = 12;
  /** Floor so slide + separators never exceed screen due to fractional layout px. */
  const carouselW = Math.max(0, Math.floor(windowWidth - bannerSidePad * 2));
  const [comingSoonIndex, setComingSoonIndex] = useState(0);

  const comingSoonSlides = useMemo(
    () =>
      COMING_SOON_CAROUSEL_IMAGES.map((source, index) => ({
        id: `coming-soon-${index}`,
        source,
      })),
    [],
  );

  const slideW = carouselW + comingSoonGap;
  /** Cap height on narrow screens so vertical layout stays balanced. */
  const comingSoonTileHeight = Math.min(
    COMING_SOON_CARD_HEIGHT,
    Math.max(132, Math.floor(carouselW * 0.44)),
  );

  const syncComingSoonIndex = useCallback(
    (offsetX: number) => {
      if (slideW <= 0) return;
      const i = Math.round(offsetX / slideW);
      setComingSoonIndex(Math.min(comingSoonSlides.length - 1, Math.max(0, i)));
    },
    [slideW, comingSoonSlides.length],
  );

  const onComingSoonScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) =>
      syncComingSoonIndex(e.nativeEvent.contentOffset.x),
    [syncComingSoonIndex],
  );

  const onComingSoonScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) =>
      syncComingSoonIndex(e.nativeEvent.contentOffset.x),
    [syncComingSoonIndex],
  );

  return (
    <WebShell backgroundColor={WEB.homeBg}>
      <View style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoWrap}>
              <Image source={LOGO} style={styles.logoImg} />
            </View>
            <View style={styles.locationCol}>
              <Text style={styles.locationKicker}>Your Location</Text>
              <Text
                style={styles.locationValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                {locationLabel}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {isAdmin ? (
              <Pressable
                onPress={() => router.push(Paths.admin)}
                style={styles.iconBtn}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="shield-crown-outline"
                  size={23}
                  color={WEB.white}
                />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => router.push(Paths.notifications)}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={24}
                color={WEB.white}
              />
              {notifCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {notifCount > 9 ? "9+" : notifCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => router.push(Paths.profile)}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="account-outline"
                size={24}
                color={WEB.white}
              />
            </Pressable>
          </View>
        </View>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: navReserve + 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefreshHome}
              tintColor={WEB.green}
              colors={[WEB.green]}
              progressBackgroundColor="#0B1220"
            />
          }
        >
          <View style={styles.heroWrap}>
            <View style={styles.heroCard}>
              <ExpoImage
                source={BG.homeHero}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                contentPosition={{ top: "22%", left: "50%" }}
              />
              <LinearGradient
                colors={[
                  "rgba(0,0,0,0.56)",
                  "rgba(0,0,0,0.2)",
                  "rgba(0,0,0,0.72)",
                ]}
                locations={[0, 0.46, 1]}
                style={StyleSheet.absoluteFillObject}
              />
              {/* Left band: anchors headline + description on one readable tone */}
              <LinearGradient
                colors={[
                  "rgba(255,255,255,0.18)",
                  "rgba(255,255,255,0.09)",
                  "rgba(255,255,255,0.03)",
                  "transparent",
                ]}
                locations={[0, 0.28, 0.58, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
              <View style={styles.heroTextBlock}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>Smart Capture</Text>
                </View>
                <Text style={styles.heroKicker}>Elevate Your</Text>
                <Text style={styles.heroTitle}>
                  Game <Text style={styles.heroTitleAccent}>Today</Text>
                </Text>
                <Text style={styles.heroDesc}>
                  Capture your best moments and track your improvement over time
                </Text>
              </View>
              <View style={styles.heroCtaWrap}>
                <Pressable
                  onPress={() => router.push(Paths.scan)}
                  style={styles.ctaPill}
                >
                  <Image source={CAM_BTN} style={styles.ctaCam} />
                  <View style={styles.ctaTextCol}>
                    <Text style={styles.ctaTitle}>Start Recording</Text>
                    <Text style={styles.ctaSub}>Tap to capture your game</Text>
                  </View>
                  <View style={styles.ctaChevron}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M9 5l7 7-7 7"
                        stroke="rgba(4,52,43,0.96)"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.sportsRowWrap}>
            <View style={styles.sportsHead}>
              <View style={styles.sportsHeadLeft}>
                <View style={styles.sportsAccent} />
                <Text style={styles.sportsTitle}>Choose Your Sport</Text>
              </View>
              {/* <Pressable hitSlop={8}>
                <Text style={styles.sportsViewAll}>View all ›</Text>
              </Pressable> */}
            </View>
            <View
              style={[
                styles.sportsRow,
                { paddingHorizontal: sportsPad, gap: sportsGap },
              ]}
            >
              <SportCard
                size={sportBoxSize}
                label="Pickleball"
                selected={sport === "pickleball"}
                onPress={() => setSportPersisted("pickleball")}
                status="Active"
                icon={
                  <MaterialCommunityIcons
                    name="racquetball"
                    size={Math.round(sportIconMain * 0.78)}
                    color={WEB.green}
                  />
                }
              />
              <SportCard
                size={sportBoxSize}
                label="Padel"
                selected={sport === "padel"}
                onPress={() => setSportPersisted("padel")}
                status="Active"
                icon={
                  <MaterialCommunityIcons
                    name="tennis-ball"
                    size={Math.round(sportIconMain * 0.78)}
                    color={WEB.green}
                  />
                }
              />
              <SportCard
                size={sportBoxSize}
                label="Cricket"
                selected={sport === "cricket"}
                onPress={() => setSportPersisted("cricket")}
                status="Active"
                icon={
                  <MaterialCommunityIcons
                    name="cricket"
                    size={Math.round(sportIconMain * 0.78)}
                    color={WEB.green}
                  />
                }
              />
            </View>
          </View>

          <View style={styles.venuesWrap}>
            <View style={styles.venuesHead}>
              <View style={styles.venuesHeadLeft}>
                <View style={styles.sportsAccent} />
                <View>
                  <Text style={styles.venuesTitle}>Nearby Venues</Text>
                  <Text style={styles.venuesSportHint}>{homeSportLabel}</Text>
                </View>
              </View>
              {/* <Pressable onPress={() => router.push(Paths.scan)} hitSlop={8}>
                <Text style={styles.venuesViewAll}>View all ›</Text>
              </Pressable> */}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.arenaRow}
              style={styles.arenaScroll}
            >
              {turfsLoading ? (
                <View style={styles.arenaLoading}>
                  <ActivityIndicator size="large" color="#22c55e" />
                </View>
              ) : arenaRows.length === 0 ? (
                <View style={styles.arenaEmptyWrap}>
                  <Text style={styles.arenaEmptyText}>
                    No arenas for this sport{userCoords ? " near you" : ""} yet.
                  </Text>
                </View>
              ) : (
                arenaRows.map((arena) => (
                  <Pressable
                    key={arena.id}
                    style={({ pressed }) => [
                      styles.arenaCard,
                      pressed && styles.arenaCardPressed,
                    ]}
                    onPress={() => router.push(Paths.scan)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open QR scan for ${arena.name}`}
                  >
                    <View style={styles.arenaImgWrap}>
                      <Image source={arena.imageSource} style={styles.arenaImg} />
                      <LinearGradient
                        colors={[
                          "rgba(2,6,23,0)",
                          "rgba(2,6,23,0.18)",
                          "rgba(2,6,23,0.7)",
                        ]}
                        locations={[0, 0.55, 1]}
                        style={styles.arenaImgOverlay}
                      />
                      <View style={[styles.arenaTagBase, styles.arenaTagOpen]}>
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={12}
                          color="#22C55E"
                        />
                        <Text style={styles.arenaTagText}>Open now</Text>
                      </View>
                      <View
                        style={[styles.arenaTagBase, styles.arenaTagSports]}
                      >
                        <MaterialCommunityIcons
                          name="trophy-variant-outline"
                          size={12}
                          color="#22C55E"
                        />
                        <Text style={styles.arenaTagText} numberOfLines={1}>
                          {arena.sportsLine ?? homeSportLabel}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.arenaBody}>
                      <View style={styles.arenaNameWrap}>
                        <Text style={styles.arenaName}>{arena.name}</Text>
                      </View>
                      <View style={styles.arenaMetaRow}>
                        <MaterialCommunityIcons
                          name="map-marker"
                          size={14}
                          color="#94a3b8"
                        />
                        <Text
                          style={[styles.arenaMetaText, styles.arenaMetaGrow]}
                          numberOfLines={1}
                        >
                          {arena.location}
                        </Text>
                        <Text style={styles.arenaMetaSep}>•</Text>
                        <Text style={styles.arenaStatusInline} numberOfLines={1}>
                          {arena.status}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>

          <View style={styles.recentWrap}>
            <View style={styles.recentHead}>
              <View style={styles.recentHeadLeft}>
                <View style={styles.sportsAccent} />
                <Text style={styles.recentTitle}>Recent Sessions</Text>
              </View>
              <Pressable
                onPress={() => router.push(Paths.sessions)}
                hitSlop={8}
              >
                <Text style={styles.recentViewAll}>View all ›</Text>
              </Pressable>
            </View>

            <View style={styles.recentList}>
              {recentRows.length === 0 ? (
                <Text style={styles.recentEmpty}>
                  No sessions yet. Start a recording to see your games here.
                </Text>
              ) : (
                recentRows.map((session) => (
                  <Pressable
                    key={session.id}
                    style={styles.recentCard}
                    onPress={() =>
                      router.push({
                        pathname: Paths.highlights,
                        params: { id: session.recordingId },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${session.arenaName} highlights`}
                  >
                    <View style={styles.recentThumb}>
                      <ExpoImage
                        source={
                          session.thumbUrl
                            ? { uri: session.thumbUrl }
                            : BG.homeHero
                        }
                        style={StyleSheet.absoluteFillObject}
                        contentFit="cover"
                        contentPosition={{ top: "22%", left: "50%" }}
                      />
                      <View style={styles.recentThumbTag}>
                        <Text style={styles.recentThumbText}>
                          {session.thumbTime}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.recentMeta}>
                      <Text style={styles.recentArena} numberOfLines={1}>
                        {session.arenaName}
                      </Text>
                      <View style={styles.recentRow}>
                        <MaterialCommunityIcons
                          name="map-marker"
                          size={14}
                          color="#22C55E"
                        />
                        <Text style={styles.recentRowText} numberOfLines={1}>
                          {session.location || "—"}
                        </Text>
                      </View>
                      <View style={styles.recentRow}>
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={14}
                          color="#22C55E"
                        />
                        <Text style={styles.recentRowText} numberOfLines={1}>
                          {session.timeLabel}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.recentScore}>
                      <MaterialCommunityIcons
                        name="trophy"
                        size={16}
                        color="#22C55E"
                      />
                      <Text style={styles.recentScoreText}>
                        {session.score}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </View>

          <View style={styles.bannerSection}>
            <View style={styles.bannerHead}>
              <View style={styles.venuesHeadLeft}>
                <View style={styles.sportsAccent} />
                <Text style={styles.venuesTitle}>Coming Soon</Text>
              </View>
            </View>
            <View style={styles.bannerWrap}>
              <FlatList
                data={comingSoonSlides}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled={false}
                snapToAlignment="start"
                decelerationRate="fast"
                snapToInterval={slideW}
                initialNumToRender={COMING_SOON_CAROUSEL_IMAGES.length}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() =>
                  carouselW <= 0 ? null : (
                    <View style={{ width: comingSoonGap }} />
                  )
                }
                style={[styles.bannerFlatList, { maxWidth: carouselW }]}
                contentContainerStyle={styles.bannerFlatListContent}
                onScroll={onComingSoonScroll}
                scrollEventThrottle={16}
                onMomentumScrollEnd={onComingSoonScrollEnd}
                renderItem={({ item, index }) =>
                  carouselW <= 0 ? null : (
                    <View
                      style={[styles.bannerSlideShadow, { width: carouselW }]}
                      accessibilityRole="image"
                      accessibilityLabel={`Coming soon promotion ${index + 1} of ${comingSoonSlides.length}`}
                    >
                      <View style={styles.bannerSlideClip}>
                        <ExpoImage
                          source={item.source}
                          style={[
                            styles.bannerSlideImage,
                            { height: comingSoonTileHeight },
                          ]}
                          contentFit="cover"
                          contentPosition={
                            index === 0
                              ? "top"
                              : index === 1
                                ? /* Nearer top anchor → less top crop, more bottom crop vs center */
                                  { top: "26%", left: "50%" }
                                : "center"
                          }
                          transition={220}
                          cachePolicy="memory-disk"
                        />
                      </View>
                    </View>
                  )
                }
              />
              <View style={styles.bannerDotsRowOuter}>
                <View style={styles.bannerDotsPill}>
                  <View style={styles.bannerDotsRow}>
                    {comingSoonSlides.map((_, dotI) => (
                      <View
                        key={`cs-dot-${dotI}`}
                        style={
                          dotI === comingSoonIndex
                            ? styles.bannerDotActive
                            : styles.bannerDotInactive
                        }
                      />
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <FieldflixBottomNav active="home" />
      </View>
    </WebShell>
  );
}

function SportCard({
  size,
  label,
  selected,
  onPress,
  icon,
  status,
  comingSoon,
}: {
  size: number;
  label: string;
  selected: boolean;
  onPress: () => void;
  icon: ReactNode;
  status?: string;
  comingSoon?: boolean;
}) {
  const selectedActive = selected && !comingSoon;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sportCard,
        {
          width: size,
          height: size,
          borderRadius: Math.max(18, Math.round(size * 0.19)),
        },
        {
          backgroundColor: selectedActive
            ? "#0a1510"
            : "rgba(255,255,255,0.06)",
        },
        selectedActive ? styles.sportCardSelected : undefined,
      ]}
    >
      <View style={styles.sportIconWrap}>{icon}</View>
      <View style={styles.sportLabelRow}>
        <Text style={[styles.sportLabel, comingSoon && styles.sportLabelMuted]}>
          {label}
        </Text>
      </View>
      <View style={styles.sportStatusRow}>
        {comingSoon ? null : <View style={styles.sportActiveDot} />}
        <Text
          style={[
            styles.sportStatusText,
            comingSoon ? styles.sportStatusSoon : styles.sportStatusActive,
          ]}
        >
          {comingSoon ? "Coming soon" : (status ?? "Active")}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(34,197,94,0.35)",
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    backgroundColor: WEB.navBarBg,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logoWrap: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: { width: 60, height: 60, resizeMode: "contain" },
  locationCol: { flex: 1, minWidth: 0 },
  locationKicker: {
    fontFamily: FF.medium,
    fontSize: 12,
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.5)",
  },
  locationValue: {
    marginTop: 2,
    fontFamily: FF.bold,
    fontSize: 15,
    lineHeight: 20,
    color: WEB.white,
    letterSpacing: -0.25,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  badge: {
    position: "absolute",
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    borderWidth: 1,
    borderColor: "#0B1220",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: FF.bold,
    fontSize: 10,
    color: "#fff",
    textAlign: "center",
  },

  heroWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  heroCard: {
    height: 320,
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#071018",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
    marginTop: 15,
  },
  heroTextBlock: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
  },
  heroBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(167,243,208,0.42)",
    backgroundColor: "rgba(2,6,23,0.52)",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  heroBadgeText: {
    fontFamily: FF.semiBold,
    fontSize: 9,
    color: "#BBF7D0",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroKicker: {
    marginTop: 13,
    fontFamily: FF.medium,
    fontSize: 16,
    color: "rgba(241,245,249,0.95)",
    lineHeight: 21,
    letterSpacing: -0.15,
  },
  heroTitle: {
    marginTop: 1,
    fontFamily: FF.extraBold,
    fontSize: 38,
    lineHeight: 41,
    letterSpacing: -0.9,
    color: "#F8FAFC",
    textShadowColor: "rgba(2,6,23,0.68)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  heroTitleAccent: {
    color: WEB.green,
    fontFamily: FF.extraBold,
    textShadowColor: "rgba(6,78,59,0.48)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 9,
  },
  heroDesc: {
    marginTop: 11,
    maxWidth: 314,
    fontFamily: FF.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.05,
    color: "rgba(226,232,240,0.94)",
  },
  heroCtaWrap: {
    position: "absolute",
    bottom: 16,
    left: 14,
    right: 14,
    alignItems: "center",
  },
  ctaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    maxWidth: 340,
    minHeight: 62,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaCam: {
    width: 46,
    height: 46,
    marginLeft: 2,
    resizeMode: "contain",
  },
  ctaTextCol: { flex: 1, minWidth: 0 },
  ctaTitle: {
    fontFamily: FF.bold,
    fontSize: 16,
    lineHeight: 20,
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  ctaSub: {
    marginTop: 1,
    fontFamily: FF.regular,
    fontSize: 12,
    lineHeight: 16,
    color: "#64748B",
  },
  ctaChevron: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  sportsRowWrap: {
    width: "100%",
    marginTop: 24,
    alignItems: "center",
  },
  sportsHead: {
    width: "100%",
    paddingHorizontal: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sportsHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sportsAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: "#22C55E",
  },
  sportsTitle: {
    fontFamily: FF.bold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: WEB.white,
  },
  sportsViewAll: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: "#22C55E",
    letterSpacing: 0.2,
  },
  sportsRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
  },
  sportCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    paddingTop: 8,
    paddingBottom: 10,
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  sportCardSelected: {
    borderWidth: 2.4,
    shadowColor: "#22c55e",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
    borderColor: "rgba(34,197,94,0.92)",
  },
  sportIconWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 4,
  },
  sportLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  sportLabel: {
    fontFamily: FF.bold,
    fontSize: 15,
    color: WEB.white,
  },
  sportLabelMuted: {
    color: "rgba(203,213,225,0.95)",
  },
  sportStatusRow: {
    minHeight: 22,
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  sportActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  sportStatusText: {
    fontFamily: FF.semiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  sportStatusActive: {
    color: "#22C55E",
  },
  sportStatusSoon: {
    color: "rgba(148,163,184,0.92)",
  },
  venuesWrap: {
    marginTop: 24,
  },
  venuesHead: {
    width: "100%",
    paddingHorizontal: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  venuesHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  venuesTitle: {
    fontFamily: FF.bold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: WEB.white,
  },
  venuesSportHint: {
    marginTop: 4,
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: "#86EFAC",
    letterSpacing: 0.2,
  },
  venuesViewAll: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: "#22C55E",
    letterSpacing: 0.2,
  },

  arenaScroll: {
    marginTop: 0,
  },
  arenaRow: {
    paddingHorizontal: 16,
    gap: 14,
    alignItems: "flex-start",
  },
  arenaLoading: {
    width: 280,
    minHeight: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  arenaEmptyWrap: {
    paddingVertical: 28,
    paddingHorizontal: 12,
    maxWidth: 320,
  },
  arenaEmptyText: {
    fontFamily: FF.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.65)",
  },
  arenaCard: {
    width: 280,
    flexShrink: 0,
    alignItems: "stretch",
    borderRadius: 20,
    borderWidth: 1.25,
    borderColor: "rgba(34,197,94,0.35)",
    backgroundColor: "#0A111A",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  arenaCardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  /** Fixed size image area — matches web `h-[140px] w-full` inside `w-[280px]` card (no full-bleed stretch). */
  arenaImgWrap: {
    width: 280,
    height: 140,
    overflow: "hidden",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  arenaImg: {
    width: 280,
    height: 140,
    resizeMode: "cover",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  arenaImgOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  arenaTagBase: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "78%",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(34,197,94,0.4)",
    backgroundColor: "rgba(2,6,23,0.74)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  arenaTagOpen: {
    top: 10,
    right: 10,
    maxWidth: "55%",
  },
  arenaTagSports: {
    bottom: 10,
    left: 10,
  },
  arenaTagText: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    color: "#86EFAC",
    letterSpacing: 0.2,
  },
  arenaBody: {
    width: "100%",
    maxWidth: 280,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 6,
    alignSelf: "stretch",
  },
  /** Bounds title width so long names wrap instead of one-line ellipsize/overflow. */
  arenaNameWrap: {
    width: "100%",
    maxWidth: 248,
    alignSelf: "stretch",
  },
  arenaName: {
    fontFamily: FF.bold,
    fontSize: 16,
    lineHeight: 22,
    color: WEB.white,
    width: "100%",
  },
  arenaMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "nowrap",
  },
  arenaMetaGrow: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  arenaMetaText: {
    fontFamily: FF.regular,
    fontSize: 12,
    color: "#94a3b8",
  },
  arenaMetaSep: {
    fontFamily: FF.regular,
    fontSize: 12,
    color: "#64748b",
  },
  arenaStatusInline: {
    fontFamily: FF.medium,
    fontSize: 12,
    color: "#94a3b8",
    flexShrink: 0,
  },

  recentWrap: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  recentHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  recentHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recentTitle: {
    fontFamily: FF.bold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: WEB.white,
  },
  recentViewAll: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: "#22C55E",
    letterSpacing: 0.2,
  },
  recentList: { gap: 14 },
  recentEmpty: {
    fontFamily: FF.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.55)",
    paddingVertical: 8,
  },
  recentCard: {
    flexDirection: "row",
    gap: 13,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.24)",
    backgroundColor: "rgba(11,18,27,0.96)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
    alignItems: "center",
  },
  recentThumb: {
    width: 104,
    height: 78,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.4)",
    overflow: "hidden",
    position: "relative",
  },
  recentThumbTag: {
    position: "absolute",
    left: 6,
    bottom: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(2,6,23,0.78)",
  },
  recentThumbText: {
    fontFamily: FF.semiBold,
    fontSize: 9.5,
    letterSpacing: 0.25,
    color: "#E2E8F0",
    fontVariant: ["tabular-nums"],
  },
  recentMeta: { flex: 1, minWidth: 0, justifyContent: "center", gap: 5 },
  recentArena: {
    fontFamily: FF.bold,
    fontSize: 14.5,
    lineHeight: 19,
    letterSpacing: -0.15,
    color: WEB.white,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  recentRowText: {
    flex: 1,
    fontFamily: FF.medium,
    fontSize: 11.5,
    lineHeight: 16,
    color: "rgba(203,213,225,0.86)",
  },
  recentScore: {
    alignSelf: "flex-start",
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minWidth: 56,
    justifyContent: "center",
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.45)",
    backgroundColor: "rgba(20,83,45,0.5)",
  },
  recentScoreText: {
    fontFamily: FF.bold,
    fontSize: 13.5,
    color: "#4ADE80",
    fontVariant: ["tabular-nums"],
  },

  bannerSection: {
    marginTop: 28,
  },
  bannerHead: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  bannerWrap: {
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  bannerFlatList: {
    width: "100%",
    flexGrow: 0,
  },
  bannerFlatListContent: {
    paddingVertical: 0,
  },
  bannerSlideShadow: {
    borderRadius: 20,
    backgroundColor: "transparent",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.38,
        shadowRadius: 14,
      },
      android: {
        elevation: 9,
      },
      default: {},
    }),
  },
  bannerSlideClip: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(8,22,17,0.96)",
  },
  bannerSlideImage: {
    width: "100%",
    maxWidth: "100%",
    alignSelf: "center",
  },
  bannerDotsRowOuter: {
    alignItems: "center",
    marginTop: 14,
    paddingHorizontal: 4,
  },
  bannerDotsPill: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(4,14,18,0.58)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  bannerDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  bannerDotActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  bannerDotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.38)",
  },
});

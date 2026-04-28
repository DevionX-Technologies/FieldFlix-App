import { Paths } from '@/data/paths';
import { getMyRecordings, getNotificationCount, getTurfsPage } from '@/lib/fieldflix-api';
import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import {
  formatRecordingTimeLabel,
  highlightCountFromRecording,
} from '@/utils/recordingDisplay';
import { WEB } from '@/screens/fieldflix/webDesign';
import { BG } from '@/screens/fieldflix/bundledBackgrounds';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image as ExpoImage } from 'expo-image';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { FieldflixBottomNav } from '@/screens/fieldflix/BottomNav';

const LOGO = require('@/assets/fieldflix-web/fieldflix_logo.png');
const NOTIF = require('@/assets/fieldflix-web/notification.png');
const PROFILE = require('@/assets/fieldflix-web/Profile icon.png');
const PICKLE = require('@/assets/fieldflix-web/pickleball.png');
const PADEL = require('@/assets/fieldflix-web/padel.png');
const COMING = require('@/assets/fieldflix-web/coming-soon.png');
const ACTIVITY = require('@/assets/fieldflix-web/Activity.png');
const AUTO_H = require('@/assets/fieldflix-web/autohiglhight.png');
const CAM_BTN = require('@/assets/fieldflix-web/cam-button.png');
const RECENT_SESSION_ICON = require('@/assets/fieldflix-web/recentsession.png');

type TurfRow = {
  id: string;
  name?: string;
  city?: string;
  address_line?: string;
  hourly_rate?: string | number;
  /** PostGIS / GeoJSON `Point` from API */
  geo_location?: unknown;
};

type ArenaRow = {
  id: string;
  name: string;
  location: string;
  status: string;
  rating: number;
  distanceKm: number;
  pricePerHr: number;
};

type RecentRow = {
  id: string;
  arenaName: string;
  location: string;
  timeLabel: string;
  thumbTime: string;
  score: number;
};

function homeSportToApiEnum(s: 'pickleball' | 'padel' | 'cricket'): string {
  if (s === 'padel') return 'Paddle';
  if (s === 'cricket') return 'Cricket';
  return 'Pickleball';
}

function extractTurfLngLat(geo: unknown): { lat: number; lng: number } | null {
  if (!geo || typeof geo !== 'object') return null;
  const g = geo as { type?: string; coordinates?: number[] };
  if (g.type === 'Point' && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
    const lng = Number(g.coordinates[0]);
    const lat = Number(g.coordinates[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa)));
}

function mapTurfToArena(
  t: TurfRow,
  i: number,
  user: { latitude: number; longitude: number } | null,
): ArenaRow {
  const raw = t.hourly_rate;
  let price = 200;
  if (typeof raw === 'number') price = raw;
  else if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(/[^\d.]/g, ''));
    if (!Number.isNaN(n)) price = n;
  }
  const loc = (t.city ?? t.address_line ?? '').split(',')[0]?.trim() || '—';
  const turfPt = extractTurfLngLat(t.geo_location);
  let distanceKm = 1.2 + (i % 6) * 0.35;
  if (user && turfPt) {
    distanceKm =
      Math.round(haversineKm(user.latitude, user.longitude, turfPt.lat, turfPt.lng) * 10) / 10;
  }
  return {
    id: String(t.id ?? i),
    name: t.name ?? 'Arena',
    location: loc,
    status: 'Indoor • Available Now',
    rating: 4.5,
    distanceKm,
    pricePerHr: price,
  };
}

function mapRecordingToRecent(s: any, idx: number): RecentRow {
  const raw = s?.startTime ?? s?.endTime ?? s?.created_at;
  const d = raw ? new Date(String(raw)) : null;
  const valid = d != null && !Number.isNaN(d.getTime());
  const thumbTime = valid
    ? `${String(d!.getHours()).padStart(2, '0')}:${String(d!.getMinutes()).padStart(2, '0')}`
    : '--:--';
  const timeLabel = valid ? formatRecordingTimeLabel(d!) : '';
  const score = highlightCountFromRecording(s);
  return {
    id: String(s?.id ?? idx),
    arenaName: s?.turf?.name ?? s?.recording_name ?? s?.name ?? 'Session',
    location: s?.turf?.city ?? s?.turf?.address_line ?? s?.turf?.location ?? '',
    timeLabel,
    thumbTime,
    score,
  };
}

/** Mirrors `web/src/screens/HomeScreen.tsx` — header, hero, sport tiles, arenas,
 *  recent sessions, auto-highlight banner, plus fixed bottom nav. */
export default function FieldflixHomeScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const sportsPad = 20;
  const sportsGap = 8;
  const sportBoxSize = Math.min(
    120,
    Math.max(88, Math.floor((windowWidth - sportsPad * 2 - sportsGap * 2) / 3)),
  );
  const sportIconMain = Math.min(48, Math.round(sportBoxSize * 0.4));
  const sportIconCricketW = Math.min(68, Math.round(sportBoxSize * 0.55));
  const sportIconCricketH = Math.min(60, Math.round(sportBoxSize * 0.5));

  const router = useRouter();
  const [sport, setSport] = useState<'pickleball' | 'padel' | 'cricket'>('pickleball');
  const [turfs, setTurfs] = useState<TurfRow[]>([]);
  const [sessions, setSessions] = useState<unknown[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState('Locating…');
  const [turfsLoading, setTurfsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status: existing } = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        let status = existing;
        if (status === 'undetermined') {
          const r = await Location.requestForegroundPermissionsAsync();
          status = r.status;
        }
        if (cancelled) return;
        if (status !== 'granted') {
          setLocationLabel('Location access denied');
          setUserCoords(null);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;
        setUserCoords({ latitude, longitude });
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (cancelled) return;
        const p = places[0];
        if (p) {
          const city = p.city || p.subregion || p.district || '';
          const country = p.country || '';
          const line = [city, country].filter(Boolean).join(', ');
          setLocationLabel(line || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        } else {
          setLocationLabel(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        }
      } catch {
        if (!cancelled) {
          setLocationLabel('Location unavailable');
          setUserCoords(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setTurfsLoading(true);
    try {
      const sportEnum = homeSportToApiEnum(sport);
      const [turfRes, recRes, n] = await Promise.all([
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
        getNotificationCount(),
      ]);
      const items = Array.isArray(turfRes)
        ? turfRes
        : turfRes?.items && Array.isArray(turfRes.items)
          ? turfRes.items
          : [];
      setTurfs(items as TurfRow[]);
      setSessions(Array.isArray(recRes) ? recRes.slice(0, 6) : []);
      setNotifCount(typeof n === 'number' ? n : 0);
    } catch {
      setTurfs([]);
      setSessions([]);
    } finally {
      setTurfsLoading(false);
    }
  }, [sport, userCoords]);

  useEffect(() => {
    void load();
  }, [load]);

  const arenaRows: ArenaRow[] = useMemo(
    () => turfs.map((t, i) => mapTurfToArena(t, i, userCoords)),
    [turfs, userCoords],
  );

  const recentRows: RecentRow[] = useMemo(
    () => (sessions as any[]).map(mapRecordingToRecent),
    [sessions],
  );

  const navReserve = 96;

  return (
    <WebShell backgroundColor={WEB.homeBg}>
      <View style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: navReserve + 24 }}
          showsVerticalScrollIndicator={false}
        >
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
              <Pressable
                onPress={() => router.push(Paths.notifications)}
                style={styles.iconBtn}
                hitSlop={8}
              >
                <Image source={NOTIF} style={{ width: 24, height: 24 }} />
                {notifCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable onPress={() => router.push(Paths.profile)} style={styles.iconBtn} hitSlop={8}>
                <Image source={PROFILE} style={{ width: 24, height: 24 }} />
              </Pressable>
            </View>
          </View>

          <View style={styles.heroWrap}>
            <View style={styles.heroCard}>
              <ExpoImage
                source={BG.homeHero}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                contentPosition={{ top: '22%', left: '50%' }}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.95)']}
                locations={[0, 0.45, 1]}
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
                <Text style={styles.heroKicker}>Elevate Your</Text>
                <Text style={styles.heroTitle}>Game Today</Text>
                <Text style={styles.heroDesc}>
                  Capture your best moments and track your improvement over time
                </Text>
              </View>
              <View style={styles.heroCtaWrap}>
                <Pressable onPress={() => router.push(Paths.scan)} style={styles.ctaPill}>
                  <Image source={CAM_BTN} style={styles.ctaCam} />
                  <View style={styles.ctaTextCol}>
                    <Text style={styles.ctaTitle}>Start Recording</Text>
                    <Text style={styles.ctaSub}>Tap to capture your game</Text>
                  </View>
                  <View style={styles.ctaChevron}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M9 5l7 7-7 7"
                        stroke="#0f172a"
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
            <View style={[styles.sportsRow, { paddingHorizontal: sportsPad, gap: sportsGap }]}>
              <SportCard
                size={sportBoxSize}
                label="Pickleball"
                selected={sport === 'pickleball'}
                onPress={() => setSport('pickleball')}
                icon={<Image source={PICKLE} style={{ width: sportIconMain, height: sportIconMain }} />}
              />
              <SportCard
                size={sportBoxSize}
                label="Padel"
                selected={sport === 'padel'}
                onPress={() => setSport('padel')}
                icon={<Image source={PADEL} style={{ width: sportIconMain, height: sportIconMain }} />}
              />
              <SportCard
                size={sportBoxSize}
                label="Cricket"
                selected={sport === 'cricket'}
                onPress={() => setSport('cricket')}
                comingSoon
                icon={
                  <Image
                    source={COMING}
                    style={{ width: sportIconCricketW, height: sportIconCricketH, resizeMode: 'contain' }}
                  />
                }
              />
            </View>
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
                  No arenas for this sport{userCoords ? ' near you' : ''} yet.
                </Text>
              </View>
            ) : (
              arenaRows.map((arena) => (
                <Pressable
                  key={arena.id}
                  style={({ pressed }) => [
                    styles.arenaCard,
                    pressed && { opacity: 0.88 },
                  ]}
                  onPress={() => router.push(Paths.scan)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open QR scan for ${arena.name}`}
                >
                  <View style={styles.arenaImgWrap}>
                    <Image source={BG.arena} style={styles.arenaImg} />
                  </View>
                  <View style={styles.arenaBody}>
                    <View style={styles.arenaNameWrap}>
                      <Text style={styles.arenaName}>{arena.name}</Text>
                    </View>
                    <View style={styles.arenaMetaRow}>
                      <MaterialCommunityIcons name="map-marker" size={14} color="#94a3b8" />
                      <Text style={styles.arenaMetaText}>{arena.location}</Text>
                    </View>
                    <Text style={styles.arenaStatus}>{arena.status}</Text>
                    <View style={styles.arenaChipRow}>
                      <View style={styles.arenaChip}>
                        <MaterialCommunityIcons name="star" size={12} color="#fbbf24" />
                        <Text style={styles.arenaChipText}>{arena.rating}</Text>
                      </View>
                      <Text style={styles.arenaDot}>•</Text>
                      <Text style={styles.arenaChipText}>{arena.distanceKm} km</Text>
                      <Text style={styles.arenaDot}>•</Text>
                      <Text style={styles.arenaChipText}>₹{arena.pricePerHr}/hr</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          <View style={styles.recentWrap}>
            <View style={styles.recentHead}>
              <View style={styles.recentHeadLeft}>
                <Image source={RECENT_SESSION_ICON} style={{ width: 28, height: 28 }} />
                <Text style={styles.recentTitle}>Recent Sessions</Text>
              </View>
              <Pressable onPress={() => router.push(Paths.sessions)} hitSlop={8}>
                <Text style={styles.recentViewAll}>View all &gt;</Text>
              </Pressable>
            </View>

            <View style={styles.recentList}>
              {recentRows.length === 0 ? (
                <Text style={styles.recentEmpty}>
                  No sessions yet. Start a recording to see your games here.
                </Text>
              ) : (
                recentRows.map((session) => (
                  <View key={session.id} style={styles.recentCard}>
                    <View style={styles.recentThumb}>
                      <ExpoImage
                        source={BG.homeHero}
                        style={StyleSheet.absoluteFillObject}
                        contentFit="cover"
                        contentPosition={{ top: '22%', left: '50%' }}
                      />
                      <View style={styles.recentThumbTag}>
                        <Text style={styles.recentThumbText}>{session.thumbTime}</Text>
                      </View>
                    </View>
                    <View style={styles.recentMeta}>
                      <Text style={styles.recentArena} numberOfLines={1}>
                        {session.arenaName}
                      </Text>
                      <View style={styles.recentRow}>
                        <MaterialCommunityIcons name="map-marker" size={14} color="#22C55E" />
                        <Text style={styles.recentRowText} numberOfLines={1}>
                          {session.location || '—'}
                        </Text>
                      </View>
                      <View style={styles.recentRow}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color="#22C55E" />
                        <Text style={styles.recentRowText} numberOfLines={1}>
                          {session.timeLabel}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.recentScore}>
                      <MaterialCommunityIcons name="trophy" size={16} color="#22C55E" />
                      <Text style={styles.recentScoreText}>{session.score}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={styles.bannerWrap}>
            <Image source={AUTO_H} style={styles.banner} resizeMode="cover" />
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
  comingSoon,
}: {
  size: number;
  label: string;
  selected: boolean;
  onPress: () => void;
  icon: ReactNode;
  comingSoon?: boolean;
}) {
  const selectedActive = selected && !comingSoon;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sportCard,
        { width: size, height: size, borderRadius: Math.max(18, Math.round(size * 0.19)) },
        { backgroundColor: selectedActive ? '#0a1510' : 'rgba(255,255,255,0.06)' },
        selectedActive ? styles.sportCardSelected : undefined,
      ]}
    >
      <View style={styles.sportIconWrap}>{icon}</View>
      <View style={styles.sportLabelRow}>
        <Text style={styles.sportLabel}>{label}</Text>
        <Image source={ACTIVITY} style={{ width: 14, height: 14 }} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: WEB.headerBorder,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: { width: 40, height: 40, resizeMode: 'contain' },
  locationCol: { flex: 1, minWidth: 0 },
  locationKicker: {
    fontFamily: FF.medium,
    fontSize: 12,
    letterSpacing: 0.2,
    color: 'rgba(255,255,255,0.5)',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: FF.bold,
    fontSize: 10,
    color: '#000',
    textAlign: 'center',
  },

  heroWrap: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  heroCard: {
    height: 320,
    width: '100%',
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#071018",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  heroTextBlock: {
    position: "absolute",
    top: 20,
    left: 24,
    right: 24,
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
    position: 'absolute',
    bottom: 24,
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 340,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaCam: {
    width: 48,
    height: 48,
    marginLeft: 2,
    resizeMode: 'contain',
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
    marginTop: 2,
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
    width: '100%',
    marginTop: 24,
    alignItems: 'center',
  },
  sportsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
  },
  sportCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  sportCardSelected: {
    shadowColor: '#22c55e',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
    borderColor: 'rgba(34,197,94,0.5)',
  },
  sportIconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  sportLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  sportLabel: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: WEB.white,
  },

  arenaScroll: {
    marginTop: 28,
  },
  arenaRow: {
    paddingHorizontal: 20,
    gap: 14,
    alignItems: 'flex-start',
  },
  arenaLoading: {
    width: 280,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: 'rgba(255,255,255,0.65)',
  },
  arenaCard: {
    width: 280,
    flexShrink: 0,
    alignItems: 'stretch',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#0B1019',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  /** Fixed size image area — matches web `h-[140px] w-full` inside `w-[280px]` card (no full-bleed stretch). */
  arenaImgWrap: {
    width: 280,
    height: 140,
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  arenaImg: {
    width: 280,
    height: 140,
    resizeMode: 'cover',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  arenaBody: {
    width: '100%',
    maxWidth: 280,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 6,
    alignSelf: 'stretch',
  },
  /** Bounds title width so long names wrap instead of one-line ellipsize/overflow. */
  arenaNameWrap: {
    width: '100%',
    maxWidth: 248,
    alignSelf: 'stretch',
  },
  arenaName: {
    fontFamily: FF.bold,
    fontSize: 16,
    lineHeight: 22,
    color: WEB.white,
    width: '100%',
  },
  arenaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arenaMetaText: {
    fontFamily: FF.regular,
    fontSize: 12,
    color: '#94a3b8',
  },
  arenaStatus: {
    fontFamily: FF.regular,
    fontSize: 12,
    color: '#64748b',
  },
  arenaChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  arenaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  arenaChipText: {
    fontFamily: FF.regular,
    fontSize: 11,
    color: '#64748b',
  },
  arenaDot: {
    fontFamily: FF.regular,
    fontSize: 11,
    color: '#475569',
  },

  recentWrap: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recentHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recentTitle: {
    fontFamily: FF.semiBold,
    fontSize: 17,
    color: WEB.white,
    letterSpacing: -0.2,
  },
  recentViewAll: {
    fontFamily: FF.medium,
    fontSize: 13,
    color: '#22C55E',
  },
  recentList: { gap: 12 },
  recentEmpty: {
    fontFamily: FF.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.55)',
    paddingVertical: 8,
  },
  recentCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0c1218',
  },
  recentThumb: {
    width: 108,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    overflow: 'hidden',
    position: 'relative',
  },
  recentThumbTag: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  recentThumbText: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  recentMeta: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 4 },
  recentArena: {
    fontFamily: FF.bold,
    fontSize: 14,
    color: WEB.white,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentRowText: {
    flex: 1,
    fontFamily: FF.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  recentScore: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(22,101,52,0.5)',
    backgroundColor: 'rgba(20,83,45,0.7)',
  },
  recentScoreText: {
    fontFamily: FF.bold,
    fontSize: 15,
    color: '#22C55E',
    fontVariant: ['tabular-nums'],
  },

  bannerWrap: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  banner: {
    width: '100%',
    height: 120,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});

import { Paths } from '@/data/paths';
import { BASE_URL } from '@/data/constants';
import {
  getFieldflixApiErrorDebug,
  getRecordingById,
  getRecordingHighlights,
  getRecordingPlayback,
  type RecordingHighlightDto,
  type RecordingPlayback,
} from '@/lib/fieldflix-api';
import { useEntitlement } from '@/lib/fieldflix-entitlement';
import {
  FIELD_FLIX_BOTTOM_NAV_SPACE,
  FieldflixBottomNav,
} from '@/screens/fieldflix/BottomNav';
import { BG } from '@/screens/fieldflix/bundledBackgrounds';
import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import {
  formatRecordingListWhen,
  recordingDurationLabel,
  recordingIsReady,
  recordingPlaybackUrl,
  recordingThumbUrl,
  sportLabelFromTurf,
} from '@/utils/recordingDisplay';
import { buildHighlightsAppLink } from '@/utils/highlightsAppLink';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const ACCENT = '#22C55E';
const BG_COLOR = '#020617';
const MUTED = 'rgba(255,255,255,0.62)';

const ALERT_DEBUG_MAX = 3600;

function formatPlaybackBlockedMessage(
  apiDebug: string | null,
  recording: any | null,
  playback: RecordingPlayback | null,
): string {
  const parts: string[] = [];
  if (apiDebug?.trim()) {
    parts.push('— API errors —\n' + apiDebug.trim());
  }
  parts.push(
    '— Last loaded recording fields —\n' +
      [
        `API base: ${BASE_URL}`,
        `status: ${recording?.status ?? 'null'}`,
        `mux_asset_id: ${recording?.mux_asset_id ?? 'null'}`,
        `mux_playback_id: ${recording?.mux_playback_id ?? 'null'}`,
        `mux_media_url: ${recording?.mux_media_url ? 'set' : 'null'}`,
        `mux_public_url: ${recording?.mux_public_url ? 'set' : 'null'}`,
        `GET /playback playback_id: ${playback?.playback_id ?? 'null'}`,
        `GET /playback signed_url: ${playback?.signed_url ? 'set' : 'null'}`,
        `GET /playback signed_token: ${playback?.signed_token ? 'set' : 'null'}`,
      ].join('\n'),
  );
  const full = parts.join('\n\n');
  return full.length > ALERT_DEBUG_MAX
    ? full.slice(0, ALERT_DEBUG_MAX) + '…'
    : full;
}

type Props = {
  /** When set, overrides the route param. Used by the shared-media flow. */
  forcedRecordingId?: string;
  /** When `true`, the screen treats the user as anonymous regardless of plan. */
  forcePreview?: boolean;
};

const LIKED_HIGHLIGHTS_KEY = 'fieldflicks-liked-highlights-v1';

type LikedHighlightCache = {
  recordingId: string;
  highlightId: string;
  title: string;
  thumbnail: string | null;
  savedAt: number;
};

async function readLikedHighlights(): Promise<LikedHighlightCache[]> {
  try {
    const raw = await AsyncStorage.getItem(LIKED_HIGHLIGHTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LikedHighlightCache[];
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

async function pushLikedHighlight(entry: LikedHighlightCache): Promise<void> {
  try {
    const list = await readLikedHighlights();
    const dedup = list.filter(
      (l) => l.highlightId !== entry.highlightId,
    );
    const next = [entry, ...dedup].slice(0, 12);
    await AsyncStorage.setItem(LIKED_HIGHLIGHTS_KEY, JSON.stringify(next));
  } catch {
    // best-effort cache, ignore failures
  }
}

/**
 * The Highlights screen surfaces a single recording with its hero card,
 * a list of READY highlights, and a "My Liked Highlights" footer powered by
 * a small `AsyncStorage` cache.
 *
 * Entitlement is read from `useEntitlement()`. Free users only see the
 * preview pill and lock badges on highlight rows; tapping anywhere that
 * starts full playback routes them to the premium screen.
 */
export default function HighlightsScreen({ forcedRecordingId, forcePreview }: Props = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; previewOnly?: string }>();
  const recordingId = forcedRecordingId ?? (params.id as string | undefined) ?? '';
  const { isPaid: rawIsPaid, plan, refresh } = useEntitlement();
  const isPaid = forcePreview ? false : rawIsPaid;
  const previewOnly = forcePreview || params.previewOnly === '1';

  const [recording, setRecording] = useState<any | null>(null);
  const [playback, setPlayback] = useState<RecordingPlayback | null>(null);
  const [highlights, setHighlights] = useState<RecordingHighlightDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<LikedHighlightCache[]>([]);
  /** Set when any Highlights fetch throws — shown in "can't play" alerts instead of a generic Mux message. */
  const [apiDebug, setApiDebug] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!recordingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const debugLines: string[] = [];
    let rec: any = null;
    let hs: any[] = [];
    let pb: RecordingPlayback | null = null;
    try {
      try {
        rec = await getRecordingById(recordingId);
      } catch (e) {
        debugLines.push(
          `getRecordingById:\n${getFieldflixApiErrorDebug(e)}`,
        );
      }
      try {
        const h = await getRecordingHighlights(recordingId);
        hs = Array.isArray(h) ? h : [];
      } catch (e) {
        debugLines.push(
          `getRecordingHighlights:\n${getFieldflixApiErrorDebug(e)}`,
        );
      }
      try {
        pb = await getRecordingPlayback(recordingId);
      } catch (e) {
        debugLines.push(
          `getRecordingPlayback:\n${getFieldflixApiErrorDebug(e)}`,
        );
      }
      setRecording(rec);
      setHighlights(hs);
      setPlayback(pb);
      setApiDebug(debugLines.length ? debugLines.join('\n\n') : null);
    } catch (e) {
      setRecording(null);
      setHighlights([]);
      setPlayback(null);
      setApiDebug(getFieldflixApiErrorDebug(e));
    } finally {
      setLoading(false);
    }
  }, [recordingId]);

  useEffect(() => {
    void load();
    void readLikedHighlights().then(setLiked);
    void refresh();
  }, [load, refresh]);

  const heroThumb = useMemo(() => {
    if (!recording) return null;
    return (
      recordingThumbUrl(recording, 5) ??
      recordingThumbUrl({ mux_playback_id: playback?.playback_id }, 5) ??
      null
    );
  }, [recording, playback]);

  const heroPlaybackUrl = useMemo(
    () =>
      recordingPlaybackUrl({
        mux_media_url: recording?.mux_media_url ?? null,
        mux_public_url: recording?.mux_public_url ?? null,
        signed_url: playback?.signed_url ?? null,
        mux_playback_id: recording?.mux_playback_id ?? playback?.playback_id ?? null,
      }),
    [recording, playback],
  );

  /** While Mux has not published a stream yet, refetch in case the asset became ready. */
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!recordingId) return;
    if (heroPlaybackUrl) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (String(recording?.status ?? '').toLowerCase() === 'failed') return;
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      void load();
    }, 8000);
    const t = setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 4 * 60 * 1000);
    return () => {
      clearTimeout(t);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [recordingId, heroPlaybackUrl, load, recording?.status]);

  const sportLabel = sportLabelFromTurf(
    Array.isArray(recording?.turf?.sports_supported)
      ? (recording.turf.sports_supported as string[])
      : undefined,
  );
  const requiredSportPlan = useMemo<'cricket' | 'pickleball' | 'padel' | null>(() => {
    const raw = String(sportLabel || '').toLowerCase();
    if (raw.includes('cricket')) return 'cricket';
    if (raw.includes('pickle')) return 'pickleball';
    if (raw.includes('padel') || raw.includes('paddle')) return 'padel';
    return null;
  }, [sportLabel]);
  const hasSportAccess = useMemo(() => {
    if (!isPaid) return false;
    if (!requiredSportPlan) return true;
    if (plan === 'cricket' || plan === 'pickleball' || plan === 'padel') {
      return plan === requiredSportPlan;
    }
    // Legacy paid plans still keep full access.
    return true;
  }, [isPaid, plan, requiredSportPlan]);
  const planLabel =
    requiredSportPlan === 'pickleball'
      ? 'Pickleball'
      : requiredSportPlan === 'cricket'
        ? 'Cricket'
        : requiredSportPlan === 'padel'
          ? 'Padel'
          : null;

  const onWatchHero = useCallback(() => {
    if (!recordingId) return;
    if (!isPaid && !previewOnly) {
      router.push({
        pathname: Paths.profilePremium,
        params: { sport: requiredSportPlan ?? undefined },
      });
      return;
    }
    if (!hasSportAccess && !previewOnly) {
      router.push({
        pathname: Paths.profilePremium,
        params: { sport: requiredSportPlan ?? undefined },
      });
      return;
    }
    if (!heroPlaybackUrl) {
      Alert.alert(
        'No playback URL',
        formatPlaybackBlockedMessage(apiDebug, recording, playback),
      );
      return;
    }
    router.push({
      pathname: Paths.VideoRecording,
      params: {
        source: heroPlaybackUrl,
        filename: recording?.turf?.name ?? 'Recording',
        recordingHighlights: JSON.stringify(highlights),
        recordingId,
        previewMode: !isPaid ? '1' : '0',
      },
    });
  }, [
    recordingId,
    isPaid,
    hasSportAccess,
    previewOnly,
    heroPlaybackUrl,
    recording,
    playback,
    highlights,
    router,
    apiDebug,
  ]);

  const onPreviewHero = useCallback(() => {
    if (!recordingId) return;
    if (!heroPlaybackUrl) {
      Alert.alert(
        'No playback URL (preview)',
        formatPlaybackBlockedMessage(apiDebug, recording, playback),
      );
      return;
    }
    router.push({
      pathname: Paths.VideoRecording,
      params: {
        source: heroPlaybackUrl,
        filename: recording?.turf?.name ?? 'Recording',
        recordingHighlights: JSON.stringify(highlights),
        recordingId,
        previewMode: '1',
      },
    });
  }, [recordingId, heroPlaybackUrl, recording, playback, highlights, router, apiDebug]);

  const onShareHero = useCallback(async () => {
    if (!recordingId) return;
    try {
      const appLink = buildHighlightsAppLink(recordingId);
      await Share.share({
        message: `Watch my highlights on FieldFlicks — open in the app:\n${appLink}`,
      });
    } catch {
      // user dismissed or share failed — silent
    }
  }, [recordingId]);

  const onHighlightPress = useCallback(
    async (h: RecordingHighlightDto) => {
      if (!isPaid || !hasSportAccess) {
        router.push({
          pathname: Paths.profilePremium,
          params: { sport: requiredSportPlan ?? undefined },
        });
        return;
      }
      if (!h.mux_public_playback_url || h.status !== 'ready') return;
      const titleBase = recording?.turf?.name ?? 'Recording';
      void pushLikedHighlight({
        recordingId: recordingId,
        highlightId: h.id,
        title: `${titleBase} highlight`,
        thumbnail: h.thumbnail_url,
        savedAt: Date.now(),
      });
      setLiked(await readLikedHighlights());
      router.push({
        pathname: Paths.VideoRecording,
        params: {
          source: h.mux_public_playback_url,
          filename: `${titleBase} — Highlight`,
          recordingId,
          previewMode: '0',
        },
      });
    },
    [hasSportAccess, isPaid, recording, recordingId, requiredSportPlan, router],
  );

  if (loading) {
    return (
      <WebShell backgroundColor={BG_COLOR}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </WebShell>
    );
  }

  return (
    <WebShell backgroundColor={BG_COLOR}>
      <View style={styles.flex}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={8}
          >
            <BackIcon />
          </Pressable>
          <Text style={styles.headerTitle}>Highlights</Text>
          <Pressable
            accessibilityLabel="Share recording"
            onPress={() => void onShareHero()}
            style={styles.shareBtn}
            hitSlop={8}
          >
            <ShareIcon />
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.main, { paddingBottom: FIELD_FLIX_BOTTOM_NAV_SPACE }]}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO */}
          <View style={styles.hero}>
            <Image
              source={heroThumb ? { uri: heroThumb } : BG.arena}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.95)']}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroBody}>
              <View style={styles.heroTopRow}>
                <View style={styles.statusPill}>
                  <View style={styles.dotLive} />
                  <Text style={styles.statusPillText}>
                    {recordingIsReady({
                      status: recording?.status,
                      mux_playback_id:
                        recording?.mux_playback_id ?? playback?.playback_id ?? null,
                      mux_media_url: recording?.mux_media_url ?? null,
                      mux_public_url: recording?.mux_public_url ?? null,
                    })
                      ? 'Ready'
                      : 'Processing'}
                  </Text>
                </View>
                {!hasSportAccess ? (
                  <View style={styles.previewPill}>
                    <LockIcon size={12} />
                    <Text style={styles.previewPillText}>
                      {isPaid && planLabel ? `${planLabel} plan required` : 'Preview only'}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {recording?.turf?.name ?? 'Recording'}
              </Text>
              <Text style={styles.heroMeta} numberOfLines={1}>
                {sportLabel} · {recordingDurationLabel(recording)}
              </Text>
              <Text style={styles.heroWhen} numberOfLines={1}>
                {formatRecordingListWhen(recording?.startTime)}
              </Text>
              <View style={styles.heroActions}>
                <Pressable style={styles.watchBtn} onPress={onWatchHero}>
                  <LinearGradient
                    colors={[ACCENT, '#16a34a']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <PlayIcon color="#fff" size={16} />
                  <Text style={styles.watchBtnText}>
                    {hasSportAccess ? 'Watch Now' : 'Unlock this sport'}
                  </Text>
                </Pressable>
                {!hasSportAccess ? (
                  <Pressable
                    style={styles.previewBtn}
                    onPress={onPreviewHero}
                    accessibilityLabel="Watch a free preview"
                  >
                    <Text style={styles.previewBtnText}>Preview</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

          {/* SECTION TITLE + VIEW ALL */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Top Highlights</Text>
            <Pressable
              hitSlop={8}
              onPress={() => {
                if (!isPaid) {
                  router.push({
                    pathname: Paths.profilePremium,
                    params: { sport: requiredSportPlan ?? undefined },
                  });
                }
              }}
            >
              <View style={styles.viewAllPill}>
                <Text style={styles.viewAllText}>View All</Text>
              </View>
            </Pressable>
          </View>

          {/* HIGHLIGHTS LIST */}
          <View style={styles.list}>
            {highlights.length === 0 ? (
              <Text style={styles.empty}>
                No highlights yet. Highlights are created from button-press moments and
                will appear here once your video has finished processing.
              </Text>
            ) : null}
            {highlights.map((h, idx) => (
              <HighlightRow
                key={h.id}
                highlight={h}
                index={idx}
                hasSportAccess={hasSportAccess}
                onPress={() => void onHighlightPress(h)}
              />
            ))}
          </View>

          {/* MY LIKED HIGHLIGHTS */}
          {liked.length > 0 ? (
            <View style={styles.likedSection}>
              <Text style={styles.sectionTitle}>My Liked Highlights</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.likedRowContent}
              >
                {liked.map((l) => (
                  <Pressable
                    key={l.highlightId}
                    style={styles.likedCard}
                    onPress={() => {
                      router.push({
                        pathname: Paths.highlights,
                        params: { id: l.recordingId },
                      });
                    }}
                  >
                    <Image
                      source={l.thumbnail ? { uri: l.thumbnail } : BG.arena}
                      style={styles.likedThumb}
                      resizeMode="cover"
                    />
                    <Text style={styles.likedTitle} numberOfLines={2}>
                      {l.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>

        <FieldflixBottomNav active="recordings" />
      </View>
    </WebShell>
  );
}

function HighlightRow({
  highlight,
  index,
  hasSportAccess,
  onPress,
}: {
  highlight: RecordingHighlightDto;
  index: number;
  hasSportAccess: boolean;
  onPress: () => void;
}) {
  const thumb = highlight.thumbnail_url
    ? { uri: highlight.thumbnail_url }
    : BG.arena;
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowThumb}>
        <Image source={thumb} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        {!hasSportAccess ? (
          <View style={styles.rowLockBadge}>
            <LockIcon size={12} />
          </View>
        ) : null}
        <View style={styles.rowDur}>
          <Text style={styles.rowDurText}>
            {highlight.relative_timestamp ?? '0:30'}
          </Text>
        </View>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          Highlight {index + 1}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {highlight.status === 'ready' ? 'Ready to watch' : 'Processing…'}
        </Text>
        <View style={styles.rowStats}>
          <Text style={styles.rowStat}>1.2K views</Text>
          <View style={styles.rowDot} />
          <Text style={styles.rowStat}>89 likes</Text>
        </View>
      </View>
    </Pressable>
  );
}

function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19l-7-7 7-7"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShareIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
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

function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 10V8a6 6 0 0112 0v2M5 10h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FF.bold,
    fontSize: 20,
    lineHeight: 27,
    color: WEB.white,
  },
  main: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 140,
  },
  hero: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0a0f14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  heroBody: {
    position: 'absolute',
    inset: 0 as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.45)',
  },
  dotLive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  statusPillText: {
    fontFamily: FF.semiBold,
    fontSize: 11,
    color: ACCENT,
    letterSpacing: 0.4,
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  previewPillText: {
    fontFamily: FF.semiBold,
    fontSize: 11,
    color: '#fff',
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontFamily: FF.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginTop: 6,
  },
  heroMeta: {
    marginTop: 4,
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  heroWhen: {
    marginTop: 2,
    fontFamily: FF.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.62)',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  watchBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  watchBtnText: {
    fontFamily: FF.bold,
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.2,
  },
  previewBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  previewBtnText: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: '#fff',
  },
  sectionRow: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: FF.bold,
    fontSize: 18,
    color: '#fff',
    letterSpacing: -0.3,
  },
  viewAllPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.45)',
  },
  viewAllText: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: ACCENT,
  },
  list: { marginTop: 14, gap: 12 },
  empty: {
    fontFamily: FF.regular,
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
    textAlign: 'center',
    paddingVertical: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#0c1218',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rowThumb: {
    width: 110,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  rowLockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  rowDur: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  rowDurText: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  rowBody: { flex: 1, minWidth: 0, gap: 4 },
  rowTitle: {
    fontFamily: FF.bold,
    fontSize: 14,
    color: '#fff',
  },
  rowMeta: {
    fontFamily: FF.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },
  rowStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  rowStat: {
    fontFamily: FF.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  rowDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  likedSection: { marginTop: 28, gap: 12 },
  likedRowContent: { gap: 12, paddingRight: 8 },
  likedCard: {
    width: 130,
    gap: 8,
  },
  likedThumb: {
    width: 130,
    height: 78,
    borderRadius: 12,
    backgroundColor: '#0a0f14',
  },
  likedTitle: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: '#fff',
  },
});

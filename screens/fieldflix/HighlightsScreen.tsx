import { BASE_URL, RAZORPAY_KEY_ID } from '@/data/constants';
import { Paths } from '@/data/paths';
import {
  createRecordingPaymentOrder,
  embedToHighlightDto,
  createShareLink,
  getFieldflixApiErrorMessage,
  getFieldflixApiErrorDebug,
  getPublicFlickShorts,
  getRecordingById,
  getRecordingHighlights,
  getRecordingPlayback,
  getSavedRecordingHighlights,
  type PlanOrderResponse,
  type RecordingHighlightDto,
  type RecordingPlayback,
  type SavedRecordingHighlightSummary,
  toggleRecordingHighlightLike,
  toggleRecordingHighlightSave,
  verifyRazorpayPayment,
} from '@/lib/fieldflix-api';
import { buildHighlightsAppLink } from '@/utils/highlightsAppLink';
import { navigateBackOrHome } from '@/utils/navigateBackOrHome';
import {
  persistUnlockedRecordingIds,
  readUnlockedRecordingIds,
} from '@/utils/unlockedRecordingsStorage';
import {
  SPORT_PLAN_BASE_INR,
  sportPricingGstAmount,
  sportPricingTotalAfterGst,
} from '@/utils/sportPlanPricing';
import { useEntitlement } from '@/lib/fieldflix-entitlement';
import { mergeServerUnlockedRecordingIds } from '@/lib/unlockedRecordingSync';
import { appendLocalPaymentHistory } from '@/lib/paymentHistoryLocal';
import { FieldflixBottomNav } from '@/screens/fieldflix/BottomNav';
import { BG } from '@/screens/fieldflix/bundledBackgrounds';
import { FF } from '@/screens/fieldflix/fonts';
import { WEB } from '@/screens/fieldflix/webDesign';
import { WebShell } from '@/screens/fieldflix/WebShell';
import {
  formatRecordingListWhen,
  homeSportPlanFromRecording,
  recordingDurationLabel,
  recordingIsReady,
  recordingPlaybackUrl,
  recordingSportUi,
  recordingThumbUrl,
} from '@/utils/recordingDisplay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
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
import { FieldflixScreenHeader } from './FieldflixScreenHeader';

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

const FLICK_LOCAL_SAVED_KEY = 'fieldflicks-flick-open-saved-v1';

type UiHighlight = RecordingHighlightDto & {
  likes_count?: number;
  viewerLiked?: boolean;
  viewerSaved?: boolean;
  comments_count?: number;
  views_count?: number | null;
};

function isEngagementHighlightId(id: string): boolean {
  return Boolean(id) && !id.startsWith('flick-') && id !== 'main-video';
}

function toUiHighlight(h: RecordingHighlightDto): UiHighlight {
  const v = {
    ...h,
    likes_count: Number(h.likesCount ?? 0),
    viewerLiked: h.viewerLiked ?? false,
    viewerSaved: h.viewerSaved ?? false,
  } as UiHighlight;
  return v;
}

async function readFlickLocalSavedIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FLICK_LOCAL_SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

async function appendFlickLocalSavedId(highlightId: string): Promise<void> {
  try {
    const id = String(highlightId);
    if (!id || !id.startsWith('flick-')) return;
    const prev = await readFlickLocalSavedIds();
    if (prev.includes(id)) return;
    const next = [id, ...prev].slice(0, 200);
    await AsyncStorage.setItem(FLICK_LOCAL_SAVED_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

async function unlockRecording(recordingId: string): Promise<string[]> {
  try {
    const id = String(recordingId);
    if (!id) return [];
    const list = await readUnlockedRecordingIds();
    if (list.includes(id)) return list;
    const next = [id, ...list].slice(0, 120);
    await persistUnlockedRecordingIds(next);
    return next;
  } catch {
    return [];
  }
}

function looksLikeZeroTimestamp(input: string | null | undefined): boolean {
  const v = String(input ?? '').trim().toLowerCase();
  return (
    v === '' ||
    v === '0' ||
    v === '0s' ||
    v === '0:00' ||
    v === '00:00' ||
    v === '00:00:00'
  );
}

function highlightBadgeTimestamp(h: UiHighlight): string {
  if (String(h.id ?? '').startsWith('flick-')) return '15s';
  const raw = String(h.relative_timestamp ?? '').trim();
  if (raw && !looksLikeZeroTimestamp(raw)) return raw;
  const createdAt = h.button_click_timestamp ? new Date(h.button_click_timestamp) : null;
  if (createdAt && !Number.isNaN(createdAt.getTime())) {
    const hh = createdAt.getHours();
    const mm = String(createdAt.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return '15s';
}

/**
 * Highlights: hero recording, READY highlight list (like/save backed by API),
 * and a horizontal carousel of clips you saved (`GET /recording/highlights/saved`).
 */
export default function HighlightsScreen({ forcedRecordingId, forcePreview }: Props = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; previewOnly?: string }>();
  const recordingId = forcedRecordingId ?? (params.id as string | undefined) ?? '';
  const { refresh } = useEntitlement();
  const previewOnly = forcePreview || params.previewOnly === '1';

  const [recording, setRecording] = useState<any | null>(null);
  const [playback, setPlayback] = useState<RecordingPlayback | null>(null);
  const [highlights, setHighlights] = useState<UiHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedHighlights, setSavedHighlights] = useState<
    SavedRecordingHighlightSummary[]
  >([]);
  const [engageBusy, setEngageBusy] = useState<string | null>(null);
  const [unlockedRecordings, setUnlockedRecordings] = useState<string[]>([]);
  /** FlickShort rows use local ids (`flick-…`); bookmark state is mirrored here after open. */
  const [flickLocalSavedIds, setFlickLocalSavedIds] = useState<string[]>([]);
  /** Set when any Highlights fetch throws — shown in "can't play" alerts instead of a generic Mux message. */
  const [apiDebug, setApiDebug] = useState<string | null>(null);
  const [showUnlockSheet, setShowUnlockSheet] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutQuote, setCheckoutQuote] = useState<PlanOrderResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!recordingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const debugLines: string[] = [];
    let rec: any = null;
    let hs: UiHighlight[] = [];
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
        const apiRows = await getRecordingHighlights(recordingId);
        hs = apiRows.map(toUiHighlight);
      } catch (e) {
        debugLines.push(
          `getRecordingHighlights:\n${getFieldflixApiErrorDebug(e)}`,
        );
      }
      if (
        rec &&
        Array.isArray((rec as { recordingHighlights?: unknown }).recordingHighlights)
      ) {
        const embedded = (
          rec as { recordingHighlights: Record<string, unknown>[] }
        ).recordingHighlights
          .map((eh) => embedToHighlightDto(eh))
          .filter((x): x is RecordingHighlightDto => x != null)
          .filter((x) => {
            const st = String(x.status ?? '').toLowerCase();
            return st === 'ready' || st === 'clip_created';
          });
        if (embedded.length > 0) {
          const keyOf = (h: UiHighlight) =>
            [h.playback_id ?? '', h.mux_public_playback_url ?? ''].join('|');
          const seen = new Set(hs.map((h) => keyOf(h)));
          for (const h of embedded) {
            const k = keyOf(h);
            if (seen.has(k)) continue;
            seen.add(k);
            hs.push(toUiHighlight(h));
          }
        }
      }
      try {
        const shorts = await getPublicFlickShorts(undefined);
        const fromShorts = shorts
          .filter((s) => String(s.recordingId) === String(recordingId))
          .map((s): UiHighlight => {
            return {
              id: `flick-${s.id}`,
              /** Feed cards always show flick length (15s), not position in full match. */
              relative_timestamp: '15s',
            button_click_timestamp: s.createdAt,
            playback_id: s.muxPlaybackId ?? null,
            mux_public_playback_url: s.muxPlaybackId
              ? `https://stream.mux.com/${s.muxPlaybackId}.m3u8`
              : null,
            thumbnail_url: s.muxPlaybackId
              ? `https://image.mux.com/${s.muxPlaybackId}/thumbnail.jpg?time=2`
              : null,
            status: 'ready',
            viewerLiked: false,
            viewerSaved: false,
            likes_count: Number(s.likesCount ?? 0),
            comments_count: Array.isArray(s.comments) ? s.comments.length : 0,
            views_count: Number.isFinite(Number(s.viewsCount))
              ? Number(s.viewsCount)
              : null,
          };
          })
          .filter((h) => Boolean(h.playback_id || h.mux_public_playback_url));
        if (fromShorts.length > 0) {
          const keyOf = (h: UiHighlight) =>
            [h.playback_id ?? '', h.mux_public_playback_url ?? ''].join('|');
          const seen = new Set(hs.map((h) => keyOf(h)));
          for (const h of fromShorts) {
            const k = keyOf(h);
            if (seen.has(k)) continue;
            seen.add(k);
            hs.push(h);
          }
        }
      } catch (e) {
        debugLines.push(
          `getPublicFlickShorts:\n${getFieldflixApiErrorDebug(e)}`,
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

  const refreshSavedHighlights = useCallback(async () => {
    try {
      const list = await getSavedRecordingHighlights();
      setSavedHighlights(list);
    } catch {
      setSavedHighlights([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshSavedHighlights();
      void readFlickLocalSavedIds().then(setFlickLocalSavedIds);
    }, [refreshSavedHighlights]),
  );

  useEffect(() => {
    void load();
    void mergeServerUnlockedRecordingIds().then(setUnlockedRecordings);
    void readFlickLocalSavedIds().then(setFlickLocalSavedIds);
    void refresh();
  }, [load, refresh]);

  useEffect(() => {
    if (!showUnlockSheet || !recordingId) {
      setCheckoutQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setQuoteError(null);
    void createRecordingPaymentOrder(recordingId)
      .then((q) => {
        if (!cancelled) setCheckoutQuote(q);
      })
      .catch((e) => {
        if (!cancelled) {
          setCheckoutQuote(null);
          setQuoteError(getFieldflixApiErrorMessage(e, 'Could not load price'));
        }
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showUnlockSheet, recordingId]);

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

  const sportLabel = useMemo(() => {
    if (!recording) return 'Pickleball';
    return recordingSportUi(recording).sportLabel;
  }, [recording]);
  const sportPlan = useMemo<'cricket' | 'pickleball' | 'padel'>(() => {
    if (!recording) return 'pickleball';
    return homeSportPlanFromRecording(recording);
  }, [recording]);
  const basePrice = SPORT_PLAN_BASE_INR[sportPlan];
  const totalAmount = sportPricingTotalAfterGst(sportPlan);
  const gstAmount = sportPricingGstAmount(sportPlan);
  const isFreeSportUnlock = totalAmount === 0;
  /** Per-recording purchases only (`RECORDING_ACCESS`); sport-wide MEDIA plans do not unlock other videos. */
  const hasRecordingAccess = unlockedRecordings.includes(recordingId);
  const displayTotal =
    checkoutQuote != null ? Number(checkoutQuote.amount) : totalAmount;
  const displayBase =
    checkoutQuote != null && checkoutQuote.base_amount != null
      ? Number(checkoutQuote.base_amount)
      : basePrice;
  const displayGst = Math.max(0, displayTotal - displayBase);
  const isQuoteFree =
    checkoutQuote != null
      ? Number(checkoutQuote.amount) <= 0 || checkoutQuote.status === 'completed'
      : isFreeSportUnlock;
  const openUnlockSheet = useCallback(() => {
    setShowUnlockSheet(true);
  }, []);
  const closeUnlockSheet = useCallback(() => {
    if (checkoutBusy) return;
    setShowUnlockSheet(false);
  }, [checkoutBusy]);
  const runCheckout = useCallback(async () => {
    if (checkoutBusy) return;
    const token = await SecureStore.getItemAsync('token');
    if (!token?.trim()) {
      Alert.alert('Sign in required', 'Log in to unlock this recording.');
      return;
    }
    setCheckoutBusy(true);
    try {
      const order = await createRecordingPaymentOrder(recordingId);
      const orderAmount = Number(order.amount);

      if (orderAmount === 0 || order.status === 'completed') {
        const merged = await mergeServerUnlockedRecordingIds();
        setUnlockedRecordings(merged);
        await unlockRecording(recordingId);
        await appendLocalPaymentHistory({
          id: `unlock-${recordingId}-${order.id}`,
          kind: 'recording_unlock',
          recordingId: String(recordingId),
          sport: sportPlan,
          amountInr: 0,
          currency: 'INR',
          status: 'completed',
          createdAtIso: new Date().toISOString(),
          note: `${sportLabel} recording unlock`,
          razorpay_order_id: order.razorpay_order_id,
          server_payment_id: order.id,
        });
        setShowUnlockSheet(false);
        Alert.alert('Unlocked', 'You can watch this recording in full.');
        void refresh();
        return;
      }

      if (!RAZORPAY_KEY_ID) {
        Alert.alert(
          'Payments',
          'Add EXPO_PUBLIC_RAZORPAY_KEY_ID in .env to enable checkout.',
        );
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RazorpayCheckout = require('react-native-razorpay').default as {
        open: (opts: Record<string, unknown>) => Promise<{
          razorpay_payment_id: string;
          razorpay_order_id: string;
        }>;
      };
      const amountPaise = String(Math.round(orderAmount * 100));
      const data = await RazorpayCheckout.open({
        key: RAZORPAY_KEY_ID,
        name: 'FieldFlicks',
        description: `${sportLabel} video unlock`,
        order_id: order.razorpay_order_id,
        currency: order.currency ?? 'INR',
        amount: amountPaise,
        theme: { color: '#22C55E' },
      });
      const verified = await verifyRazorpayPayment({
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        status: 'completed',
      });
      const merged = await mergeServerUnlockedRecordingIds();
      setUnlockedRecordings(merged);
      await unlockRecording(recordingId);
      await appendLocalPaymentHistory({
        id: `paid-${recordingId}-${data.razorpay_order_id}-${Date.now()}`,
        kind: 'recording_unlock',
        recordingId: String(recordingId),
        sport: sportPlan,
        amountInr: orderAmount,
        currency: 'INR',
        status: 'completed',
        createdAtIso: new Date().toISOString(),
        note: `${sportLabel} recording unlock`,
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        server_payment_id: verified.payment_id,
      });
      setShowUnlockSheet(false);
      Alert.alert('Payment successful', 'This recording is now unlocked.');
      void refresh();
    } catch (e) {
      const msg = getFieldflixApiErrorMessage(e, 'Could not complete payment');
      if (!String(msg).toLowerCase().includes('cancel')) {
        Alert.alert('Payment', msg);
      }
    } finally {
      setCheckoutBusy(false);
    }
  }, [checkoutBusy, sportPlan, sportLabel, recordingId, refresh]);

  const onToggleHighlightLike = useCallback(async (highlightId: string) => {
    if (!isEngagementHighlightId(highlightId)) return;
    const token = await SecureStore.getItemAsync('token');
    if (!token?.trim()) {
      Alert.alert('Sign in', 'Log in to like highlights.');
      return;
    }
    setEngageBusy(`like-${highlightId}`);
    try {
      const r = await toggleRecordingHighlightLike(highlightId);
      setHighlights((prev) =>
        prev.map((h) =>
          h.id === highlightId
            ? {
                ...h,
                likes_count: r.likesCount,
                likesCount: r.likesCount,
                viewerLiked: r.liked,
              }
            : h,
        ),
      );
    } catch (e) {
      Alert.alert('Like', getFieldflixApiErrorMessage(e, 'Could not update like'));
    } finally {
      setEngageBusy(null);
    }
  }, []);

  const onToggleHighlightSave = useCallback(
    async (highlightId: string) => {
      if (!isEngagementHighlightId(highlightId)) return;
      const token = await SecureStore.getItemAsync('token');
      if (!token?.trim()) {
        Alert.alert('Sign in', 'Log in to save highlights.');
        return;
      }
      setEngageBusy(`save-${highlightId}`);
      try {
        const r = await toggleRecordingHighlightSave(highlightId);
        setHighlights((prev) =>
          prev.map((h) =>
            h.id === highlightId ? { ...h, viewerSaved: r.saved } : h,
          ),
        );
        void refreshSavedHighlights();
      } catch (e) {
        Alert.alert('Save', getFieldflixApiErrorMessage(e, 'Could not update save'));
      } finally {
        setEngageBusy(null);
      }
    },
    [refreshSavedHighlights],
  );

  const onWatchHero = useCallback(() => {
    if (!recordingId) return;
    if (!hasRecordingAccess && !previewOnly) {
      openUnlockSheet();
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
        previewMode: !hasRecordingAccess ? '1' : '0',
      },
    });
  }, [
    recordingId,
    hasRecordingAccess,
    previewOnly,
    heroPlaybackUrl,
    recording,
    playback,
    highlights,
    router,
    apiDebug,
    openUnlockSheet,
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
      const { shareableLink } = await createShareLink(recordingId);
      await Share.share({
        message: `Watch my game on FieldFlicks: ${shareableLink}`,
        url: shareableLink,
      });
    } catch {
      const appLink = buildHighlightsAppLink(recordingId);
      await Share.share({
        message: `Watch my game on FieldFlicks: ${appLink}`,
      }).catch(() => null);
    }
  }, [recordingId]);

  const onHighlightPress = useCallback(
    async (h: RecordingHighlightDto) => {
      if (!hasRecordingAccess) {
        openUnlockSheet();
        return;
      }
      const st = String(h.status ?? '').toLowerCase();
      if (!h.mux_public_playback_url || (st !== 'ready' && st !== 'clip_created')) {
        return;
      }
      if (String(h.id ?? '').startsWith('flick-')) {
        await appendFlickLocalSavedId(String(h.id));
        setFlickLocalSavedIds((prev) =>
          prev.includes(String(h.id)) ? prev : [String(h.id), ...prev],
        );
      }
      const titleBase = recording?.turf?.name ?? 'Recording';
      router.push({
        pathname: Paths.VideoRecording,
        params: {
          source: h.mux_public_playback_url,
          filename: `${titleBase} — Highlight`,
          recordingHighlights: JSON.stringify(highlights),
          recordingId,
          previewMode: '0',
        },
      });
    },
    [
      hasRecordingAccess,
      recording,
      recordingId,
      highlights,
      router,
      openUnlockSheet,
    ],
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
        <FieldflixScreenHeader
          title="Recording"
          onBack={() => navigateBackOrHome(router)}
          backAccessibilityLabel="Go back"
        />

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.main}
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
              colors={['rgba(2,6,23,0.06)', 'rgba(2,6,23,0.48)', 'rgba(2,6,23,0.96)']}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.heroBody}>
              <View style={styles.heroUpper}>
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

                  {!hasRecordingAccess ? (
                    <View style={styles.previewPill}>
                      <LockIcon size={12} />
                      <Text style={styles.previewPillText}>Preview only</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.heroTextBlock}>
                  <Text style={styles.heroHeadline} numberOfLines={1}>
                    {recording?.turf?.name ?? 'Recording'}
                  </Text>

                  <View style={styles.heroDivider} />

                  <Text style={styles.heroSubline} numberOfLines={1}>
                    {sportLabel} · {recordingDurationLabel(recording)}
                  </Text>

                  <Text style={styles.heroWhen}>
                    {formatRecordingListWhen(recording?.startTime)}
                  </Text>
                </View>
              </View>
            </View>

            <LinearGradient
              pointerEvents="none"
              colors={['rgba(2,6,23,0)', 'rgba(2,6,23,0.88)']}
              locations={[0.2, 1]}
              style={styles.heroBottomFade}
            />

            <View style={styles.heroActionsBar}>
              <View style={styles.heroActions}>
                <Pressable style={styles.watchBtn} onPress={onWatchHero}>
                  <LinearGradient
                    colors={[ACCENT, '#16a34a']}
                    style={StyleSheet.absoluteFill}
                  />
                  <PlayIcon color="#fff" size={16} />
                  <Text style={styles.watchBtnText}>
                    {hasRecordingAccess ? 'Watch Now' : 'Unlock Full Match'}
                  </Text>
                </Pressable>

                {!hasRecordingAccess ? (
                  <Pressable style={styles.previewBtn} onPress={onPreviewHero}>
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
                if (!hasRecordingAccess) openUnlockSheet();
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
                hasAccess={hasRecordingAccess}
                flickSavedLocally={flickLocalSavedIds.includes(String(h.id))}
                engageBusy={engageBusy}
                onPress={() => void onHighlightPress(h)}
                onToggleLike={() => void onToggleHighlightLike(h.id)}
                onToggleSave={() => void onToggleHighlightSave(h.id)}
              />
            ))}
          </View>

          {savedHighlights.length > 0 ? (
            <View style={styles.likedSection}>
              <Text style={styles.sectionTitle}>Saved highlights</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.likedRowContent}
              >
                {savedHighlights.map((l) => (
                  <Pressable
                    key={`${l.recordingId}-${l.highlightId}`}
                    style={styles.likedCard}
                    onPress={() => {
                      router.push({
                        pathname: Paths.highlights,
                        params: { id: l.recordingId },
                      });
                    }}
                  >
                    <Image
                      source={
                        l.thumbnailUrl ? { uri: l.thumbnailUrl } : BG.arena
                      }
                      style={styles.likedThumb}
                      resizeMode="cover"
                    />
                    <Text style={styles.likedTitle} numberOfLines={2}>
                      {l.relativeTimestamp ?? 'Saved clip'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>

        {showUnlockSheet ? (
          <View style={styles.sheetOverlay}>
            <Pressable style={styles.sheetBackdrop} onPress={closeUnlockSheet} />
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Recording + Highlights</Text>
              <View style={styles.sheetPlanRow}>
                <Text style={styles.sheetPlanName}>{sportLabel} video unlock</Text>
                <Text style={styles.sheetPrice}>
                  {quoteLoading
                    ? '…'
                    : quoteError
                      ? '—'
                      : isQuoteFree
                        ? 'Free'
                        : `₹${displayTotal}`}
                </Text>
              </View>
              <Text style={styles.sheetSub}>
                Full playback for this recording only • incl. highlights
              </Text>
              {quoteError ? (
                <Text style={[styles.sheetSub, { color: '#fca5a5', marginTop: 8 }]}>
                  {quoteError}
                </Text>
              ) : null}
              <View style={styles.sheetBill}>
                <View style={styles.sheetBillRow}>
                  <Text style={styles.sheetBillText}>Base amount</Text>
                  <Text style={styles.sheetBillText}>
                    {quoteLoading ? '…' : `₹${displayBase}`}
                  </Text>
                </View>
                <View style={styles.sheetBillRow}>
                  <Text style={styles.sheetBillText}>GST (18%)</Text>
                  <Text style={styles.sheetBillText}>
                    {quoteLoading ? '…' : `₹${displayGst}`}
                  </Text>
                </View>
                <View style={[styles.sheetBillRow, styles.sheetBillTotal]}>
                  <Text style={styles.sheetTotalText}>Total</Text>
                  <Text style={styles.sheetTotalText}>
                    {quoteLoading ? '…' : `₹${displayTotal}`}
                  </Text>
                </View>
              </View>
              <Pressable
                style={[
                  styles.sheetCta,
                  (checkoutBusy || quoteLoading || !!quoteError || !checkoutQuote) && {
                    opacity: 0.65,
                  },
                ]}
                onPress={() => void runCheckout()}
                disabled={checkoutBusy || quoteLoading || !!quoteError || !checkoutQuote}
              >
                <Text style={styles.sheetCtaText}>
                  {checkoutBusy || quoteLoading
                    ? quoteLoading
                      ? 'Updating price…'
                      : 'Processing...'
                    : isQuoteFree
                      ? 'Unlock free'
                      : 'Unlock & Pay'}
                </Text>
              </Pressable>
              <Text style={styles.sheetFoot}>
                {isQuoteFree
                  ? 'No charge — free tier for this venue'
                  : 'Secure payment • Unlocks only this recording'}
              </Text>
            </View>
          </View>
        ) : null}
        <FieldflixBottomNav active="recordings" />
      </View>
    </WebShell>
  );
}

function HighlightRow({
  highlight,
  index,
  hasAccess,
  flickSavedLocally,
  engageBusy,
  onPress,
  onToggleLike,
  onToggleSave,
}: {
  highlight: UiHighlight;
  index: number;
  hasAccess: boolean;
  flickSavedLocally: boolean;
  engageBusy: string | null;
  onPress: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
}) {
  const thumb = highlight.thumbnail_url
    ? { uri: highlight.thumbnail_url }
    : BG.arena;
  const showEngage = hasAccess && isEngagementHighlightId(highlight.id);
  const busyLike = engageBusy === `like-${highlight.id}`;
  const busySave = engageBusy === `save-${highlight.id}`;
  const liked = Boolean(highlight.viewerLiked);
  const saved = Boolean(highlight.viewerSaved) || flickSavedLocally;

  return (
    <View style={styles.row}>
      <Pressable style={styles.rowMain} onPress={onPress}>
        <View style={styles.rowThumb}>
          <Image source={thumb} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          {!hasAccess ? (
            <View style={styles.rowLockBadge}>
              <LockIcon size={12} />
            </View>
          ) : null}
          <View style={styles.rowDur}>
            <Text style={styles.rowDurText}>
              {highlightBadgeTimestamp(highlight)}
            </Text>
          </View>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            Highlight {index + 1}
            {saved ? ' · Saved' : ''}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {['ready', 'clip_created'].includes(
              String(highlight.status ?? '').toLowerCase(),
            )
              ? 'Ready to watch'
              : 'Processing…'}
          </Text>
        </View>
      </Pressable>

      {showEngage ? (
        <View style={styles.rowEngageRail}>
          <Pressable
            hitSlop={10}
            style={styles.rowEngageBtn}
            onPress={onToggleLike}
            disabled={busyLike || busySave}
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Unlike highlight' : 'Like highlight'}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={liked ? '#f43f5e' : '#e2e8f0'}
            />
          </Pressable>
          <Pressable
            hitSlop={10}
            style={styles.rowEngageBtn}
            onPress={onToggleSave}
            disabled={busyLike || busySave}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove saved highlight' : 'Save highlight'}
          >
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={saved ? ACCENT : '#e2e8f0'}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
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
    height: 265,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 8,
  },
  heroBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 86,
    justifyContent: 'flex-start',
  },
  heroUpper: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  heroBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 108,
  },
  heroActionsBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 14,
    paddingTop: 10,
  },
  heroTextBlock: {
    width: '100%',
    maxWidth: 460,
    marginTop: 8,
  },

  heroHeadline: {
    fontFamily: FF.bold,
    fontSize: 14,
    color: '#F8FAFC',
  },

  heroDivider: {
    marginTop: 8,
    width: 200,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(241,245,249,0.6)',
  },

  heroSubline: {
    marginTop: 8,
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: 'rgba(248,250,252,0.96)',
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
    alignItems: 'stretch',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#0c1218',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minWidth: 0,
  },
  rowEngageRail: {
    justifyContent: 'center',
    gap: 6,
    paddingLeft: 2,
    paddingVertical: 4,
  },
  rowEngageBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
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
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 120,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#0b1320',
    borderTopWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    minHeight: '48%',
    zIndex: 1,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.6)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: FF.bold,
    fontSize: 22,
    color: WEB.white,
    marginBottom: 10,
  },
  sheetPlanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetPlanName: {
    fontFamily: FF.semiBold,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 16,
  },
  sheetPrice: {
    fontFamily: FF.bold,
    color: ACCENT,
    fontSize: 34,
  },
  sheetSub: {
    marginTop: 2,
    color: 'rgba(203,213,225,0.82)',
    fontFamily: FF.regular,
    fontSize: 13,
  },
  sheetBill: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(15,23,42,0.7)',
    gap: 8,
  },
  sheetBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetBillText: {
    color: 'rgba(226,232,240,0.88)',
    fontFamily: FF.regular,
    fontSize: 14,
  },
  sheetBillTotal: {
    marginTop: 4,
    borderTopWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
    paddingTop: 8,
  },
  sheetTotalText: {
    color: ACCENT,
    fontFamily: FF.bold,
    fontSize: 17,
  },
  sheetCta: {
    marginTop: 16,
    borderRadius: 16,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ade80',
  },
  sheetCtaText: {
    color: '#03210e',
    fontFamily: FF.bold,
    fontSize: 28,
    lineHeight: 34,
  },
  sheetFoot: {
    marginTop: 10,
    textAlign: 'center',
    color: 'rgba(148,163,184,0.9)',
    fontFamily: FF.semiBold,
    fontSize: 12,
  },
});

import { Paths } from '@/data/paths';
import ErrorBoundary from '@/components/organisms/ErrorBoundary/ErrorBoundary';
import { useSessionsMyRecordings, type SessionRowForUi } from '@/hooks/useSessionsMyRecordings';
import { FF } from '@/screens/fieldflix/fonts';
import {
  FIELD_FLIX_BOTTOM_NAV_SPACE,
  FieldflixBottomNav,
} from '@/screens/fieldflix/BottomNav';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { BG } from '@/screens/fieldflix/bundledBackgrounds';
import {
  SESSIONS_BACK_ARROW,
  SESSIONS_ROW,
  SESSIONS_SPORT_TEMPLATES,
  type SessionRowLocal,
} from '@/screens/fieldflix/sessionsData';
import { WEB } from '@/screens/fieldflix/webDesign';
import {
  formatRecordingListWhen,
  recordingDurationLabel,
  recordingIsReady,
  recordingThumbUrl,
  sportLabelFromTurf,
} from '@/utils/recordingDisplay';
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

/** 21px / 372px — right inset for play + Completed (web `SessionsScreen.tsx`) */
const CARD_PAD_X_PCT = (21 / 372) * 100;

function pickTemplateForSport(sport: string): SessionRowLocal {
  const s = sport.toLowerCase();
  if (s.includes('cricket')) return SESSIONS_SPORT_TEMPLATES.cricket;
  if (s.includes('padel') || s === 'paddle') return SESSIONS_SPORT_TEMPLATES.padel;
  if (s.includes('pickle')) return SESSIONS_ROW[0];
  if (s.includes('badminton')) return SESSIONS_ROW[1];
  if (s.includes('tennis')) return SESSIONS_ROW[2];
  if (s.includes('basketball')) return SESSIONS_ROW[3];
  return SESSIONS_ROW[0];
}

type SessionRowExtended = SessionRowForUi;

function mapRecordingToSessionRow(r: any): SessionRowExtended {
  const sup = r?.turf?.sports_supported;
  const sport = sportLabelFromTurf(
    Array.isArray(sup) ? sup.map((x: unknown) => String(x)) : undefined,
  );
  const t = pickTemplateForSport(sport);
  const when = formatRecordingListWhen(r?.startTime);
  const cityLine = [r?.turf?.city, r?.turf?.state].filter(Boolean).join(', ');
  const area = cityLine || r?.turf?.address_line || r?.turf?.location || '—';
  return {
    id: String(r.id),
    recordingId: String(r.id),
    sport,
    arena: r?.turf?.name ?? 'Arena',
    area,
    when,
    sportIcon: t.sportIcon,
    pinIcon: t.pinIcon,
    clockIcon: t.clockIcon,
    playIcon: t.playIcon,
    thumbUrl: recordingThumbUrl(r),
    duration: recordingDurationLabel(r),
    status: String(r?.status ?? '').toLowerCase(),
    isReady: recordingIsReady(r),
  };
}

/** List layout from `web/src/screens/SessionsScreen.tsx`; rows from `GET /recording/my-recordings`. */
export default function FieldflixSessionsScreen() {
  const router = useRouter();
  const { rows, loading, error, load } = useSessionsMyRecordings(mapRecordingToSessionRow);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ErrorBoundary
      fallback={
        <WebShell backgroundColor={WEB.sessionsBg}>
          <View style={styles.crashWrap}>
            <Text style={styles.crashTitle}>Unable to show sessions</Text>
            <Text style={styles.crashSub}>Go back to home and try again.</Text>
            <Pressable
              style={styles.crashBtn}
              onPress={() => router.push(Paths.home)}
              accessibilityRole="button"
              accessibilityLabel="Back to home"
            >
              <Text style={styles.crashBtnText}>Back to home</Text>
            </Pressable>
          </View>
        </WebShell>
      }
    >
      <WebShell backgroundColor={WEB.sessionsBg}>
        <View style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: FIELD_FLIX_BOTTOM_NAV_SPACE }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pad}>
            <View style={styles.header}>
              <View style={styles.headerStart}>
                <Pressable
                  onPress={() => router.push(Paths.home)}
                  accessibilityLabel="Back to home"
                  style={styles.backBtn}
                >
                  <Image source={SESSIONS_BACK_ARROW} style={{ width: 24, height: 24 }} resizeMode="cover" />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Sessions
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.completedStrip}>
                <Text style={styles.completedText}>Completed Sessions</Text>
              </View>

              {loading ? (
                <View style={styles.loading}>
                  <ActivityIndicator size="large" color={WEB.green} />
                </View>
              ) : error ? (
                <View style={styles.errorWrap}>
                  <Text style={styles.errorText}>{error}</Text>
                  <Pressable
                    onPress={() => void load()}
                    style={styles.retryBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading sessions"
                  >
                    <Text style={styles.retryBtnText}>Try again</Text>
                  </Pressable>
                </View>
              ) : rows.length === 0 ? (
                <Text style={styles.empty}>
                  No completed sessions yet. Finish a recording to see it here.
                </Text>
              ) : (
                <View style={styles.cards} collapsable={false}>
                  {rows.map((row) => {
                    const canOpen = row.isReady;
                    return (
                      <Pressable
                        key={row.id}
                        disabled={!canOpen}
                        style={({ pressed }) => [
                          styles.cardPressable,
                          !canOpen && styles.cardPressableDisabled,
                          canOpen && pressed && styles.cardPressablePressed,
                        ]}
                        onPress={() => {
                          if (!canOpen) return;
                          router.push({
                            pathname: Paths.highlights as never,
                            params: { id: row.recordingId },
                          });
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !canOpen }}
                        accessibilityLabel={
                          canOpen
                            ? `Open ${row.arena} highlights`
                            : `${row.arena} is still processing. Try again when ready.`
                        }
                      >
                        <SessionCard row={row} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <FieldflixBottomNav active="sessions" />
        </View>
      </WebShell>
    </ErrorBoundary>
  );
}

function SessionCard({ row }: { row: SessionRowExtended }) {
  const isProcessing = !row.isReady;
  return (
    <View style={styles.card}>
      <Image
        source={row.thumbUrl ? { uri: row.thumbUrl } : BG.sessionCard}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={styles.cardScrim} />

      <View
        style={[
          styles.frameMain,
          {
            top: '11.52%',
            left: '5.11%',
            width: '66.4%',
            height: '75.76%',
          },
        ]}
      >
        <View style={styles.sportRow}>
          <View style={styles.sportIconBg}>
            <Image source={row.sportIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
          </View>
          <Text style={styles.sportName} numberOfLines={1}>
            {row.sport}
          </Text>
        </View>

        <View style={styles.arenaRow}>
          <Text style={styles.arenaText} numberOfLines={1}>
            {row.arena}
          </Text>
        </View>

        <View style={styles.metaCol}>
          <View style={styles.metaLine}>
            <Image source={row.pinIcon} style={styles.metaIcon} resizeMode="cover" />
            <Text style={styles.metaText} numberOfLines={1}>
              {row.area}
            </Text>
          </View>
          <View style={styles.metaLine}>
            <Image source={row.clockIcon} style={styles.metaIcon} resizeMode="cover" />
            <Text style={styles.metaText} numberOfLines={1}>
              {row.when}
            </Text>
          </View>
        </View>
      </View>

      {row.playIcon ? (
        isProcessing ? (
          <View
            style={[styles.playBtn, { top: '11.52%', right: `${CARD_PAD_X_PCT}%` }]}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <Image source={row.playIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
          </View>
        ) : (
          <Pressable
            style={[styles.playBtn, { top: '11.52%', right: `${CARD_PAD_X_PCT}%` }]}
            accessibilityLabel="Share or play session"
          >
            <Image source={row.playIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
          </Pressable>
        )
      ) : null}

      <View
        style={[
          styles.completedBadge,
          isProcessing && styles.processingBadge,
          {
            bottom: `${(21 / 165) * 100}%`,
            right: `${CARD_PAD_X_PCT}%`,
          },
        ]}
      >
        <Text
          style={[
            styles.completedBadgeText,
            isProcessing && styles.processingBadgeText,
          ]}
        >
          {isProcessing ? 'Processing' : row.duration && row.duration !== '—' ? row.duration : 'Completed'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 200,
  },
  pad: {
    paddingHorizontal: 15,
    paddingBottom: 40,
  },
  header: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  headerStart: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.bold,
    fontSize: 20,
    lineHeight: 27,
    color: WEB.white,
  },
  section: {
    marginTop: 30,
    gap: 20,
  },
  completedStrip: {
    width: '100%',
    borderBottomWidth: 2,
    borderBottomColor: WEB.green,
    paddingBottom: 10,
  },
  completedText: {
    textAlign: 'center',
    fontFamily: FF.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: WEB.white,
  },
  loading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 8,
  },
  errorText: {
    fontFamily: FF.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: WEB.green,
  },
  empty: {
    fontFamily: FF.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  cards: {
    width: '100%',
    alignItems: 'center',
    gap: 30,
  },
  cardPressable: {
    width: '100%',
    maxWidth: 372,
    alignSelf: 'center',
  },
  cardPressableDisabled: {
    opacity: 0.72,
  },
  cardPressablePressed: {
    opacity: 0.92,
  },
  card: {
    position: 'relative',
    height: 165,
    width: '100%',
    maxWidth: 372,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  frameMain: {
    position: 'absolute',
    zIndex: 1,
    gap: 12,
  },
  sportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    height: 42,
  },
  sportIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportName: {
    height: 27,
    fontFamily: FF.semiBold,
    fontSize: 20,
    lineHeight: 27,
    color: WEB.white,
  },
  arenaRow: {
    height: 22,
    width: '100%',
    justifyContent: 'center',
  },
  arenaText: {
    fontFamily: FF.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: WEB.white,
  },
  metaCol: {
    height: 37,
    width: 163,
    maxWidth: '100%',
    gap: 5,
    justifyContent: 'center',
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaIcon: {
    width: 15,
    height: 15,
  },
  metaText: {
    flex: 1,
    fontFamily: FF.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: WEB.muted,
  },
  playBtn: {
    position: 'absolute',
    zIndex: 2,
    width: 45,
    height: 42,
    borderRadius: 20,
    paddingTop: 9,
    paddingRight: 10,
    paddingBottom: 9,
    paddingLeft: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.45)',
  },
  completedBadge: {
    position: 'absolute',
    zIndex: 2,
    height: 29,
    minWidth: 94,
    paddingHorizontal: 12,
    borderRadius: 20,
    paddingVertical: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadgeText: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: WEB.green,
  },
  processingBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.22)',
  },
  processingBadgeText: {
    color: '#facc15',
  },
  crashWrap: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  crashTitle: {
    fontFamily: FF.semiBold,
    fontSize: 20,
    lineHeight: 26,
    color: WEB.white,
  },
  crashSub: {
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  crashBtn: {
    marginTop: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crashBtnText: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: WEB.green,
  },
});

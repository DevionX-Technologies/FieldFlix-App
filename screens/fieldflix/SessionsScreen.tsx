import { Paths } from '@/data/paths';
import ErrorBoundary from '@/components/organisms/ErrorBoundary/ErrorBoundary';
import { useSessionsMyRecordings, type SessionRowForUi } from '@/hooks/useSessionsMyRecordings';
import { FF } from '@/screens/fieldflix/fonts';
import { FieldflixBottomNav } from '@/screens/fieldflix/BottomNav';
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
          contentContainerStyle={styles.scrollContent}
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
                  {rows.map((row) => (
                    <SessionRow
                      key={row.id}
                      row={row}
                      onPress={() => {
                        router.push({
                          pathname: Paths.highlights as never,
                          params: { id: row.recordingId },
                        });
                      }}
                    />
                  ))}
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

/**
 * Row layout (parity with Recordings list) avoids Android layout bugs where nested
 * percentage-sized absolute positioning inside centred flex children collapses to a
 * thin stripe — observed as an empty Sessions page with only a vertical line.
 */
function SessionRow({
  row,
  onPress,
}: {
  row: SessionRowExtended;
  onPress: () => void;
}) {
  const isProcessing = !row.isReady;

  const handlePress = () => {
    if (!row.isReady) return;
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !row.isReady }}
      accessibilityLabel={
        row.isReady
          ? `Open ${row.arena} highlights`
          : `${row.arena} is still processing`
      }
      onPress={handlePress}
      style={({ pressed }) => [
        styles.sessionRowOuter,
        !row.isReady && styles.sessionRowMuted,
        row.isReady && pressed && styles.sessionRowPressed,
      ]}
    >
      <View style={styles.sessionThumbWrap}>
        <Image
          source={row.thumbUrl ? { uri: row.thumbUrl } : BG.sessionCard}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        <View style={styles.sessionThumbScrim} />
        {row.playIcon ? (
          <View style={styles.sessionPlayCircle} pointerEvents="none">
            <Image source={row.playIcon} style={{ width: 22, height: 22 }} resizeMode="contain" />
          </View>
        ) : null}
        <View
          style={[styles.sessionDurPill, isProcessing && styles.sessionDurProcessing]}
          pointerEvents="none"
        >
          <Text
            style={[styles.sessionDurText, isProcessing && styles.sessionDurProcessingText]}
          >
            {isProcessing ? 'Processing' : row.duration && row.duration !== '—' ? row.duration : 'Ready'}
          </Text>
        </View>
      </View>

      <View style={styles.sessionBody}>
        <View style={styles.sessionSportLine}>
          <View style={styles.sportIconBg}>
            <Image source={row.sportIcon} style={{ width: 22, height: 22 }} resizeMode="contain" />
          </View>
          <Text style={styles.sessionSport}>{row.sport}</Text>
        </View>
        <Text style={styles.sessionArena} numberOfLines={2}>
          {row.arena}
        </Text>
        <View style={styles.sessionMetaLine}>
          <Image source={row.pinIcon} style={styles.sessionMetaIco} resizeMode="cover" />
          <Text style={styles.sessionMeta} numberOfLines={1}>
            {row.area}
          </Text>
        </View>
        <View style={styles.sessionMetaLine}>
          <Image source={row.clockIcon} style={styles.sessionMetaIco} resizeMode="cover" />
          <Text style={styles.sessionMeta} numberOfLines={1}>
            {row.when}
          </Text>
        </View>
      </View>
    </Pressable>
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
    width: '100%',
    alignSelf: 'stretch',
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
    alignSelf: 'stretch',
    alignItems: 'stretch',
    gap: 16,
    maxWidth: 420,
  },
  sessionRowOuter: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#0c1218',
    overflow: 'hidden',
  },
  sessionRowMuted: {
    opacity: 0.78,
  },
  sessionRowPressed: {
    opacity: 0.92,
  },
  sessionThumbWrap: {
    width: 120,
    minHeight: 120,
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: '#0f172a',
  },
  sessionThumbScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.35)',
  },
  sessionPlayCircle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -22,
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionDurPill: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.45)',
    maxWidth: '88%',
  },
  sessionDurProcessing: {
    backgroundColor: 'rgba(234, 179, 8, 0.22)',
    borderColor: 'rgba(251,191,36,0.45)',
  },
  sessionDurText: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    lineHeight: 13,
    color: WEB.green,
    fontVariant: ['tabular-nums'],
  },
  sessionDurProcessingText: {
    color: '#facc15',
  },
  sessionBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  sessionSportLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sportIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionSport: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.semiBold,
    fontSize: 17,
    lineHeight: 22,
    color: WEB.white,
  },
  sessionArena: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.95)',
  },
  sessionMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sessionMetaIco: {
    width: 13,
    height: 13,
  },
  sessionMeta: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.semiBold,
    fontSize: 11,
    lineHeight: 15,
    color: WEB.muted,
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

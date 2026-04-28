import { Paths } from '@/data/paths';
import { useSessionsMyRecordings, type SessionRowForUi } from '@/hooks/useSessionsMyRecordings';
import { FF } from '@/screens/fieldflix/fonts';
import { FieldflixBottomNav } from '@/screens/fieldflix/BottomNav';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { BG } from '@/screens/fieldflix/bundledBackgrounds';
import { SESSIONS_BACK_ARROW, SESSIONS_ROW, type SessionRowLocal } from '@/screens/fieldflix/sessionsData';
import { WEB } from '@/screens/fieldflix/webDesign';
import {
  formatRecordingListWhen,
  recordingDurationLabel,
  recordingIsReady,
  recordingThumbUrl,
  sportLabelFromTurf,
} from '@/utils/recordingDisplay';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

/** 21px / 372px — right inset for play + Completed (web `SessionsScreen.tsx`) */
const CARD_PAD_X_PCT = (21 / 372) * 100;
const SHOW_SESSION_LOGS_BUTTON = false;

function pickTemplateForSport(sport: string): SessionRowLocal {
  const s = sport.toLowerCase();
  if (s.includes('badminton')) return SESSIONS_ROW[1];
  if (s.includes('tennis')) return SESSIONS_ROW[2];
  if (s.includes('basketball')) return SESSIONS_ROW[3];
  if (s.includes('cricket')) return SESSIONS_ROW[4] ?? SESSIONS_ROW[0];
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
  const { rows, loading, backendLog, load } = useSessionsMyRecordings(
    mapRecordingToSessionRow,
  );
  const [logModalOpen, setLogModalOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onCopyBackendLog = useCallback(async () => {
    const text =
      backendLog ||
      'No log yet. This fills when the screen loads my-recordings.';
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', 'Session logs were copied to the clipboard.');
    } catch {
      Alert.alert('Copy failed', 'Could not copy to the clipboard.');
    }
  }, [backendLog]);

  return (
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
              {SHOW_SESSION_LOGS_BUTTON ? (
                <Pressable
                  onPress={() => setLogModalOpen(true)}
                  accessibilityLabel="View backend request log for this screen"
                  style={styles.logsBtn}
                >
                  <Text style={styles.logsBtnText}>Logs</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.section}>
              <View style={styles.completedStrip}>
                <Text style={styles.completedText}>Completed Sessions</Text>
              </View>

              {loading ? (
                <View style={styles.loading}>
                  <ActivityIndicator size="large" color={WEB.green} />
                </View>
              ) : rows.length === 0 ? (
                <Text style={styles.empty}>
                  No completed sessions yet. Finish a recording to see it here.
                </Text>
              ) : (
                <View style={styles.cards} collapsable={false}>
                  {rows.map((row) => (
                    <Pressable
                      key={row.id}
                      onPress={() =>
                        router.push({
                          pathname: Paths.highlights,
                          params: { id: row.recordingId },
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${row.arena} highlights`}
                    >
                      <SessionCard row={row} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {SHOW_SESSION_LOGS_BUTTON ? (
          <Modal
            visible={logModalOpen}
            animationType="fade"
            transparent
            onRequestClose={() => setLogModalOpen(false)}
          >
            <View style={styles.logModalRoot}>
              <Pressable
                style={styles.logModalBackdrop}
                onPress={() => setLogModalOpen(false)}
                accessibilityLabel="Close log"
              />
              <View style={styles.logPanel}>
                <View style={styles.logPanelHeader}>
                  <Text style={styles.logPanelTitle} numberOfLines={2}>
                    GET /recording/my-recordings
                  </Text>
                  <View style={styles.logPanelActions}>
                    <Pressable
                      onPress={() => void onCopyBackendLog()}
                      hitSlop={10}
                      accessibilityLabel="Copy session logs to clipboard"
                    >
                      <Text style={styles.logPanelAction}>Copy</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setLogModalOpen(false)}
                      hitSlop={10}
                      accessibilityLabel="Close"
                    >
                      <Text style={styles.logPanelAction}>Close</Text>
                    </Pressable>
                  </View>
                </View>
                <ScrollView
                  style={styles.logScroll}
                  contentContainerStyle={styles.logScrollContent}
                  nestedScrollEnabled
                >
                  <Text selectable style={styles.logBody}>
                    {backendLog || 'No log yet. This fills when the screen loads my-recordings.'}
                  </Text>
                </ScrollView>
              </View>
            </View>
          </Modal>
        ) : null}

        <FieldflixBottomNav active="sessions" />
      </View>
    </WebShell>
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
        <Pressable
          style={[styles.playBtn, { top: '11.52%', right: `${CARD_PAD_X_PCT}%` }]}
          accessibilityLabel="Share or play session"
        >
          <Image source={row.playIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
        </Pressable>
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
    justifyContent: 'space-between',
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
  logsBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  logsBtnText: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: WEB.green,
  },
  logModalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  logModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  logPanel: {
    maxHeight: '88%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    padding: 12,
  },
  logPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  logPanelTitle: {
    flex: 1,
    fontFamily: FF.semiBold,
    fontSize: 15,
    color: WEB.white,
  },
  logPanelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logPanelAction: {
    fontFamily: FF.semiBold,
    fontSize: 15,
    color: WEB.green,
  },
  logScroll: {
    maxHeight: 480,
  },
  logScrollContent: {
    paddingBottom: 8,
  },
  logBody: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.88)',
  },
  section: {
    marginTop: 30,
    gap: 40,
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
  card: {
    position: 'relative',
    height: 165,
    width: '100%',
    maxWidth: 372,
    borderRadius: 20,
    overflow: 'hidden',
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
});

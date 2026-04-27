import { BG } from '@/screens/fieldflix/bundledBackgrounds';
import { createShareLink, getMyRecordings, getSharedWithMe } from '@/lib/fieldflix-api';
import {
  highlightCountFromRecording,
  formatRecordingListWhen,
  recordingDurationLabel,
  recordingIsReady,
  recordingThumbUrl,
} from '@/utils/recordingDisplay';
import { FF } from '@/screens/fieldflix/fonts';
import { FieldflixBottomNav } from '@/screens/fieldflix/BottomNav';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { RECORDINGS_REC_LOCAL } from '@/screens/fieldflix/recordingsAssets';
import { WEB } from '@/screens/fieldflix/webDesign';
import { useRecordingReadyToast } from '@/hooks/useRecordingReadyToast';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Paths } from '@/data/paths';

const REC_BG = '#020617';
const ACCENT = '#22C55E';
const MUTED = '#94a3b8';

type TabId = 'my' | 'shared' | 'find';

function parseClockOnDay(base: Date, clock: string): number | null {
  const t = clock.trim().toLowerCase();
  const m = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  const d = new Date(base);
  d.setHours(h, min, 0, 0);
  return d.getTime();
}

export default function FieldflixRecordingsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('my');
  const [my, setMy] = useState<any[]>([]);
  const [shared, setShared] = useState<any[]>([]);

  const [findLocation, setFindLocation] = useState('');
  const [findGround, setFindGround] = useState('');
  const [findDate, setFindDate] = useState('');
  const [findStart, setFindStart] = useState('');
  const [findEnd, setFindEnd] = useState('');
  const [findPhone, setFindPhone] = useState('');
  const [findMatches, setFindMatches] = useState<any[] | null>(null);

  const onShareRecording = useCallback(async (recordingId: string, title: string) => {
    try {
      const { shareableLink } = await createShareLink(recordingId);
      await Share.share({
        message: `Watch my game on FieldFlicks: ${shareableLink}`,
        url: shareableLink,
        title,
      });
    } catch {
      // user dismissed or share unavailable — silent
    }
  }, []);

  const runFindInMyRecordings = useCallback(() => {
    const locQ = findLocation.trim().toLowerCase();
    const g = findGround.trim().toLowerCase();
    const out = my.filter((r: any) => {
      const turf = r.turf;
      const hay = [turf?.name, turf?.address_line, turf?.city, turf?.location]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (locQ) {
        const parts = locQ.split(/[,\n]+/).map((p) => p.trim()).filter(Boolean);
        const anyPart = parts.some((p) => p.length > 0 && hay.includes(p));
        if (!anyPart && !hay.includes(locQ)) return false;
      }
      if (g && !hay.includes(g)) return false;
      const st = r.startTime ? new Date(String(r.startTime)) : null;
      if (st && findDate.trim()) {
        const fd = Date.parse(findDate);
        if (!Number.isNaN(fd) && st.toDateString() !== new Date(fd).toDateString()) {
          return false;
        }
      }
      if (findStart.trim() && findEnd.trim() && st) {
        const t0 = parseClockOnDay(st, findStart);
        const t1 = parseClockOnDay(st, findEnd);
        if (t0 != null && t1 != null) {
          const t = st.getTime();
          const lo = Math.min(t0, t1);
          const hi = Math.max(t0, t1);
          if (t < lo || t > hi) return false;
        }
      }
      return true;
    });
    setFindMatches(out);
  }, [my, findLocation, findGround, findDate, findStart, findEnd]);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([getMyRecordings(), getSharedWithMe()]);
      setMy(a);
      setShared(b);
    } catch {
      setMy([]);
      setShared([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const myRows =
    my.length > 0
      ? my.map((s: any, i: number) => {
          const h = highlightCountFromRecording(s);
          return {
            id: String(s?.id ?? i),
            recordingId: s?.id ? String(s.id) : null,
            title: s?.turf?.name ?? s?.recording_name ?? s?.name ?? 'Recording',
            location: s?.turf?.city ?? s?.turf?.location ?? s?.location ?? '',
            when: formatRecordingListWhen(s?.startTime),
            duration: recordingDurationLabel(s),
            thumbUrl: recordingThumbUrl(s),
            highlights: h > 0 ? h : null,
            status: String(s?.status ?? '').toLowerCase(),
            isReady: recordingIsReady(s),
            tags: [] as string[],
            moreTags: 0,
          };
        })
      : [];

  const sharedRows =
    shared.length > 0
      ? shared.map((s: any, i: number) => {
          const rec = s?.recording;
          const td = rec?.turf_detail;
          const loc = [td?.city, td?.state].filter(Boolean).join(', ') || td?.address_line || '';
          return {
            id: String(s?.id ?? i),
            recordingId: rec?.id ? String(rec.id) : null,
            shareToken: s?.share_token ?? rec?.share_token ?? null,
            title: td?.name ?? rec?.owner_name ?? `Recording #${i + 1}`,
            highlights: Array.isArray(rec?.recordingHighlights) ? rec.recordingHighlights.length : 0,
            shareWith: s?.shared_with_user_name || '—',
            ownerName: rec?.owner_name ?? '',
            location: loc,
            thumbUrl: recordingThumbUrl(rec),
            duration: recordingDurationLabel(rec),
          };
        })
      : [];

  const { state: readyState, dismiss: dismissReady } = useRecordingReadyToast();

  return (
    <WebShell backgroundColor={REC_BG}>
      <View style={styles.flex}>
        <View style={styles.head}>
          <View style={styles.headLeft}>
            <Pressable
              accessibilityLabel="Back to home"
              onPress={() => router.push(Paths.home)}
              style={styles.logoBtn}
            >
              <Image source={RECORDINGS_REC_LOCAL.headLogo} style={{ width: 24, height: 24 }} resizeMode="cover" />
            </Pressable>
            <Text style={styles.headTitle}>Recordings</Text>
          </View>
          <Pressable accessibilityLabel="Filter">
            <Image source={RECORDINGS_REC_LOCAL.headFilter} style={{ width: 24, height: 24 }} resizeMode="cover" />
          </Pressable>
        </View>

        <View style={styles.segOuter}>
          <View style={styles.segTrack}>
            <SegTab
              active={tab === 'my'}
              onPress={() => setTab('my')}
              iconSource={RECORDINGS_REC_LOCAL.tabMy}
              label="My Recordings"
            />
            <SegTab
              active={tab === 'shared'}
              onPress={() => setTab('shared')}
              iconSource={RECORDINGS_REC_LOCAL.tabShared}
              label="Shared Recordings"
            />
            <SegTab
              active={tab === 'find'}
              onPress={() => setTab('find')}
              iconSource={RECORDINGS_REC_LOCAL.tabFind}
              label="Find Recordings"
            />
          </View>
        </View>

        {readyState.kind !== 'idle' ? (
          <View style={styles.readyToast}>
            <View style={styles.readyToastDot} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.readyToastTitle} numberOfLines={1}>
                {readyState.kind === 'ready'
                  ? 'Your recording is ready'
                  : readyState.kind === 'failed'
                    ? 'Recording failed to process'
                    : 'Processing your recording…'}
              </Text>
              <Text style={styles.readyToastBody} numberOfLines={2}>
                {readyState.kind === 'ready'
                  ? 'Open Highlights to watch the preview and unlock the full match.'
                  : readyState.kind === 'failed'
                    ? 'Something went wrong on our side. Please try again.'
                    : 'Hang tight — we\'ll let you know the moment it\'s ready.'}
              </Text>
            </View>
            {readyState.kind === 'ready' ? (
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
          contentContainerStyle={styles.main}
          showsVerticalScrollIndicator={false}
        >
          {tab === 'my' && (
            <View style={styles.myList}>
              {myRows.length === 0 ? (
                <Text style={styles.emptyList}>
                  No recordings yet. Scan a court QR and start a session to build your library.
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
                        <Text style={styles.myLineAccent}>{row.highlights} Highlights</Text>
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

          {tab === 'shared' && (
            <View style={styles.sharedList}>
              {sharedRows.length === 0 ? (
                <Text style={styles.emptyList}>
                  Nothing shared with you yet. When someone shares a recording, it will show here.
                </Text>
              ) : null}
              {sharedRows.map((card) => (
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
                    colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.94)']}
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
                        <Text style={styles.sharedDurText}>{card.duration}</Text>
                      </View>
                    </View>
                    <View style={styles.sharedMid}>
                      <Text style={styles.sharedTitle} numberOfLines={1}>
                        {card.title}
                      </Text>
                      <Text style={styles.sharedMeta} numberOfLines={2}>
                        {card.location || 'No location available'}
                      </Text>
                    </View>
                    <View style={styles.sharedActions}>
                      <View style={styles.sharedPills}>
                        <View style={styles.sharedPill}>
                          <TrophyIcon color={ACCENT} size={16} />
                          <Text style={styles.sharedPillText}>{card.highlights} Highlights</Text>
                        </View>
                        <View style={styles.sharedPill}>
                          <Text style={styles.sharedPillText} numberOfLines={1}>
                            From: {card.ownerName || '—'}
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
              ))}
            </View>
          )}

          {tab === 'find' && (
            <View style={styles.findWrap}>
              <View style={styles.findHeroOuter}>
                <Image source={RECORDINGS_REC_LOCAL.hero} style={styles.findHeroImg} resizeMode="cover" />
                <View style={styles.findHeroBlobA} />
                <View style={styles.findHeroBlobB} />
                <View style={styles.findHeroInner}>
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
                <View style={styles.findStep}>
                  <View style={styles.findStepDot} />
                  <Text style={styles.findStepText}>Location</Text>
                </View>
                <View style={styles.findStep}>
                  <View style={styles.findStepDot} />
                  <Text style={styles.findStepText}>Schedule</Text>
                </View>
                <View style={[styles.findStep, styles.findStepMuted]}>
                  <View style={[styles.findStepDot, { backgroundColor: MUTED }]} />
                  <Text style={styles.findStepTextMuted}>Verify</Text>
                </View>
              </View>

              <View style={styles.findPanel}>
                <View style={styles.findLabelRow}>
                  <MapPinIcon color={MUTED} size={14} />
                  <Text style={styles.findLabel}>LOCATION</Text>
                </View>
                <TextInput
                  value={findLocation}
                  onChangeText={setFindLocation}
                  style={styles.findInput}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
              </View>

              <View style={styles.findPanel}>
                <View style={styles.findGrid2}>
                  <View style={styles.findGridCol}>
                    <View style={styles.findLabelRow}>
                      <View style={styles.findSmallIcon}>
                        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                          <Circle cx={12} cy={12} r={9} stroke={MUTED} strokeWidth={2} />
                        </Svg>
                      </View>
                      <Text style={styles.findLabel}>GROUND / COURT NO.</Text>
                    </View>
                    <TextInput
                      value={findGround}
                      onChangeText={setFindGround}
                      style={styles.findInput}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                    />
                  </View>
                  <View style={styles.findGridCol}>
                    <View style={styles.findLabelRow}>
                      <CalendarIcon color={MUTED} size={14} />
                      <Text style={styles.findLabel}>DATE</Text>
                    </View>
                    <TextInput
                      value={findDate}
                      onChangeText={setFindDate}
                      style={styles.findInput}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.findPanel}>
                <View style={styles.findGrid2}>
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

              <Pressable style={styles.findCta} onPress={runFindInMyRecordings}>
                <PlayIcon color="#fff" size={18} />
                <Text style={styles.findCtaText}>Find My Game</Text>
              </Pressable>

              {findMatches !== null ? (
                <View style={styles.findResults}>
                  <Text style={styles.findResultsTitle}>
                    {findMatches.length === 0
                      ? 'No matches in your recordings for those details.'
                      : `${findMatches.length} match${findMatches.length === 1 ? '' : 'es'} in your library`}
                  </Text>
                  {findMatches.map((r: any) => {
                    const title = r?.turf?.name ?? r?.name ?? 'Recording';
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
                  (Enter the mobile number of the player who started the recording)
                </Text>
                <View style={styles.phoneRow}>
                  <Text style={styles.phoneCc}>+91</Text>
                  <TextInput
                    value={findPhone}
                    onChangeText={(v) => setFindPhone(v.replace(/\D/g, '').slice(0, 10))}
                    keyboardType="number-pad"
                    placeholder="Enter your mobile..."
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={styles.phoneInput}
                  />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <FieldflixBottomNav active="recordings" />
      </View>
    </WebShell>
  );
}

function SegTab({
  active,
  onPress,
  iconSource,
  label,
}: {
  active: boolean;
  onPress: () => void;
  iconSource: ImageSourcePropType;
  label: string;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.segTab, active && styles.segTabActive]}>
      <Image source={iconSource} style={{ width: 24, height: 24 }} resizeMode="contain" />
      <Text style={[styles.segLabel, active && styles.segLabelActive]} numberOfLines={1}>
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
      <Path d="M12 7v6l3 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
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
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    width: '100%',
  },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  logoBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  headTitle: {
    fontFamily: FF.bold,
    fontSize: 20,
    lineHeight: 27,
    color: WEB.white,
  },
  segOuter: {
    paddingHorizontal: 16,
    marginTop: 20,
    width: '100%',
  },
  segTrack: {
    flexDirection: 'row',
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 5,
    minHeight: 70,
    width: '100%',
    maxWidth: 370,
    alignSelf: 'center',
  },
  segTab: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 4,
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
    textAlign: 'center',
    color: MUTED,
  },
  segLabelActive: {
    color: '#fff',
  },
  main: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 128,
    width: '100%',
  },

  myList: { gap: 20, marginTop: 8 },
  myRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#0c1218',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  thumb: {
    width: 120,
    height: 104,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
  },
  thumbBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: ACCENT,
    zIndex: 10,
  },
  thumbDur: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
  },
  thumbDurText: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  thumbShare: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 10,
  },
  thumbPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  thumbPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myBody: { flex: 1, minWidth: 0, gap: 6 },
  myTitle: {
    fontFamily: FF.bold,
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.14,
    color: '#fff',
  },
  myLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  myLineText: {
    flex: 1,
    fontFamily: FF.regular,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.78)',
  },
  myLineTextMuted: {
    flex: 1,
    fontFamily: FF.regular,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.65)',
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
    color: 'rgba(234,179,8,0.95)',
  },
  readyToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.45)',
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
    color: '#fff',
  },
  readyToastBody: {
    marginTop: 2,
    fontFamily: FF.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
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
    color: '#fff',
  },
  readyToastClose: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyToastCloseText: {
    fontFamily: FF.bold,
    fontSize: 22,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.7)',
  },
  tagRow: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#1e3521',
  },
  tagText: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    color: ACCENT,
  },
  tagMore: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tagMoreText: {
    fontFamily: FF.semiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
  },

  sharedList: { gap: 24, marginTop: 8 },
  sharedCard: {
    position: 'relative',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    height: 200,
    backgroundColor: '#0a0f14',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
  sharedMedia: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  sharedOverlay: {
    position: 'absolute',
    inset: 0 as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingHorizontal: 20,
    paddingBottom: 18,
    justifyContent: 'space-between',
  },
  sharedTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sharedReady: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  sharedReadyText: {
    fontFamily: FF.bold,
    fontSize: 12,
    color: '#171717',
  },
  sharedDur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sharedDurText: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
  },
  sharedMid: {
    justifyContent: 'center',
    paddingVertical: 4,
  },
  sharedTitle: {
    fontFamily: FF.bold,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.36,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  sharedMeta: {
    marginTop: 6,
    fontFamily: FF.medium,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.62)',
  },
  sharedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
  sharedPills: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  sharedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.22)',
    backgroundColor: 'rgba(30, 53, 33, 0.92)',
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
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },

  findWrap: { gap: 18, marginTop: 8 },
  findHeroOuter: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 182,
    width: '100%',
    maxWidth: 370,
    alignSelf: 'center',
    borderRadius: 20,
    backgroundColor: '#05111a',
  },
  findHeroImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  findHeroBlobA: {
    position: 'absolute',
    width: 155,
    height: 135,
    right: -18,
    top: '35%',
    backgroundColor: 'rgba(34,197,94,0.42)',
    borderRadius: 80,
    opacity: 0.65,
    transform: [{ rotate: '-14deg' }],
  },
  findHeroBlobB: {
    position: 'absolute',
    width: 95,
    height: 105,
    right: 32,
    top: '45%',
    backgroundColor: 'rgba(34,197,94,0.28)',
    borderRadius: 60,
    opacity: 0.5,
    transform: [{ rotate: '8deg' }],
  },
  findHeroInner: {
    padding: 20,
    paddingRight: 96,
    zIndex: 2,
  },
  findBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(34,197,94,0.1)',
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
    color: '#fff',
  },
  findEm: {
    fontStyle: 'italic',
    color: ACCENT,
  },
  findSub: {
    marginTop: 10,
    maxWidth: 220,
    fontFamily: FF.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: MUTED,
  },
  findPlayRing: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -43,
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(100,116,139,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    zIndex: 3,
  },
  findPlayCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(15,23,42,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  findSteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    width: '100%',
    maxWidth: 370,
    alignSelf: 'center',
  },
  findStep: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(34,197,94,0.1)',
  },
  findStepMuted: {
    backgroundColor: 'rgba(148,163,184,0.1)',
  },
  findStepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
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
    width: '100%',
    maxWidth: 370,
    alignSelf: 'center',
    borderRadius: 20,
    padding: 20,
    backgroundColor: 'rgba(30,41,59,0.5)',
  },
  findPanelVerify: {
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  findGrid2: {
    flexDirection: 'row',
    gap: 10,
  },
  findGridCol: { flex: 1, minWidth: 0 },
  findLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  findSmallIcon: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  findLabel: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: MUTED,
  },
  findInput: {
    width: '100%',
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.45)',
    backgroundColor: 'rgba(15,23,42,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: '#fff',
  },
  findCta: {
    width: '100%',
    maxWidth: 331,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  findCtaText: {
    fontFamily: FF.bold,
    fontSize: 16,
    lineHeight: 22,
    color: '#fff',
  },
  findResults: {
    width: '100%',
    maxWidth: 331,
    alignSelf: 'center',
    marginTop: 20,
    gap: 10,
  },
  findResultsTitle: {
    fontFamily: FF.semiBold,
    fontSize: 14,
    color: MUTED,
    marginBottom: 4,
  },
  findResultRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  findResultName: {
    fontFamily: FF.semiBold,
    fontSize: 15,
    color: '#fff',
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
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 12,
  },

  findVerifyTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  verifyIconBox: {
    width: 24,
    height: 24,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyTitleText: {
    fontFamily: FF.semiBold,
    fontSize: 16,
    color: '#fff',
  },
  verifyHint: {
    marginTop: 10,
    fontFamily: FF.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
  },
  phoneRow: {
    marginTop: 12,
    height: 49,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(18,25,38,0.95)',
    paddingHorizontal: 12,
  },
  phoneCc: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    color: 'rgba(255,255,255,0.9)',
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: '#fff',
    paddingVertical: 0,
  },
});

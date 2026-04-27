import { Paths } from '@/data/paths';
import { FlickReelCell } from '@/components/fieldflix/FlickReelCell';
import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import { useIsAdminRole } from '@/hooks/useIsAdminRole';
import {
  addAdminByPhone,
  approveFlickShort,
  createFlickShort,
  deleteFlickShort,
  getAdminFlickShorts,
  getAdminMuxReadyRecordings,
  getAdminPhoneList,
  getAllUsers,
  getFieldflixApiErrorMessage,
  getRecordingById,
  removeAdminPhone,
  type AdminMuxReadyRecording,
  type AdminPhoneRow,
  type FlickShortDto,
} from '@/lib/fieldflix-api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type AdminTab = 'overview' | 'studio' | 'queue';

function muxPoster(playbackId: string, timeSec = 1): string {
  const t = Math.max(0, Math.floor(timeSec));
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?width=480&time=${t}`;
}

function groupRecordingsByMonth(
  rows: AdminMuxReadyRecording[],
): { title: string; items: AdminMuxReadyRecording[] }[] {
  const ordered: { title: string; items: AdminMuxReadyRecording[] }[] = [];
  const keyToIndex = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.startTime);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let idx = keyToIndex.get(key);
    if (idx === undefined) {
      idx = ordered.length;
      keyToIndex.set(key, idx);
      ordered.push({
        title: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        items: [],
      });
    }
    ordered[idx].items.push(r);
  }
  return ordered;
}

/** 7s before and after playhead; clamp to [0, duration] and max 15s span. */
function clipWindowAroundPlayhead(
  t: number,
  durationSec: number | null,
): { start: number; end: number } {
  let start = Math.max(0, t - 7);
  let end = t + 7;
  if (durationSec != null && Number.isFinite(durationSec) && durationSec > 0) {
    end = Math.min(durationSec, end);
    start = Math.min(start, Math.max(0, end - 15));
  }
  if (end - start > 15) {
    end = start + 15;
  }
  if (end <= start) {
    end = start + Math.min(14, (durationSec ?? 14) - start);
  }
  return { start: round2(start), end: round2(end) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function AdminClipPreview({
  playbackId,
  onApplyWindow,
}: {
  playbackId: string;
  onApplyWindow: (start: number, end: number) => void;
}) {
  const uri = `https://stream.mux.com/${playbackId}.m3u8`;
  const player = useVideoPlayer(playbackId ? uri : '', (p) => {
    p.muted = true;
    p.loop = true;
    p.timeUpdateEventInterval = 0.25;
  });
  const [playhead, setPlayhead] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const subLoad = player.addListener('sourceLoad', () => {
      const d = player.duration;
      if (Number.isFinite(d) && d > 0) setDuration(d);
    });
    const subTime = player.addListener(
      'timeUpdate',
      (e: { currentTime?: number }) => {
        const ct = e.currentTime ?? player.currentTime ?? 0;
        setPlayhead(ct);
        const d = player.duration;
        if (Number.isFinite(d) && d > 0 && duration == null) setDuration(d);
      },
    );
    return () => {
      subLoad.remove();
      subTime.remove();
    };
  }, [player, playbackId, duration]);

  if (!playbackId) return null;

  return (
    <View style={previewStyles.wrap}>
      <VideoView player={player} style={previewStyles.video} nativeControls />
      <View style={previewStyles.controls}>
        <Text style={previewStyles.playheadTxt}>
          Playhead: {playhead.toFixed(2)}s
          {duration != null && Number.isFinite(duration) ? ` · Duration ${duration.toFixed(0)}s` : ''}
        </Text>
        <Text style={previewStyles.hint}>
          Scrub with the player, then tap below to fill Start / End with ±7 seconds around the current
          time (you can still edit the numbers).
        </Text>
        <Pressable
          onPress={() => {
            const { start, end } = clipWindowAroundPlayhead(playhead, duration);
            onApplyWindow(start, end);
          }}
          style={previewStyles.applyBtn}
        >
          <Text style={previewStyles.applyBtnTxt}>Use ±7s around playhead</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SectionCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useIsAdminRole();
  const previewHeight = Math.min(Math.round(Dimensions.get('window').height * 0.72), 560);

  const [tab, setTab] = useState<AdminTab>('overview');
  const [userCount, setUserCount] = useState<number | null>(null);
  const [shorts, setShorts] = useState<FlickShortDto[]>([]);
  const [pickerRecordings, setPickerRecordings] = useState<AdminMuxReadyRecording[]>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [recordingId, setRecordingId] = useState('');
  const [lockedSport, setLockedSport] = useState<'pickleball' | 'padel' | 'cricket' | null>(null);
  const [selectedPickerId, setSelectedPickerId] = useState<string | null>(null);
  const [muxOk, setMuxOk] = useState<boolean | null>(null);
  const [aspect, setAspect] = useState<'9:16' | '16:9'>('9:16');
  const [title, setTitle] = useState('');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [startSecStr, setStartSecStr] = useState('0');
  const [endSecStr, setEndSecStr] = useState('15');
  const [adminPhones, setAdminPhones] = useState<AdminPhoneRow[]>([]);
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [recordingSportFilter, setRecordingSportFilter] = useState<
    'all' | 'pickleball' | 'padel' | 'cricket'
  >('all');
  const [showAdvancedId, setShowAdvancedId] = useState(false);
  const [advancedIdInput, setAdvancedIdInput] = useState('');
  const [advancedLoadBusy, setAdvancedLoadBusy] = useState(false);
  const [previewShort, setPreviewShort] = useState<FlickShortDto | null>(null);

  const selectedPlaybackId = useMemo(() => {
    const row = pickerRecordings.find((r) => r.id === selectedPickerId);
    return row?.mux_playback_id ?? null;
  }, [pickerRecordings, selectedPickerId]);

  const filteredPicker = useMemo(() => {
    if (recordingSportFilter === 'all') return pickerRecordings;
    return pickerRecordings.filter((r) => r.flick_sport === recordingSportFilter);
  }, [pickerRecordings, recordingSportFilter]);

  const monthGroups = useMemo(() => groupRecordingsByMonth(filteredPicker), [filteredPicker]);

  const pendingShorts = useMemo(() => shorts.filter((s) => !s.approved), [shorts]);
  const liveShorts = useMemo(() => shorts.filter((s) => s.approved), [shorts]);

  const load = useCallback(async () => {
    try {
      const [users, list, phones, muxList] = await Promise.all([
        getAllUsers(),
        getAdminFlickShorts(),
        getAdminPhoneList().catch(() => [] as AdminPhoneRow[]),
        getAdminMuxReadyRecordings().catch((e) => {
          setPickerError(getFieldflixApiErrorMessage(e, 'Could not load recordings'));
          return [] as AdminMuxReadyRecording[];
        }),
      ]);
      setUserCount(Array.isArray(users) ? users.length : 0);
      setShorts(list);
      setAdminPhones(phones);
      setPickerRecordings(
        muxList.map((r) => ({
          ...r,
          flick_sport: r.flick_sport ?? 'pickleball',
          turf_sports_supported: Array.isArray(r.turf_sports_supported)
            ? r.turf_sports_supported
            : [],
        })),
      );
      if (muxList.length) setPickerError(null);
    } catch (e) {
      Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Failed to load admin data'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      router.replace(Paths.home);
      return;
    }
    void load();
  }, [authLoading, isAdmin, load, router]);

  const selectRecordingFromPicker = (r: AdminMuxReadyRecording) => {
    setSelectedPickerId(r.id);
    setRecordingId(r.id);
    setMuxOk(true);
    setLockedSport(r.flick_sport ?? 'pickleball');
    setShowAdvancedId(false);
  };

  const onCreate = async () => {
    const id = recordingId.trim();
    if (!id) {
      Alert.alert('Recording', 'Choose a recording from the Studio tab.');
      return;
    }
    if (!lockedSport) {
      Alert.alert('Recording', 'Select a recording so the sport is set from the venue.');
      return;
    }
    if (muxOk === false) {
      Alert.alert('Recording', 'Pick a stream-ready recording.');
      return;
    }
    const start = Number.parseFloat(String(startSecStr).replace(',', '.'));
    const end = Number.parseFloat(String(endSecStr).replace(',', '.'));
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      Alert.alert('Clip', 'Start and end must be valid numbers (seconds).');
      return;
    }
    if (end <= start) {
      Alert.alert('Clip', 'End time must be greater than start time.');
      return;
    }
    if (end - start > 15 + 1e-6) {
      Alert.alert('Clip', 'FlickShorts can be 15 seconds or less. Reduce the time window.');
      return;
    }
    setSubmitting(true);
    try {
      await createFlickShort({
        recordingId: id,
        sport: lockedSport,
        title: title.trim(),
        topText: topText.trim(),
        bottomText: bottomText.trim(),
        aspect,
        startSec: start,
        endSec: end,
      });
      setTitle('');
      setTopText('');
      setBottomText('');
      setLockedSport(null);
      setSelectedPickerId(null);
      setRecordingId('');
      await load();
      setTab('queue');
      Alert.alert('Created', 'FlickShort saved as pending. Review it in the Queue tab.');
    } catch (e) {
      Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Create failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const onApprove = async (s: FlickShortDto) => {
    try {
      await approveFlickShort(s.id, true);
      await load();
    } catch (e) {
      Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Approve failed'));
    }
  };

  const onReject = (s: FlickShortDto) => {
    Alert.alert('Reject FlickShort', `Remove "${s.title || s.id}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteFlickShort(s.id);
              await load();
            } catch (e) {
              Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Reject failed'));
            }
          })();
        },
      },
    ]);
  };

  const applyAdvancedRecordingId = async () => {
    const id = advancedIdInput.trim();
    if (!id) {
      Alert.alert('Recording', 'Paste a recording UUID');
      return;
    }
    setAdvancedLoadBusy(true);
    setSelectedPickerId(null);
    setRecordingId(id);
    setLockedSport(null);
    setMuxOk(null);
    try {
      const rec = (await getRecordingById(id)) as {
        mux_playback_id?: string | null;
        turf?: { sports_supported?: string[] } | null;
      };
      const ok = !!rec.mux_playback_id;
      setMuxOk(ok);
      const raw = rec.turf?.sports_supported;
      if (Array.isArray(raw) && raw.length) {
        const lower = raw.map((x) => String(x).toLowerCase());
        let sp: 'pickleball' | 'padel' | 'cricket' = 'pickleball';
        if (lower.some((x) => x.includes('paddle'))) sp = 'padel';
        else if (lower.some((x) => x.includes('cricket'))) sp = 'cricket';
        else if (lower.some((x) => x.includes('pickle'))) sp = 'pickleball';
        setLockedSport(sp);
      } else if (ok) {
        setLockedSport('pickleball');
      }
      if (!ok) {
        Alert.alert(
          'Not ready',
          'This recording does not have a Mux playback id yet. Pick one from the list or wait for processing.',
        );
      }
    } catch (e) {
      setMuxOk(false);
      Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Could not load recording'));
    } finally {
      setAdvancedLoadBusy(false);
    }
  };

  const tabLabels: { id: AdminTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'studio', label: 'Studio' },
    { id: 'queue', label: 'Queue' },
  ];

  if (authLoading || (!authLoading && !isAdmin)) {
    return (
      <WebShell backgroundColor={WEB.homeBg}>
        <View style={styles.center}>
          <ActivityIndicator color={WEB.greenBright} />
        </View>
      </WebShell>
    );
  }

  return (
    <WebShell backgroundColor={WEB.homeBg}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="rgba(255,255,255,0.85)" />
        </Pressable>
        <Text style={styles.topTitle}>Admin</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.tabBar}>
        {tabLabels.map(({ id, label }) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={[styles.tabItem, tab === id && styles.tabItemActive]}
          >
            <Text style={[styles.tabTxt, tab === id && styles.tabTxtActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={WEB.greenBright}
          />
        }
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={WEB.greenBright} />
        ) : null}

        {tab === 'overview' ? (
          <>
            <SectionCard
              eyebrow="Dashboard"
              title="Overview"
              subtitle="Quick stats for this workspace."
            >
              <View style={styles.overviewRow}>
                <View style={styles.overviewTile}>
                  <Text style={styles.overviewValue}>
                    {userCount != null ? String(userCount) : '—'}
                  </Text>
                  <Text style={styles.overviewLabel}>Users</Text>
                </View>
                <View style={styles.overviewTile}>
                  <Text style={styles.overviewValue}>{shorts.length}</Text>
                  <Text style={styles.overviewLabel}>FlickShorts</Text>
                </View>
                <View style={styles.overviewTile}>
                  <Text style={styles.overviewValue}>{pickerRecordings.length}</Text>
                  <Text style={styles.overviewLabel}>Mux-ready</Text>
                </View>
              </View>
            </SectionCard>

            <SectionCard
              eyebrow="Access"
              title="Admin phones"
              subtitle="Add or remove admins by mobile (last 10 digits match at login)."
            >
              {adminPhones.map((row) => (
                <View key={row.id} style={styles.rowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>…{row.phoneLast10}</Text>
                    <Text style={styles.rowSub}>Added {new Date(row.createdAt).toLocaleString()}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      Alert.alert('Remove admin', `Remove …${row.phoneLast10}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => {
                            void (async () => {
                              try {
                                await removeAdminPhone(row.phoneLast10);
                                await load();
                              } catch (e) {
                                Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Remove failed'));
                              }
                            })();
                          },
                        },
                      ]);
                    }}
                    style={styles.removePill}
                  >
                    <Text style={styles.removeTxt}>Remove</Text>
                  </Pressable>
                </View>
              ))}
              <Text style={styles.label}>New admin phone</Text>
              <TextInput
                value={newAdminPhone}
                onChangeText={setNewAdminPhone}
                placeholder="e.g. 9198xxxxxxxx or +91…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.input}
                keyboardType="phone-pad"
              />
              <Pressable
                onPress={() => {
                  const raw = newAdminPhone.trim();
                  if (!raw) {
                    Alert.alert('Phone', 'Enter a number');
                    return;
                  }
                  setAddingAdmin(true);
                  void (async () => {
                    try {
                      await addAdminByPhone(raw);
                      setNewAdminPhone('');
                      await load();
                      Alert.alert('Done', 'Admin access granted for that number.');
                    } catch (e) {
                      Alert.alert('Error', getFieldflixApiErrorMessage(e, 'Could not add admin'));
                    } finally {
                      setAddingAdmin(false);
                    }
                  })();
                }}
                style={[styles.btnSecondary, { marginTop: 10, alignSelf: 'flex-start' }]}
                disabled={addingAdmin}
              >
                {addingAdmin ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnSecondaryTxt}>Add admin</Text>
                )}
              </Pressable>
            </SectionCard>
          </>
        ) : null}

        {tab === 'studio' ? (
          <SectionCard
            eyebrow="Content"
            title="Create FlickShort"
            subtitle="Filter by sport, pick a recording, preview, set ±7s from playhead if you like, then publish as pending."
          >
            <Text style={styles.innerSectionLabel}>Filter recordings by sport</Text>
            <View style={styles.filterChips}>
              {(
                [
                  ['all', 'All'],
                  ['pickleball', 'Pickleball'],
                  ['padel', 'Padel'],
                  ['cricket', 'Cricket'],
                ] as const
              ).map(([k, label]) => (
                <Pressable
                  key={k}
                  onPress={() => setRecordingSportFilter(k)}
                  style={[styles.chip, recordingSportFilter === k && styles.chipOn]}
                >
                  <Text
                    style={[styles.chipTxt, recordingSportFilter === k && styles.chipTxtOn]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.innerSectionLabel}>Choose source recording</Text>
            {pickerError ? <Text style={styles.warnText}>{pickerError}</Text> : null}
            {!pickerError && pickerRecordings.length === 0 ? (
              <Text style={styles.p}>No Mux-ready recordings found yet.</Text>
            ) : null}

            {monthGroups.map((group) => (
              <View key={group.title} style={styles.monthBlock}>
                <Text style={styles.monthHeading}>{group.title}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                  {group.items.map((r) => {
                    const selected = selectedPickerId === r.id;
                    const label =
                      r.recording_name?.trim() ||
                      r.turfName?.trim() ||
                      `Recording ${r.id.slice(0, 8)}…`;
                    const st = String(r.status).toLowerCase();
                    return (
                      <Pressable
                        key={r.id}
                        onPress={() => selectRecordingFromPicker(r)}
                        style={[styles.recCard, selected && styles.recCardSelected]}
                      >
                        <Image
                          source={{ uri: muxPoster(r.mux_playback_id) }}
                          style={styles.recThumb}
                          contentFit="cover"
                        />
                        <Text style={styles.recTitle} numberOfLines={2}>
                          {label}
                        </Text>
                        <Text style={styles.recMeta} numberOfLines={1}>
                          {new Date(r.startTime).toLocaleDateString()} · {r.flick_sport}
                        </Text>
                        <View style={[styles.statusPill, st === 'completed' && styles.statusPillOk]}>
                          <Text style={styles.statusPillTxt}>{r.status}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ))}

            <Pressable onPress={() => setShowAdvancedId((v) => !v)} style={styles.linkRow}>
              <MaterialCommunityIcons
                name={showAdvancedId ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={WEB.greenBright}
              />
              <Text style={styles.linkText}>Advanced: set recording by UUID</Text>
            </Pressable>
            {showAdvancedId ? (
              <View style={styles.advancedBox}>
                <TextInput
                  value={advancedIdInput}
                  onChangeText={setAdvancedIdInput}
                  placeholder="Recording UUID"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={styles.input}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => void applyAdvancedRecordingId()}
                  style={styles.btnSecondary}
                  disabled={advancedLoadBusy}
                >
                  {advancedLoadBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnSecondaryTxt}>Load & set sport from turf</Text>
                  )}
                </Pressable>
              </View>
            ) : null}

            {lockedSport ? (
              <View style={styles.lockedSportBox}>
                <Text style={styles.label}>Sport (from venue)</Text>
                <Text style={styles.lockedSportValue}>{lockedSport}</Text>
                <Text style={styles.p}>
                  {
                    "Locked from the selected recording's turf — the server uses the same mapping when saving."
                  }
                </Text>
              </View>
            ) : (
              <Text style={styles.p}>Select a recording to set sport automatically.</Text>
            )}

            {selectedPickerId && selectedPlaybackId ? (
              <>
                <Text style={[styles.innerSectionLabel, { marginTop: 18 }]}>Preview</Text>
                <AdminClipPreview
                  key={selectedPlaybackId}
                  playbackId={selectedPlaybackId}
                  onApplyWindow={(start, end) => {
                    setStartSecStr(String(start));
                    setEndSecStr(String(end));
                  }}
                />
              </>
            ) : null}

            <Text style={[styles.innerSectionLabel, { marginTop: 18 }]}>Format</Text>
            <View style={styles.chips}>
              {(
                [
                  ['9:16', 'Mobile (9:16)'],
                  ['16:9', 'Rectangular (16:9)'],
                ] as const
              ).map(([k, label]) => (
                <Pressable
                  key={k}
                  onPress={() => setAspect(k)}
                  style={[styles.chip, aspect === k && styles.chipOn]}
                >
                  <Text style={[styles.chipTxt, aspect === k && styles.chipTxtOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Clip window (seconds, max 15s)</Text>
            <View style={styles.rowTwo}>
              <View style={styles.halfField}>
                <Text style={styles.miniLabel}>Start</Text>
                <TextInput
                  value={startSecStr}
                  onChangeText={setStartSecStr}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={styles.input}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.miniLabel}>End</Text>
                <TextInput
                  value={endSecStr}
                  onChangeText={setEndSecStr}
                  placeholder="15"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={styles.input}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Text style={[styles.innerSectionLabel, { marginTop: 14 }]}>On-screen copy</Text>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Headline on the Flick"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
            />
            <Text style={styles.label}>Top text{aspect === '9:16' ? ' (overlay)' : ' (top band)'}</Text>
            <TextInput
              value={topText}
              onChangeText={setTopText}
              placeholder="Optional"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={[styles.input, styles.tallInput]}
              multiline
            />
            <Text style={styles.label}>Bottom text{aspect === '9:16' ? ' (overlay)' : ' (bottom band)'}</Text>
            <TextInput
              value={bottomText}
              onChangeText={setBottomText}
              placeholder="Optional"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={[styles.input, styles.tallInput]}
              multiline
            />

            <Pressable
              onPress={onCreate}
              style={[styles.btnPrimary, submitting && { opacity: 0.6 }]}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#04130d" />
              ) : (
                <Text style={styles.btnPrimaryTxt}>Save as pending</Text>
              )}
            </Pressable>
          </SectionCard>
        ) : null}

        {tab === 'queue' ? (
          <SectionCard
            eyebrow="Moderation"
            title="FlickShort queue"
            subtitle="Preview, approve, or reject pending items. Live items are listed for reference."
          >
            <Text style={styles.innerSectionLabel}>Pending ({pendingShorts.length})</Text>
            {pendingShorts.length === 0 ? (
              <Text style={styles.p}>None waiting.</Text>
            ) : (
              pendingShorts.map((s) => (
                <View key={s.id} style={styles.rowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {s.title || s.id}
                    </Text>
                    <Text style={styles.rowSub}>
                      {s.sport} · {s.aspect} ·{' '}
                      {typeof s.startSec === 'number' && typeof s.endSec === 'number'
                        ? `${s.startSec}–${s.endSec}s`
                        : ''}
                    </Text>
                  </View>
                  <View style={styles.queueActions}>
                    <Pressable onPress={() => setPreviewShort(s)} style={styles.viewPill}>
                      <Text style={styles.viewTxt}>View</Text>
                    </Pressable>
                    <Pressable onPress={() => onApprove(s)} style={styles.approvePill}>
                      <Text style={styles.approveTxt}>Approve</Text>
                    </Pressable>
                    <Pressable onPress={() => onReject(s)} style={styles.rejectPill}>
                      <Text style={styles.rejectTxt}>Reject</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}

            <Text style={[styles.innerSectionLabel, { marginTop: 20 }]}>Live ({liveShorts.length})</Text>
            {liveShorts.length === 0 ? (
              <Text style={styles.p}>No published shorts yet.</Text>
            ) : (
              liveShorts.map((s) => (
                <View key={s.id} style={styles.rowCardMuted}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {s.title || s.id}
                    </Text>
                    <Text style={styles.rowSub}>
                      {s.sport} · {s.aspect} · likes {s.likesCount ?? 0}
                    </Text>
                  </View>
                  <Pressable onPress={() => setPreviewShort(s)} style={styles.viewPill}>
                    <Text style={styles.viewTxt}>View</Text>
                  </Pressable>
                </View>
              ))
            )}
          </SectionCard>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={previewShort != null}
        animationType="slide"
        transparent
        onRequestClose={() => setPreviewShort(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPreviewShort(null)} />
          <View style={[styles.modalCard, { height: previewHeight }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {previewShort?.title || 'Preview'}
              </Text>
              <Pressable
                onPress={() => setPreviewShort(null)}
                hitSlop={12}
                style={styles.modalClose}
              >
                <MaterialCommunityIcons name="close" size={28} color="#fff" />
              </Pressable>
            </View>
            {previewShort ? (
              <View style={{ flex: 1 }}>
                <FlickReelCell
                  item={previewShort}
                  height={previewHeight - 52}
                  isActive
                  liked={false}
                  onLike={() => {}}
                  onComment={() => {}}
                />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </WebShell>
  );
}

const previewStyles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#000',
  },
  video: { width: '100%', height: 220 },
  controls: { padding: 12, backgroundColor: 'rgba(0,0,0,0.45)' },
  playheadTxt: { color: '#fff', fontFamily: FF.medium, fontSize: 13 },
  hint: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: FF.regular,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  applyBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WEB.greenBright,
  },
  applyBtnTxt: { color: WEB.greenBright, fontFamily: FF.semiBold, fontSize: 13 },
});

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FF.bold,
    fontSize: 18,
    color: WEB.white,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: WEB.greenBright },
  tabTxt: { fontFamily: FF.medium, fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  tabTxtActive: { color: WEB.greenBright, fontFamily: FF.semiBold },
  scroll: { padding: 16, paddingBottom: 48 },
  sectionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    marginBottom: 16,
  },
  sectionEyebrow: {
    fontFamily: FF.semiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: WEB.greenBright,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: FF.bold,
    fontSize: 20,
    color: WEB.white,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.62)',
    marginBottom: 14,
  },
  overviewRow: { flexDirection: 'row', gap: 10 },
  overviewTile: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  overviewValue: {
    fontFamily: FF.extraBold,
    fontSize: 22,
    color: WEB.greenBright,
  },
  overviewLabel: {
    fontFamily: FF.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
  },
  innerSectionLabel: {
    fontFamily: FF.bold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 10,
    marginTop: 4,
  },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  monthBlock: { marginBottom: 16 },
  monthHeading: {
    fontFamily: FF.semiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 10,
  },
  hScroll: { marginHorizontal: -4 },
  recCard: {
    width: 148,
    marginRight: 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 8,
  },
  recCardSelected: {
    borderColor: WEB.greenBright,
    borderWidth: 2,
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  recThumb: { width: '100%', height: 100, backgroundColor: '#111' },
  recTitle: {
    fontFamily: FF.semiBold,
    fontSize: 12,
    color: '#fff',
    marginTop: 8,
    paddingHorizontal: 8,
    minHeight: 32,
  },
  recMeta: {
    fontFamily: FF.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 8,
    marginTop: 2,
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginLeft: 8,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statusPillOk: { backgroundColor: 'rgba(34,197,94,0.2)' },
  statusPillTxt: { fontFamily: FF.medium, fontSize: 10, color: 'rgba(255,255,255,0.85)' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  linkText: { fontFamily: FF.semiBold, fontSize: 13, color: WEB.greenBright },
  advancedBox: { marginTop: 8, gap: 10 },
  lockedSportBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  lockedSportValue: {
    fontFamily: FF.bold,
    fontSize: 16,
    color: WEB.greenBright,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  p: {
    fontFamily: FF.regular,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  label: { fontFamily: FF.medium, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 10 },
  miniLabel: {
    fontFamily: FF.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 4,
  },
  input: {
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: WEB.white,
    fontFamily: FF.regular,
  },
  tallInput: { minHeight: 64, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chipOn: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: WEB.greenBright },
  chipTxt: { fontFamily: FF.medium, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  chipTxtOn: { color: WEB.greenBright },
  rowTwo: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  halfField: { flex: 1, minWidth: 0 },
  btnSecondary: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnSecondaryTxt: { color: '#fff', fontFamily: FF.semiBold },
  warnText: { marginBottom: 10, color: '#f97316', fontFamily: FF.medium, fontSize: 13 },
  btnPrimary: {
    marginTop: 18,
    backgroundColor: WEB.greenBright,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryTxt: { fontFamily: FF.bold, color: '#04130d', fontSize: 16 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
    gap: 8,
  },
  rowCardMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
    gap: 8,
  },
  rowTitle: { fontFamily: FF.semiBold, color: '#fff', fontSize: 14 },
  rowSub: { fontFamily: FF.regular, color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },
  queueActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  viewPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewTxt: { color: '#fff', fontFamily: FF.semiBold, fontSize: 12 },
  approvePill: {
    backgroundColor: 'rgba(34,197,94,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  approveTxt: { color: WEB.greenBright, fontFamily: FF.semiBold, fontSize: 12 },
  rejectPill: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rejectTxt: { color: '#fb7185', fontFamily: FF.semiBold, fontSize: 12 },
  removePill: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  removeTxt: { color: '#fb7185', fontFamily: FF.semiBold, fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#050A0E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    flex: 1,
    fontFamily: FF.bold,
    color: '#fff',
    fontSize: 16,
    paddingRight: 8,
  },
  modalClose: { padding: 4 },
});

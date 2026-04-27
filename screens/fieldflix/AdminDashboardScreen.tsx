import { Paths } from '@/data/paths';
import { FF } from '@/screens/fieldflix/fonts';
import { WebShell } from '@/screens/fieldflix/WebShell';
import { WEB } from '@/screens/fieldflix/webDesign';
import { useIsAdminRole } from '@/hooks/useIsAdminRole';
import {
  addAdminByPhone,
  approveFlickShort,
  createFlickShort,
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
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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

function AdminRecordingPreview({ playbackId }: { playbackId: string }) {
  const uri = `https://stream.mux.com/${playbackId}.m3u8`;
  const player = useVideoPlayer(playbackId ? uri : '', (p) => {
    p.muted = true;
    p.loop = true;
  });
  if (!playbackId) return null;
  return (
    <View style={previewStyles.wrap}>
      <VideoView player={player} style={previewStyles.video} nativeControls />
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

  const [userCount, setUserCount] = useState<number | null>(null);
  const [shorts, setShorts] = useState<FlickShortDto[]>([]);
  const [pickerRecordings, setPickerRecordings] = useState<AdminMuxReadyRecording[]>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [recordingId, setRecordingId] = useState('');
  const [selectedPickerId, setSelectedPickerId] = useState<string | null>(null);
  const [muxOk, setMuxOk] = useState<boolean | null>(null);
  const [sport, setSport] = useState<'pickleball' | 'padel' | 'cricket'>('pickleball');
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'other'>('all');
  const [showAdvancedId, setShowAdvancedId] = useState(false);
  const [advancedIdInput, setAdvancedIdInput] = useState('');
  const [advancedLoadBusy, setAdvancedLoadBusy] = useState(false);

  const selectedPlaybackId = useMemo(() => {
    const row = pickerRecordings.find((r) => r.id === selectedPickerId);
    return row?.mux_playback_id ?? null;
  }, [pickerRecordings, selectedPickerId]);

  const filteredPicker = useMemo(() => {
    if (statusFilter === 'all') return pickerRecordings;
    if (statusFilter === 'completed') {
      return pickerRecordings.filter((r) => String(r.status).toLowerCase() === 'completed');
    }
    return pickerRecordings.filter((r) => String(r.status).toLowerCase() !== 'completed');
  }, [pickerRecordings, statusFilter]);

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
      setPickerRecordings(muxList);
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
    setShowAdvancedId(false);
  };

  const onCreate = async () => {
    const id = recordingId.trim();
    if (!id) {
      Alert.alert('Recording', 'Choose a recording from the list below.');
      return;
    }
    if (muxOk === false) {
      Alert.alert('Recording', 'Pick a recording that shows as stream-ready (Mux).');
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
        sport,
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
      await load();
      Alert.alert('Created', 'FlickShort saved as pending. Approve it in the queue below.');
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

  const applyAdvancedRecordingId = async () => {
    const id = advancedIdInput.trim();
    if (!id) {
      Alert.alert('Recording', 'Paste a recording UUID');
      return;
    }
    setAdvancedLoadBusy(true);
    setSelectedPickerId(null);
    setRecordingId(id);
    setMuxOk(null);
    try {
      const rec = (await getRecordingById(id)) as {
        mux_playback_id?: string | null;
        turf?: { name?: string } | null;
        recording_name?: string | null;
      };
      const ok = !!rec.mux_playback_id;
      setMuxOk(ok);
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

        <SectionCard
          eyebrow="Dashboard"
          title="Overview"
          subtitle="Quick stats for this workspace."
        >
          <View style={styles.overviewRow}>
            <View style={styles.overviewTile}>
              <Text style={styles.overviewValue}>{userCount != null ? String(userCount) : '—'}</Text>
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

        <SectionCard
          eyebrow="Content"
          title="Create FlickShort"
          subtitle="Pick a finished recording (no URLs). Choose clip timing and copy, then save as pending."
        >
          <Text style={styles.innerSectionLabel}>1 · Choose source recording</Text>
          <View style={styles.filterChips}>
            {(
              [
                ['all', 'All'],
                ['completed', 'Completed'],
                ['other', 'In progress / other'],
              ] as const
            ).map(([k, label]) => (
              <Pressable
                key={k}
                onPress={() => setStatusFilter(k)}
                style={[styles.chip, statusFilter === k && styles.chipOn]}
              >
                <Text style={[styles.chipTxt, statusFilter === k && styles.chipTxtOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>
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
                        {new Date(r.startTime).toLocaleDateString()}
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

          <Pressable
            onPress={() => setShowAdvancedId((v) => !v)}
            style={styles.linkRow}
          >
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
                  <Text style={styles.btnSecondaryTxt}>Use this ID</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {selectedPickerId && selectedPlaybackId ? (
            <>
              <Text style={[styles.innerSectionLabel, { marginTop: 18 }]}>2 · Preview</Text>
              <Text style={styles.p}>
                Muted loop preview. Native controls for scrubbing; clip bounds below still apply on
                publish.
              </Text>
              <AdminRecordingPreview key={selectedPlaybackId} playbackId={selectedPlaybackId} />
            </>
          ) : null}

          <Text style={[styles.innerSectionLabel, { marginTop: 18 }]}>3 · Clip & format</Text>
          <Text style={styles.label}>Sport</Text>
          <View style={styles.chips}>
            {(
              [
                ['pickleball', 'Pickleball'],
                ['padel', 'Padel'],
                ['cricket', 'Cricket'],
              ] as const
            ).map(([k, label]) => (
              <Pressable
                key={k}
                onPress={() => setSport(k)}
                style={[styles.chip, sport === k && styles.chipOn]}
              >
                <Text style={[styles.chipTxt, sport === k && styles.chipTxtOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Format</Text>
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

          <Text style={[styles.innerSectionLabel, { marginTop: 14 }]}>4 · On-screen copy</Text>
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

        <SectionCard
          eyebrow="Moderation"
          title="FlickShort queue"
          subtitle="Pending items must be approved before they appear in the public feed."
        >
          <Text style={styles.innerSectionLabel}>Pending approval ({pendingShorts.length})</Text>
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
                <Pressable onPress={() => onApprove(s)} style={styles.approvePill}>
                  <Text style={styles.approveTxt}>Approve</Text>
                </Pressable>
              </View>
            ))
          )}

          <Text style={[styles.innerSectionLabel, { marginTop: 20 }]}>Live ({liveShorts.length})</Text>
          {liveShorts.length === 0 ? (
            <Text style={styles.p}>No published shorts yet.</Text>
          ) : (
            liveShorts.map((s) => (
              <View key={s.id} style={styles.rowCardMuted}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {s.title || s.id}
                </Text>
                <Text style={styles.rowSub}>
                  {s.sport} · {s.aspect} · likes {s.likesCount ?? 0}
                </Text>
              </View>
            ))
          )}
        </SectionCard>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  rowTitle: { fontFamily: FF.semiBold, color: '#fff', fontSize: 14 },
  rowSub: { fontFamily: FF.regular, color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },
  approvePill: {
    backgroundColor: 'rgba(34,197,94,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  approveTxt: { color: WEB.greenBright, fontFamily: FF.semiBold, fontSize: 12 },
  removePill: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  removeTxt: { color: '#fb7185', fontFamily: FF.semiBold, fontSize: 12 },
});
